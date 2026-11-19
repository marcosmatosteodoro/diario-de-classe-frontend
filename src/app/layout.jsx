import { cookies, headers } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/providers/ToastProvider';
import { ReduxProvider } from '@/providers/ReduxyProvider';
import { UserAuthProvider } from '@/providers/UserAuthProvider';
import { NonceProvider } from '@/providers/NonceProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { getKey, parseThemeCookie } from '@/utils/themeCookie';
import { ServiceWorkerRegister } from '@/components/app/ServiceWorkerRegister';
import { resolverMarca } from '@/utils/marcas.mjs';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// (DEC-006-002 · demonstracao) Título e ícone do head lidos do registro;
// `manifest`/`theme-color` continuam literais (fora do registro, resolvidos
// pelo rewrite — DEC-006-004).
const marca = resolverMarca(process.env.NEXT_PUBLIC_MARCA);

export const metadata = {
  title: marca.tituloAba,
  description: 'Sistema de gestão escolar',
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  // `null` (cookie ausente/inválido) chega como está a `ThemeProvider` — é o
  // sinal, idêntico nos dois lados, de "nada para herdar" (DEC-002-001);
  // colapsar aqui para `DEFAULT_THEME` impediria o provider de distinguir
  // "sem cookie" de "cookie=light" e de disparar a migração de
  // `localStorage`.
  const initialTheme = parseThemeCookie(cookieStore.get(getKey())?.value);

  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e293b" />
        <link rel="icon" href={marca.icone192} />
        <link rel="apple-touch-icon" href={marca.icone192} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegister />
        <ReduxProvider>
          <NonceProvider nonce={nonce}>
            <ThemeProvider initialTheme={initialTheme}>
              <ToastProvider>
                <UserAuthProvider>{children}</UserAuthProvider>
              </ToastProvider>
            </ThemeProvider>
          </NonceProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
