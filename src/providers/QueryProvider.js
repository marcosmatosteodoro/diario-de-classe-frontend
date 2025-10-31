'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            cacheTime: 5 * 60 * 1000, // 5 minutos
            retry: (failureCount, error) => {
              // Não tentar novamente para erros 4xx
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Tentar no máximo 3 vezes para outros erros
              return failureCount < 3;
            },
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
