// Hash sha256 do <script> inline de `public/offline.html` (página servida do
// cache do service worker, portanto sem nonce). Um teste recalcula o hash a
// partir do arquivo.
export const OFFLINE_SCRIPT_HASH =
  'Okf6PegE9sa6dNsjom4zizPCreEy1PpBNlukW8dWShQ=';

export const OFFLINE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'sha256-${OFFLINE_SCRIPT_HASH}'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
