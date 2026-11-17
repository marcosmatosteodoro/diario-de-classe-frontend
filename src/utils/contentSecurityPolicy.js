import { SHARED_DIRECTIVES as d } from './offlineContentSecurityPolicy.mjs';

const FALLBACK_API_ORIGIN = 'http://localhost:3000';

// Mesmo host de fallback de `src/store/api/baseApi.js`; URL ausente ou inválida nunca
// vira `*` nem lança.
export function resolveApiOrigin(apiUrl) {
  try {
    const { origin } = new URL(apiUrl);
    if (origin && origin !== 'null') return origin;
  } catch {
    // apiUrl ausente ou inválido: cai no fallback
  }
  return FALLBACK_API_ORIGIN;
}

export function buildContentSecurityPolicy({ nonce, isDev = false, apiUrl }) {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  return [
    d.defaultSrc,
    `script-src ${scriptSrc.join(' ')}`,
    d.styleSrc,
    d.imgSrc,
    d.fontSrc,
    `connect-src 'self' ${resolveApiOrigin(apiUrl)}`,
    d.objectSrc,
    d.baseUri,
    d.formAction,
    d.frameAncestors,
    "worker-src 'self'",
    "manifest-src 'self'",
  ].join('; ');
}
