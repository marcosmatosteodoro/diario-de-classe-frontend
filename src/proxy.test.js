/** @jest-environment node */
import { NextRequest } from 'next/server';
import { proxy, config } from './proxy';

const chamar = () => proxy(new NextRequest('http://localhost:3000/login'));

const nonceDe = csp => /'nonce-([^']+)'/.exec(csp)[1];

describe('proxy', () => {
  it("grava a CSP na resposta com 'nonce-<n>'", () => {
    const csp = chamar().headers.get('content-security-policy');
    expect(csp).toMatch(
      /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/
    );
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('gera nonce diferente a cada chamada, com 128 bits de entropia', () => {
    const a = nonceDe(chamar().headers.get('content-security-policy'));
    const b = nonceDe(chamar().headers.get('content-security-policy'));
    expect(a).not.toBe(b);
    expect(Buffer.from(a, 'base64').length).toBe(16);
  });

  describe('ambiente', () => {
    const original = {
      NODE_ENV: process.env.NODE_ENV,
      API: process.env.NEXT_PUBLIC_API_URL,
    };
    const restaurar = (chave, valor) => {
      if (valor === undefined) delete process.env[chave];
      else process.env[chave] = valor;
    };

    afterEach(() => {
      restaurar('NODE_ENV', original.NODE_ENV);
      restaurar('NEXT_PUBLIC_API_URL', original.API);
    });

    const diretiva = (csp, nome) =>
      csp.split('; ').find(d => d.startsWith(`${nome} `));

    it('em production: script-src sem unsafe-eval e connect-src com a origem da API', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_API_URL = 'https://api.exemplo.com/api';
      const csp = chamar().headers.get('content-security-policy');
      const nonce = nonceDe(csp);
      expect(diretiva(csp, 'script-src')).toBe(
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      );
      expect(diretiva(csp, 'connect-src')).toBe(
        "connect-src 'self' https://api.exemplo.com"
      );
    });

    it("em development: script-src termina em 'unsafe-eval'", () => {
      process.env.NODE_ENV = 'development';
      const csp = chamar().headers.get('content-security-policy');
      expect(diretiva(csp, 'script-src')).toMatch(/ 'unsafe-eval'$/);
    });
  });

  it('repassa nonce e CSP à renderização pelos headers da requisição', () => {
    const response = chamar();
    const csp = response.headers.get('content-security-policy');
    const nonce = nonceDe(csp);
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
    expect(
      response.headers.get('x-middleware-request-content-security-policy')
    ).toBe(csp);
  });
});

describe('config.matcher', () => {
  const [{ source, missing }] = config.matcher;
  const casa = caminho => new RegExp(`^${source}$`).test(caminho);

  it.each([
    '/login',
    '/',
    '/alunos/123',
    '/relatorios',
    '/alunos/1.png',
    '/qualquer.png',
    '/sw.jsx',
    '/favicon.icox',
    '/manifest.json/x',
    '/_next/staticx',
    '/_next/imagex',
  ])('cobre o documento %s', caminho => {
    expect(casa(caminho)).toBe(true);
  });

  it.each([
    '/sw.js',
    '/offline.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/icon-maskable.png',
    '/bls.png',
    '/bls-dark.png',
    '/next.svg',
    '/globe.svg',
    '/favicon.ico',
    '/_next/static/chunks/a.js',
    '/_next/image',
  ])('exclui o estático %s', caminho => {
    expect(casa(caminho)).toBe(false);
  });

  it('exclui requisições de prefetch', () => {
    expect(missing).toEqual([
      { type: 'header', key: 'next-router-prefetch' },
      { type: 'header', key: 'purpose', value: 'prefetch' },
    ]);
  });
});
