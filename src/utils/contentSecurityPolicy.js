const FALLBACK_API_URL = 'http://localhost:3000/api';

// Mesmo fallback de `src/store/api/baseApi.js`; URL ausente ou inválida nunca
// vira `*` nem lança.
export function resolveApiOrigin(apiUrl) {
  for (const candidate of [apiUrl, FALLBACK_API_URL]) {
    try {
      const { origin } = new URL(candidate);
      if (origin && origin !== 'null') return origin;
    } catch {
      // tenta o próximo candidato
    }
  }
  return new URL(FALLBACK_API_URL).origin;
}

export function buildContentSecurityPolicy({ nonce, isDev = false, apiUrl }) {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // sweetalert2 e react-data-table-component injetam <style> em runtime.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${resolveApiOrigin(apiUrl)}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ].join('; ');
}
