import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildContentSecurityPolicy } from './contentSecurityPolicy';
import {
  OFFLINE_CONTENT_SECURITY_POLICY,
  OFFLINE_SCRIPT_HASH,
} from './offlineContentSecurityPolicy.mjs';

const PRODUCAO = [
  "default-src 'self'",
  "script-src 'self' 'nonce-abc' 'strict-dynamic'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.exemplo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ');

const diretiva = (csp, nome) =>
  csp.split('; ').find(d => d.startsWith(`${nome} `));

describe('buildContentSecurityPolicy', () => {
  it('monta exatamente as diretivas em produção', () => {
    expect(
      buildContentSecurityPolicy({
        nonce: 'abc',
        isDev: false,
        apiUrl: 'https://api.exemplo.com/api',
      })
    ).toBe(PRODUCAO);
  });

  it("acrescenta 'unsafe-eval' só em dev", () => {
    const dev = buildContentSecurityPolicy({
      nonce: 'abc',
      isDev: true,
      apiUrl: 'https://api.exemplo.com/api',
    });
    expect(diretiva(dev, 'script-src')).toBe(
      "script-src 'self' 'nonce-abc' 'strict-dynamic' 'unsafe-eval'"
    );
    expect(dev.replace(" 'unsafe-eval'", '')).toBe(PRODUCAO);
  });

  it.each([true, false])(
    "nunca põe 'unsafe-inline' em script-src (isDev=%s)",
    isDev => {
      const csp = buildContentSecurityPolicy({ nonce: 'abc', isDev });
      expect(diretiva(csp, 'script-src')).not.toContain('unsafe-inline');
    }
  );

  it.each([
    ['ausente', undefined],
    ['inválida', 'isto não é url'],
    ['vazia', ''],
  ])('connect-src cai no fallback com URL %s', (_, apiUrl) => {
    const csp = buildContentSecurityPolicy({ nonce: 'abc', apiUrl });
    expect(diretiva(csp, 'connect-src')).toBe(
      "connect-src 'self' http://localhost:3000"
    );
    expect(csp).not.toContain('*');
  });

  it('remove o caminho da URL da API', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'abc',
      apiUrl: 'http://api.local:4000/api/v1',
    });
    expect(diretiva(csp, 'connect-src')).toBe(
      "connect-src 'self' http://api.local:4000"
    );
  });
});

describe('CSP de offline.html', () => {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'public', 'offline.html'),
    'utf8'
  );

  it('o hash da política bate com o <script> inline do arquivo', () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const hash = crypto
      .createHash('sha256')
      .update(scripts[0][1], 'utf8')
      .digest('base64');
    expect(OFFLINE_SCRIPT_HASH).toBe(hash);
    expect(OFFLINE_CONTENT_SECURITY_POLICY).toContain(
      `script-src 'self' 'sha256-${hash}'`
    );
  });

  it('mantém frame-ancestors none, sem nonce e sem unsafe-inline em script', () => {
    expect(OFFLINE_CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(OFFLINE_CONTENT_SECURITY_POLICY).not.toContain('nonce-');
    expect(
      diretiva(OFFLINE_CONTENT_SECURITY_POLICY, 'script-src')
    ).not.toContain('unsafe-inline');
  });
});
