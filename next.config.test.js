/** @jest-environment node */
import { readFileSync } from 'node:fs';
import path from 'node:path';

// M = maior operação do backend medida (geração de cronograma / planilha Excel,
// base semeada, backend dev): 31 ms. A produção tem base maior; 50 é o teto
// arredondado de M e o teste fixa a folga sobre 2×M, não o valor medido.
const M_MS = 50;
const PROXY_TIMEOUT_MS = 120_000;
const NEXT_DEFAULT_PROXY_TIMEOUT_MS = 30_000;

// Maior limite de corpo do backend: upload de planilha, 10 MiB de arquivo
// (`fileSize` do multer em `src/utilities/planilhaUpload.js` do backend).
// Literal ancorado: o backend é outro repositório e não está no runner.
const BACKEND_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

const ENV_KEYS = ['API_INTERNAL_URL', 'NEXT_PUBLIC_API_URL', 'NODE_ENV'];

async function carregarConfig(env) {
  const salvo = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
  for (const k of ENV_KEYS) {
    if (k in env && env[k] !== undefined) process.env[k] = env[k];
    else delete process.env[k];
  }
  jest.resetModules();
  try {
    return (await import('./next.config.mjs')).default;
  } finally {
    for (const k of ENV_KEYS) {
      if (salvo[k] === undefined) delete process.env[k];
      else process.env[k] = salvo[k];
    }
  }
}

describe('next.config — headers e flags', () => {
  it('desliga o header X-Powered-By', async () => {
    const config = await carregarConfig({ NODE_ENV: 'development' });
    expect(config.poweredByHeader).toBe(false);
  });

  it('aplica os quatro headers de segurança a todas as rotas', async () => {
    const config = await carregarConfig({ NODE_ENV: 'development' });
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
    const config = await carregarConfig({ NODE_ENV: 'development' });
    const regras = await config.headers();
    const offline = regras.find(r => r.source === '/offline.html');
    expect(offline.headers).toHaveLength(1);
    expect(offline.headers[0].key).toBe('Content-Security-Policy');
    expect(offline.headers[0].value).toMatch(
      /script-src 'self' 'sha256-[^']+'/
    );
  });
});

describe('next.config — rewrites e proxy', () => {
  it('reencaminha /api/:path* para API_INTERNAL_URL', async () => {
    const config = await carregarConfig({
      API_INTERNAL_URL: 'http://x.example:1234',
      NODE_ENV: 'development',
    });
    expect(await config.rewrites()).toEqual([
      {
        source: '/api/:path*',
        destination: 'http://x.example:1234/api/:path*',
      },
    ]);
  });

  it('aceita a variável em produção', async () => {
    const config = await carregarConfig({
      API_INTERNAL_URL: 'http://y.example:4321',
      NODE_ENV: 'production',
    });
    expect((await config.rewrites())[0].destination).toBe(
      'http://y.example:4321/api/:path*'
    );
  });

  it('não duplica a barra quando a origem vem com barra final', async () => {
    const config = await carregarConfig({
      API_INTERNAL_URL: 'http://z.example:1/',
      NODE_ENV: 'development',
    });
    expect((await config.rewrites())[0].destination).toBe(
      'http://z.example:1/api/:path*'
    );
  });

  it('usa http://localhost:3000 em dev sem a variável', async () => {
    const config = await carregarConfig({ NODE_ENV: 'development' });
    expect((await config.rewrites())[0].destination).toBe(
      'http://localhost:3000/api/:path*'
    );
  });

  it.each([
    ['ausente', undefined],
    ['só espaços', '   '],
  ])(
    'lança em produção com a variável %s, citando o nome',
    async (_, valor) => {
      const promessa = carregarConfig({
        NODE_ENV: 'production',
        API_INTERNAL_URL: valor,
      });
      await expect(promessa).rejects.toThrow('API_INTERNAL_URL');
    }
  );

  it('a mensagem de erro não ecoa o valor informado', async () => {
    // Valor só de espaços é o único que provoca o erro com valor presente.
    const erro = await carregarConfig({
      NODE_ENV: 'production',
      API_INTERNAL_URL: '  ',
    }).catch(e => e);
    expect(erro.message).not.toContain('http');
    expect(erro.message).not.toMatch(/ {2}/);
  });

  it('mantém turbopack, agentRules e NEXT_PUBLIC_BUILD_ID', async () => {
    const config = await carregarConfig({ NODE_ENV: 'development' });
    expect(config.turbopack).toEqual({});
    expect(config.agentRules).toBe(false);
    expect(config.env.NEXT_PUBLIC_BUILD_ID).toEqual(expect.any(String));
    expect(config.env.NEXT_PUBLIC_BUILD_ID).not.toBe('');
  });

  it('fixa experimental.proxyTimeout acima de 2×M e do padrão do Next (30 s)', async () => {
    const config = await carregarConfig({ NODE_ENV: 'development' });
    expect(config.experimental.proxyTimeout).toBe(PROXY_TIMEOUT_MS);
    expect(config.experimental.proxyTimeout).toBeGreaterThan(2 * M_MS);
    expect(config.experimental.proxyTimeout).toBeGreaterThan(
      NEXT_DEFAULT_PROXY_TIMEOUT_MS
    );
  });

  it('proxyClientMaxBodySize fica acima do maior limite de upload do backend', async () => {
    const config = await carregarConfig({ NODE_ENV: 'development' });
    expect(config.experimental.proxyClientMaxBodySize).toBeGreaterThan(
      BACKEND_UPLOAD_LIMIT_BYTES
    );
  });

  it('ignora NEXT_PUBLIC_API_URL: ausente ou definida, o config é o mesmo (DEC-003-019)', async () => {
    const sem = await carregarConfig({
      API_INTERNAL_URL: 'http://w.example:1',
      NODE_ENV: 'production',
    });
    const com = await carregarConfig({
      API_INTERNAL_URL: 'http://w.example:1',
      NEXT_PUBLIC_API_URL: 'http://outra.example/api',
      NODE_ENV: 'production',
    });
    expect(await com.rewrites()).toEqual(await sem.rewrites());
    expect(await com.rewrites()).toEqual([
      { source: '/api/:path*', destination: 'http://w.example:1/api/:path*' },
    ]);
  });
});

describe('Dockerfile', () => {
  const linhas = readFileSync(
    path.join(process.cwd(), 'Dockerfile'),
    'utf8'
  ).split('\n');
  const indiceFrom = alias =>
    linhas.findIndex(l => new RegExp(`^FROM .* AS ${alias}\\s*$`).test(l));
  const iBuilder = indiceFrom('builder');
  const iRunner = indiceFrom('runner');
  const builder = linhas.slice(iBuilder, iRunner);
  const runner = linhas.slice(iRunner);

  it('separa os estágios builder e runner', () => {
    expect(iBuilder).toBeGreaterThanOrEqual(0);
    expect(iRunner).toBeGreaterThan(iBuilder);
  });

  it('builder declara ARG API_INTERNAL_URL antes de RUN npm run build', () => {
    const iArg = builder.findIndex(l => /^ARG API_INTERNAL_URL\s*$/.test(l));
    const iBuild = builder.findIndex(l => /^RUN npm run build\s*$/.test(l));
    expect(iArg).toBeGreaterThanOrEqual(0);
    expect(iBuild).toBeGreaterThan(iArg);
  });

  it('runner declara ARG e ENV de API_INTERNAL_URL', () => {
    expect(runner.some(l => /^ARG API_INTERNAL_URL\s*$/.test(l))).toBe(true);
    expect(runner.some(l => /^ENV API_INTERNAL_URL=/.test(l))).toBe(true);
  });
});
