# Configuração do ESLint

O ESLint é uma ferramenta de análise estática que identifica e reporta padrões problemáticos no código JavaScript/TypeScript, ajudando a manter a qualidade e consistência do código.

## 📦 Dependências

- `eslint` - Linter principal para JavaScript/TypeScript
- `eslint-config-next` - Configuração específica para Next.js

## ⚙️ Configuração

### 🔧 Arquivo de Configuração

**Arquivo**: `eslint.config.mjs`

```javascript
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [...compat.extends('next/core-web-vitals')];

export default eslintConfig;
```

### 📋 Configuração Next.js

O `eslint-config-next` inclui:

- **Core Web Vitals**: Regras para performance web
- **React Hooks**: Regras para hooks do React
- **React**: Regras gerais do React
- **JSX a11y**: Regras de acessibilidade
- **Import/Export**: Regras para imports e exports

## 🎯 Scripts NPM

**Arquivo**: `package.json`

```json
{
  "scripts": {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix"
  }
}
```

### 📝 Descrição dos Scripts

- **`npm run lint`**: Verifica problemas de código sem corrigir
- **`npm run lint:fix`**: Verifica e corrige automaticamente problemas possíveis

## 🔍 Regras Principais

### ⚛️ React/Next.js Rules

```javascript
// ✅ Correto
import React from 'react';
export default function Component() {
  return <div>Hello World</div>;
}

// ❌ Incorreto
export default function component() { // Nome deve começar com maiúscula
  return <div>Hello World</div>;
}
```

### 🎣 React Hooks Rules

```javascript
// ✅ Correto
function useCustomHook() {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Effect logic
  }, []);

  return { state, setState };
}

// ❌ Incorreto
function useCustomHook() {
  if (condition) {
    const [state, setState] = useState(null); // Hook dentro de condição
  }
}
```

### 🌐 Core Web Vitals

```javascript
// ✅ Correto - Image otimizada
import Image from 'next/image';

export default function Gallery() {
  return (
    <Image
      src="/photo.jpg"
      alt="Descrição da imagem"
      width={500}
      height={300}
    />
  );
}

// ❌ Incorreto - img tag sem otimização
export default function Gallery() {
  return <img src="/photo.jpg" />; // Missing alt, não otimizada
}
```

### ♿ Accessibility Rules

```javascript
// ✅ Correto
<button onClick={handleClick}>
  Clique aqui
</button>

<img src="photo.jpg" alt="Descrição da foto" />

// ❌ Incorreto
<div onClick={handleClick}>Clique aqui</div> // Não é focusável
<img src="photo.jpg" /> // Sem alt text
```

## 🔧 Integração com Outras Ferramentas

### 🎨 Prettier

O ESLint e Prettier trabalham juntos:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix", // 1º: Corrige problemas de código
      "prettier --write" // 2º: Formata o código
    ]
  }
}
```

### 🎣 Husky

Execução automática via pre-commit hook:

```bash
# .husky/pre-commit
npx lint-staged
```

## 💻 Uso no Editor

### VS Code

**Extensão recomendada**:

- **ESLint** (`dbaeumer.vscode-eslint`)

**Configuração** (`.vscode/settings.json`):

```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.format.enable": true
}
```

## 🚨 Tipos de Problemas

### 🔴 Errors (Bloqueiam build)

```javascript
// Error: 'React' must be in scope when using JSX
return <div>Hello</div>; // Sem import do React

// Error: img elements must have an alt prop
<img src="photo.jpg" />;

// Error: Hooks devem ser chamados no top level
if (condition) {
  useEffect(() => {}); // ❌
}
```

### 🟡 Warnings (Não bloqueiam build)

```javascript
// Warning: 'value' is assigned a value but never used
const value = getData(); // ❌ Variável não usada

// Warning: Missing dependency in useEffect hook
useEffect(() => {
  fetchData(userId);
}, []); // ❌ userId não está nas dependências
```

## 🛠️ Comandos Úteis

### Verificar arquivo específico

```bash
npx eslint src/components/Header.js
```

### Corrigir problemas automaticamente

```bash
npx eslint src/components/Header.js --fix
```

### Verificar por extensão

```bash
npx eslint "src/**/*.{js,jsx}" --fix
```

### Ignorar regra específica

```bash
npx eslint --no-eslintrc --config '{"rules":{"no-console":"off"}}' src/
```

### Listar regras ativas

```bash
npx eslint --print-config src/components/Header.js
```

## 🎛️ Configurações Customizadas

### Ignorar Arquivos

**Arquivo**: `.eslintignore`

```ignore
node_modules/
.next/
out/
build/
coverage/
*.config.js
```

### Desabilitar Regras

```javascript
// Desabilitar para linha específica
console.log('Debug info'); // eslint-disable-line no-console

// Desabilitar para próxima linha
// eslint-disable-next-line no-console
console.log('Debug info');

// Desabilitar para bloco
/* eslint-disable no-console */
console.log('Start');
console.log('End');
/* eslint-enable no-console */

// Desabilitar para arquivo inteiro
/* eslint-disable no-console */
```

### Configuração por Ambiente

```javascript
// eslint.config.mjs
export default [
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    },
  },
];
```

## 🧪 Integração com Testes

### Jest Integration

```javascript
// Para arquivos de teste
export default [
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    env: {
      jest: true,
    },
    rules: {
      'no-undef': 'off', // Jest globals como describe, it, expect
    },
  },
];
```

## 🎯 Regras Customizadas Recomendadas

```javascript
export default [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Evitar console.log em produção
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

      // Preferir const/let ao invés de var
      'no-var': 'error',
      'prefer-const': 'error',

      // Exigir chaves em arrow functions para consistência
      'arrow-body-style': ['error', 'as-needed'],

      // Evitar declarações não utilizadas
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Exigir ponto e vírgula
      semi: ['error', 'always'],

      // Preferir template literals
      'prefer-template': 'error',
    },
  },
];
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "lint:strict": "eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0"
  }
}
```

## 🐛 Solução de Problemas

### Configuração não funciona

```bash
# Limpar cache do ESLint
npx eslint --cache --cache-location .eslintcache src/

# Verificar configuração
npx eslint --print-config src/components/Header.js
```

### Conflitos com Prettier

Instale o config do prettier:

```bash
npm install --save-dev eslint-config-prettier
```

### Performance lenta

```javascript
// Adicionar ao config
export default [
  {
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },
];
```

## 📊 Relatórios

### HTML Report

```bash
npx eslint src/ --format html --output-file eslint-report.html
```

### JSON Report

```bash
npx eslint src/ --format json --output-file eslint-report.json
```

## 🎯 Benefícios

- ✅ **Qualidade**: Detecta bugs antes da execução
- ✅ **Consistência**: Padrões uniformes no time
- ✅ **Manutenibilidade**: Código mais limpo e legível
- ✅ **Performance**: Regras específicas para Next.js
- ✅ **Acessibilidade**: Validação automática de a11y
- ✅ **Integração**: Funciona com editores e CI/CD
- ✅ **Automação**: Correção automática de problemas
