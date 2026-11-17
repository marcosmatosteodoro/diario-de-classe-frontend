// Adiciona configuração turbopack vazia para Next.js 16

// Alimenta `NEXT_PUBLIC_BUILD_ID` — mecanismo `?v=` de invalidação de cache
// do SW documentado em `public/sw.js`.
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

const API_INTERNAL_URL_DEV = 'http://localhost:3000';

// Tempo máximo do proxy do `rewrites()` (ms). O padrão do
// Next é 30 s e as operações mais longas do backend (cronograma, planilha) levam
// bem menos, mas a base real é maior que a semeada — 120 s dá folga larga sem
// deixar conexão pendurada indefinidamente.
const API_PROXY_TIMEOUT_MS = 120_000;

// Origem do backend (sem `/api`), só de servidor. Em produção a ausência é erro
// de configuração: falha no carregamento em vez de apontar o proxy para lugar
// nenhum. A mensagem cita o nome da variável, nunca o valor.
function resolveApiInternalUrl() {
  const valor = (process.env.API_INTERNAL_URL ?? '').trim();
  if (valor) return valor.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'A variável de ambiente API_INTERNAL_URL é obrigatória em produção (origem do backend, sem /api, só servidor; veja o .env.example).'
    );
  }
  return API_INTERNAL_URL_DEV;
}

const API_INTERNAL_URL = resolveApiInternalUrl();

const config = {
  turbopack: {},
  // Não gera AGENTS.md no `next dev` — a orientação para IA vive no CLAUDE.md do repo.
  agentRules: false,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  experimental: {
    proxyTimeout: API_PROXY_TIMEOUT_MS,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

export default config;
