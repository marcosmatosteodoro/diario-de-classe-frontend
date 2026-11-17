// Hash sha256 do <script> inline de `public/offline.html` (página servida do
// cache do service worker, portanto sem nonce). Um teste recalcula o hash a
// partir do arquivo.
export const OFFLINE_SCRIPT_HASH =
  'Okf6PegE9sa6dNsjom4zizPCreEy1PpBNlukW8dWShQ=';

// Diretivas comuns às duas políticas (documentos com nonce e offline.html).
export const SHARED_DIRECTIVES = {
  defaultSrc: "default-src 'self'",
  // sweetalert2 e react-data-table-component injetam <style> em runtime.
  styleSrc: "style-src 'self' 'unsafe-inline'",
  imgSrc: "img-src 'self' data: blob:",
  fontSrc: "font-src 'self'",
  objectSrc: "object-src 'none'",
  baseUri: "base-uri 'self'",
  formAction: "form-action 'self'",
  frameAncestors: "frame-ancestors 'none'",
};

const d = SHARED_DIRECTIVES;

export const OFFLINE_CONTENT_SECURITY_POLICY = [
  d.defaultSrc,
  `script-src 'self' 'sha256-${OFFLINE_SCRIPT_HASH}'`,
  d.styleSrc,
  d.imgSrc,
  d.fontSrc,
  d.objectSrc,
  d.baseUri,
  d.formAction,
  d.frameAncestors,
].join('; ');
