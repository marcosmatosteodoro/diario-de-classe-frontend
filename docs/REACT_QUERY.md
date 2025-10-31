# Configuração do React Query (TanStack Query)

Este projeto utiliza o React Query para gerenciamento de estado de servidor e cache de dados da API.

## 📦 Dependências Instaladas

- `@tanstack/react-query` - Biblioteca principal para gerenciamento de dados de servidor
- `@tanstack/react-query-devtools` - Ferramentas de desenvolvimento

## ⚙️ Configuração

### 🔧 QueryProvider (`src/providers/QueryProvider.js`)

Provider configurado com:

- **staleTime**: 1 minuto (dados são considerados frescos por 1 minuto)
- **cacheTime**: 5 minutos (dados permanecem em cache por 5 minutos)
- **retry**: Lógica customizada (não tenta novamente para erros 4xx, máximo 3 tentativas para outros erros)
- **refetchOnWindowFocus**: Desabilitado
- **React Query Devtools**: Habilitado apenas em desenvolvimento

### 🌐 Serviço de API (`src/services/api.js`)

Serviço base para comunicação com a API que inclui:

- Métodos HTTP: GET, POST, PUT, DELETE
- Tratamento de erros customizado
- Headers padrão (Content-Type: application/json)
- URL base configurada via variável de ambiente

### 🔗 Variáveis de Ambiente

#### `.env.local` (desenvolvimento)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
```

#### `.env.example` (template)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
```

## 🎯 Exemplo de Uso - Hook useHealth

### Hook (`src/hooks/useHealth.js`)

```javascript
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useHealth = (options = {}) => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    ...options,
  });
};
```

### Componente (`src/components/HealthCheck/index.js`)

```javascript
'use client';

import { useHealth } from '@/hooks/useHealth';

export const HealthCheck = () => {
  const { data, isLoading, error, refetch } = useHealth({
    retry: 1,
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });

  // Implementação do componente...
};
```

## 🧪 Testes

Os testes estão configurados para usar um QueryClient de teste:

```javascript
// src/hooks/useHealth.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
```

### Executar Testes

```bash
npm test                # Executar todos os testes
npm run test:watch      # Executar testes em modo watch
npm run test:coverage   # Executar testes com cobertura
```

## 🚀 Funcionalidades Implementadas

### ✅ Health Check Endpoint

- **Endpoint**: `/health`
- **URL Completa**: `http://localhost:3000/api/health`
- **Método**: GET
- **Hook**: `useHealth()`
- **Componente**: `<HealthCheck />`

### 🎨 Interface do Health Check

- Status visual com indicador colorido
- Botão para verificação manual
- Exibição de erros com detalhes
- Exibição da resposta da API em JSON
- Atualização automática a cada 30 segundos
- Timestamp da última verificação

### 🎯 Estados do Health Check

- **🟡 Loading**: Verificando conexão
- **🟢 Online**: API respondendo corretamente
- **🔴 Offline**: API indisponível ou com erro

## 📝 Como Usar em Desenvolvimento

1. **Inicie o servidor Next.js**:

   ```bash
   npm run dev
   ```

2. **Configure a URL da API no `.env.local`**:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

3. **Acesse a aplicação**: `http://localhost:3001`

4. **Verifique o Health Check** na página inicial

5. **Use o React Query Devtools** (aparece no canto inferior direito em desenvolvimento)

## 🔮 Próximos Passos

Quando o backend estiver pronto, você pode:

1. **Criar novos hooks** seguindo o padrão do `useHealth`
2. **Adicionar endpoints** no serviço de API
3. **Implementar autenticação** (tokens JWT)
4. **Configurar interceptors** para tratamento global de erros
5. **Adicionar mutations** para operações de escrita (POST, PUT, DELETE)

## 📚 Recursos Úteis

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query Devtools](https://tanstack.com/query/latest/docs/react/devtools)
- [Best Practices](https://tkdodo.eu/blog/practical-react-query)
