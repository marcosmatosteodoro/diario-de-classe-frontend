# Configuração do Jest

O Jest é um framework de testes JavaScript que oferece testes unitários, de integração e snapshot testing, com suporte nativo ao Next.js e React Testing Library.

## 📦 Dependências

- `jest` - Framework de testes principal
- `jest-environment-jsdom` - Ambiente DOM para testes React
- `@testing-library/react` - Utilitários para testar componentes React
- `@testing-library/jest-dom` - Matchers customizados para DOM
- `@testing-library/user-event` - Simulação de eventos do usuário

## ⚙️ Configuração

### 🔧 Arquivo de Configuração

**Arquivo**: `jest.config.js`

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Caminho para o app Next.js para carregar next.config.js e .env
  dir: './',
});

// Configuração customizada do Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/index.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = createJestConfig(customJestConfig);
```

### 🛠️ Setup Global

**Arquivo**: `jest.setup.js`

```javascript
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: props => {
    return <img {...props} />;
  },
}));

// Global mocks
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.matchMedia =
  global.matchMedia ||
  function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  };
```

## 🎯 Scripts NPM

**Arquivo**: `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 📝 Descrição dos Scripts

- **`npm test`**: Executa todos os testes uma vez
- **`npm run test:watch`**: Executa testes em modo watch (reexecuta ao salvar)
- **`npm run test:coverage`**: Executa testes com relatório de cobertura

## 🧪 Tipos de Testes

### 🔲 Testes de Componente

```javascript
// src/components/Header/Header.test.js
import { render, screen } from '@testing-library/react';
import { Header } from './index';

describe('Header Component', () => {
  it('should render the header with correct title', () => {
    render(<Header />);

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Diário de Classe');
  });

  it('should render all navigation links', () => {
    render(<Header />);

    const navigationLinks = ['Início', 'Turmas', 'Relatórios', 'Configurações'];

    navigationLinks.forEach(linkText => {
      const link = screen.getByRole('link', { name: linkText });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '#');
    });
  });
});
```

### 🎣 Testes de Hooks

```javascript
// src/hooks/useHealth.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHealth } from './useHealth';
import { api } from '../services/api';

// Mock do serviço
jest.mock('../services/api');

const createWrapper = () => {
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('useHealth', () => {
  it('should return success data when API call succeeds', async () => {
    const mockData = { status: 'ok', timestamp: '2025-10-31T12:00:00Z' };
    api.get.mockResolvedValue(mockData);

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(api.get).toHaveBeenCalledWith('/health');
  });
});
```

### 🔧 Testes de Utilitários

```javascript
// src/utils/formatters.test.js
import { formatCurrency, formatDate } from './formatters';

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format number as BRL currency', () => {
      expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
      expect(formatCurrency(0)).toBe('R$ 0,00');
      expect(formatCurrency(-100)).toBe('-R$ 100,00');
    });
  });

  describe('formatDate', () => {
    it('should format date in Brazilian format', () => {
      const date = new Date('2025-10-31T10:30:00Z');
      expect(formatDate(date)).toBe('31/10/2025');
    });
  });
});
```

## 🎨 Matchers Customizados

### @testing-library/jest-dom

```javascript
// Matchers disponíveis
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveClass('active');
expect(element).toHaveAttribute('href', '/login');
expect(element).toHaveTextContent('Hello World');
expect(input).toHaveValue('test@example.com');
expect(input).toBeChecked();
expect(input).toBeDisabled();
expect(element).toHaveFocus();
```

### Jest Built-in Matchers

```javascript
// Igualdade
expect(result).toBe(expected); // ===
expect(result).toEqual(expected); // Deep equality
expect(result).toStrictEqual(expected); // Strict equality

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeNull();
expect(result).toBeUndefined();
expect(result).toBeDefined();

// Números
expect(result).toBeGreaterThan(10);
expect(result).toBeLessThanOrEqual(100);
expect(result).toBeCloseTo(10.3, 2);

// Strings
expect(result).toMatch(/hello/i);
expect(result).toContain('world');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objetos
expect(object).toHaveProperty('name');
expect(object).toHaveProperty('user.email', 'test@example.com');

// Funções
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(2);
```

## 🎭 Mocks e Spies

### Mock Functions

```javascript
// Criar mock function
const mockFn = jest.fn();
const mockFnWithReturn = jest.fn(() => 'return value');
const mockFnWithImplementation = jest.fn(x => x * 2);

// Verificações
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveReturnedWith('value');

// Mock return values
mockFn.mockReturnValue('value');
mockFn.mockReturnValueOnce('first call');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));
```

### Mock Modules

```javascript
// Mock módulo completo
jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock parcial
jest.mock('../services/api', () => ({
  ...jest.requireActual('../services/api'),
  get: jest.fn(),
}));

// Mock com factory
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  })),
}));
```

### Spy on Methods

```javascript
// Spy em método de objeto
const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

// Usar e verificar
console.log('test');
expect(spy).toHaveBeenCalledWith('test');

// Restaurar
spy.mockRestore();
```

## 👤 User Events

```javascript
import userEvent from '@testing-library/user-event';

describe('Interactive Component', () => {
  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Digitar em input
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');

    // Clicar em botão
    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    // Verificar resultado
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });
});
```

## 📊 Coverage Reports

### Configuração de Cobertura

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.js',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Relatórios Gerados

```bash
# Terminal (text)
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   85.71 |      100 |      80 |   85.71 |
 Header   |   85.71 |      100 |      80 |   85.71 | 15,23
----------|---------|----------|---------|---------|-------------------

# HTML (coverage/lcov-report/index.html)
# Relatório interativo no navegador

# LCOV (coverage/lcov.info)
# Para integração com ferramentas de CI/CD
```

## 🚀 Integração CI/CD

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm test -- --coverage --watchAll=false

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 🎛️ Configurações Avançadas

### Watch Mode

```bash
# Opções do watch mode
npm run test:watch

# Comandos disponíveis:
# p - filtrar por padrão de arquivo
# t - filtrar por nome do teste
# q - sair
# a - executar todos os testes
# u - atualizar snapshots
```

### Debug Tests

```javascript
// Adicionar breakpoint
debugger

// Log durante teste
console.log('Debug info:', variable)

// Debug no VS Code
// Adicionar ao launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## 🐛 Solução de Problemas

### Testes lentos

```javascript
// jest.config.js
module.exports = {
  // Executar testes em paralelo
  maxWorkers: '50%',

  // Cache para acelerar reruns
  cache: true,
  cacheDirectory: '.jest-cache',

  // Limitar arquivos testados
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
};
```

### Problemas com ES Modules

```javascript
// jest.config.js
module.exports = {
  extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
```

### Mock não funciona

```javascript
// Certificar que mock está antes do import
jest.mock('../services/api');
import { api } from '../services/api';

// Ou usar hoisting
import { api } from '../services/api';
jest.mock('../services/api');
```

## 🎯 Boas Práticas

### 📝 Nomenclatura

```javascript
// ✅ Descritivo
describe('UserService', () => {
  describe('when user is authenticated', () => {
    it('should return user profile data', () => {});
    it('should cache the response for 5 minutes', () => {});
  });

  describe('when user is not authenticated', () => {
    it('should throw UnauthorizedError', () => {});
  });
});

// ❌ Genérico
describe('Tests', () => {
  it('works', () => {});
});
```

### 🧹 Setup e Cleanup

```javascript
describe('Component with side effects', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = jest.spyOn(api, 'get');
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
```

### 🎯 Testes Focados

```javascript
// Executar apenas um teste
it.only('should run only this test', () => {});

// Pular teste
it.skip('should skip this test', () => {});

// Teste para implementar
it.todo('should implement this feature');
```

## 📈 Métricas de Qualidade

- **Coverage**: Mínimo 80% em statements, branches, functions e lines
- **Performance**: Testes devem executar em <30s
- **Manutenibilidade**: Cada teste deve testar apenas uma funcionalidade
- **Confiabilidade**: Testes não devem ser flaky (falhar aleatoriamente)

## 🎯 Benefícios

- ✅ **Confiança**: Detecta bugs antes da produção
- ✅ **Refatoração**: Permite mudanças seguras no código
- ✅ **Documentação**: Testes servem como documentação viva
- ✅ **Qualidade**: Força código mais testável e modular
- ✅ **Integração**: Feedback rápido em CI/CD
- ✅ **Regressão**: Previne bugs que já foram corrigidos
