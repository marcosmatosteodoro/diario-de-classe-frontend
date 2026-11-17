/** @jest-environment node */
import config from './next.config.mjs';

describe('next.config', () => {
  it('desliga o header X-Powered-By', () => {
    expect(config.poweredByHeader).toBe(false);
  });

  it('aplica os quatro headers de segurança a todas as rotas', async () => {
    const regras = await config.headers();
    const geral = regras.find(r => r.source === '/(.*)');
    expect(geral.headers).toEqual([
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    ]);
  });

  it('serve /offline.html com CSP própria por hash', async () => {
    const regras = await config.headers();
    const offline = regras.find(r => r.source === '/offline.html');
    expect(offline.headers).toHaveLength(1);
    expect(offline.headers[0].key).toBe('Content-Security-Policy');
    expect(offline.headers[0].value).toMatch(
      /script-src 'self' 'sha256-[^']+'/
    );
  });
});
