// Adiciona configuração turbopack vazia para Next.js 16
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

import { OFFLINE_CONTENT_SECURITY_POLICY } from './src/utils/offlineContentSecurityPolicy.mjs';

// Alimenta `NEXT_PUBLIC_BUILD_ID` — mecanismo `?v=` de invalidação de cache
// do SW documentado em `public/sw.js`.
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

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
};

// A checagem mora aqui (não em `src/`): o estágio runner do Dockerfile copia só
// `next.config.mjs`, e um import de `src/` quebraria o `next start` da imagem.
// `NEXT_PUBLIC_API_URL` é embutida no bundle em tempo de build; sem ela o
// `baseApi.js` cai no fallback `localhost` e a produção aponta para API inexistente.
function nextConfig(phase) {
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    !process.env.NEXT_PUBLIC_API_URL?.trim()
  ) {
    throw new Error(
      'NEXT_PUBLIC_API_URL é obrigatória no build de produção: defina a URL da API antes de rodar `next build`.'
    );
  }
  return config;
}

export default nextConfig;
