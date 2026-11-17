import { SHARED_DIRECTIVES as d } from './offlineContentSecurityPolicy.mjs';

export function buildContentSecurityPolicy({ nonce, isDev = false }) {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  return [
    d.defaultSrc,
    `script-src ${scriptSrc.join(' ')}`,
    d.styleSrc,
    d.imgSrc,
    d.fontSrc,
    // DEC-003-019: a API é da mesma origem (`/api`), então `'self'` basta.
    "connect-src 'self'",
    d.objectSrc,
    d.baseUri,
    d.formAction,
    d.frameAncestors,
    "worker-src 'self'",
    "manifest-src 'self'",
  ].join('; ');
}
