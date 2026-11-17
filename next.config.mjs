// Adiciona configuração turbopack vazia para Next.js 16
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

// Alimenta `NEXT_PUBLIC_BUILD_ID` — mecanismo `?v=` de invalidação de cache
// do SW documentado em `public/sw.js`.
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

const config = {
  turbopack: {},
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
