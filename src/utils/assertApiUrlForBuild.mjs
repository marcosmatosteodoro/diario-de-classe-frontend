import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

/**
 * Falha o build de produção quando `NEXT_PUBLIC_API_URL` está ausente.
 *
 * O valor é embutido no bundle em tempo de build; sem ele o `baseApi.js` cai no
 * fallback `localhost` e o bundle de produção aponta para uma API inexistente.
 * Fora do build (dev, start, test) o fallback é intencional e nada é checado.
 *
 * @param {{ phase: string, env?: Record<string, string | undefined> }} params
 */
export function assertApiUrlForBuild({ phase, env = process.env }) {
  if (phase !== PHASE_PRODUCTION_BUILD) {
    return;
  }
  if (!env.NEXT_PUBLIC_API_URL?.trim()) {
    throw new Error(
      'NEXT_PUBLIC_API_URL é obrigatória no build de produção: defina a URL da API antes de rodar `next build`.'
    );
  }
}
