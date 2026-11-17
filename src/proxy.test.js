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

  it('gera nonce diferente a cada chamada, com 128 bits ou mais', () => {
    const a = nonceDe(chamar().headers.get('content-security-policy'));
    const b = nonceDe(chamar().headers.get('content-security-policy'));
    expect(a).not.toBe(b);
    expect(Buffer.from(a, 'base64').length).toBeGreaterThanOrEqual(16);
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

  it.each(['/login', '/', '/alunos/123', '/relatorios'])(
    'cobre o documento %s',
    caminho => {
      expect(casa(caminho)).toBe(true);
    }
  );

  it.each([
    '/_next/static/chunks/app.js',
    '/_next/image',
    '/favicon.ico',
    '/sw.js',
    '/offline.html',
    '/manifest.json',
    '/icon-192.png',
    '/bls.png',
    '/globe.svg',
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
