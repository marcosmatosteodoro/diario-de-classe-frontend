import { cookies } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/providers/ToastProvider';
import { ReduxProvider } from '@/providers/ReduxyProvider';
import { UserAuthProvider } from '@/providers/UserAuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { getKey, parseThemeCookie } from '@/utils/themeCookie';

const DEFAULT_THEME = 'light';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Diário de Classe',
  description: 'Sistema de gestão escolar',
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const initialTheme =
    parseThemeCookie(cookieStore.get(getKey())?.value) ?? DEFAULT_THEME;

  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e293b" />
        <link rel="icon" href="/bls.png" />
        <link rel="apple-touch-icon" href="/bls.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReduxProvider>
          <ThemeProvider initialTheme={initialTheme}>
            <ToastProvider>
              <UserAuthProvider>{children}</UserAuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
