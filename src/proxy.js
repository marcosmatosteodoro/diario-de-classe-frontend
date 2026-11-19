import { NextResponse } from 'next/server';
import { buildContentSecurityPolicy } from '@/utils/contentSecurityPolicy';

export function proxy(request) {
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16))
  ).toString('base64');
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
  });

  // O Next lê o nonce da CSP da requisição e o aplica aos próprios scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // (DEC-006-006 · demonstracao) exceção por arquivo real: só os 6
      // arquivos reais de `public/marcas/exemplo/` (imagens e manifesto da
      // marca fictícia, pedidos diretamente por Header/layout.jsx com a
      // marca fictícia selecionada) saem do CSP/nonce de documento, como
      // qualquer outra imagem estática — nunca o prefixo de pasta inteiro.
      source:
        '/((?!api/|_next/static/|_next/image$|favicon\\.ico$|sw\\.js$|offline\\.html$|manifest\\.json$|(?:bls|bls-dark|icon-192|icon-512|icon-maskable)\\.png$|marcas\\/exemplo\\/(?:(?:logo-claro|logo-escuro|icon-192|icon-512|icon-maskable)\\.png|manifest\\.json)$|(?:file|globe|next|vercel|window)\\.svg$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
