// Adiciona configuração turbopack vazia para Next.js 16
import { OFFLINE_CONTENT_SECURITY_POLICY } from './src/utils/offlineContentSecurityPolicy.mjs';

// Alimenta `NEXT_PUBLIC_BUILD_ID` — mecanismo `?v=` de invalidação de cache
// do SW documentado em `public/sw.js`.
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

// DEC-003-019: o navegador fala com a própria origem (`/api`) e o `rewrites()`
// abaixo encaminha ao backend; `NEXT_PUBLIC_API_URL` não existe mais.
const API_INTERNAL_URL_DEV = 'http://localhost:3000';

// Tempo máximo do proxy do `rewrites()` (ms). O padrão do
// Next é 30 s e as operações mais longas do backend (cronograma, planilha) levam
// bem menos, mas a base real é maior que a semeada — 120 s dá folga larga sem
// deixar conexão pendurada indefinidamente.
const API_PROXY_TIMEOUT_MS = 120_000;

// Teto do corpo que o proxy do `rewrites()` repassa (TRISK-003-004). O maior limite
// do backend é o upload de planilha: 10 MiB de arquivo (multer em
// `src/utilities/planilhaUpload.js`) mais o envelope multipart. O teto fica acima
// disso para o backend responder 413 por conta própria, em vez de o proxy cortar o
// corpo (padrão do Next: 10 MB) e deixar a requisição pendurada.
const API_PROXY_MAX_BODY_BYTES = 12 * 1024 * 1024;

// Origem do backend (sem `/api`), só de servidor (DEC-003-019). Em produção a ausência é erro
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

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
];

const config = {
  turbopack: {},
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
      {
        source: '/offline.html',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: OFFLINE_CONTENT_SECURITY_POLICY,
          },
        ],
      },
    ];
  },
  // Não gera AGENTS.md no `next dev` — a orientação para IA vive no CLAUDE.md do repo.
  agentRules: false,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  experimental: {
    proxyTimeout: API_PROXY_TIMEOUT_MS,
    proxyClientMaxBodySize: API_PROXY_MAX_BODY_BYTES,
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
