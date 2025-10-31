# Configuração do Prettier

O Prettier é um formatador de código que garante consistência de estilo em todo o projeto, aplicando regras de formatação automaticamente.

## 📦 Dependência

- `prettier` - Formatador de código opinativo

## ⚙️ Configuração

### 🔧 Arquivo de Configuração

**Arquivo**: `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 📋 Explicação das Regras

| Regra            | Valor     | Descrição                                                 |
| ---------------- | --------- | --------------------------------------------------------- |
| `semi`           | `true`    | Adiciona ponto e vírgula no final das declarações         |
| `trailingComma`  | `"es5"`   | Adiciona vírgula final em objetos/arrays (compatível ES5) |
| `singleQuote`    | `true`    | Usa aspas simples ao invés de duplas                      |
| `printWidth`     | `80`      | Máximo de 80 caracteres por linha                         |
| `tabWidth`       | `2`       | Indentação de 2 espaços                                   |
| `useTabs`        | `false`   | Usa espaços ao invés de tabs                              |
| `bracketSpacing` | `true`    | Espaços dentro de chaves `{ foo }`                        |
| `arrowParens`    | `"avoid"` | Omite parênteses em arrow functions com um parâmetro      |
| `endOfLine`      | `"lf"`    | Usa LF (Unix) para quebra de linha                        |

### 🚫 Arquivo de Ignore

**Arquivo**: `.prettierignore`

```ignore
# Dependencies
node_modules/

# Build outputs
.next/
out/
build/
dist/

# Coverage reports
coverage/

# Environment files
.env*

# Package manager files
package-lock.json
yarn.lock
pnpm-lock.yaml

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log

# Temporary files
*.tmp
*.temp
```

## 🎯 Scripts NPM

**Arquivo**: `package.json`

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### 📝 Descrição dos Scripts

- **`npm run format`**: Formata todos os arquivos do projeto
- **`npm run format:check`**: Verifica se os arquivos estão formatados (não altera)

## 🔧 Integração com Outras Ferramentas

### 🎣 Husky + lint-staged

O Prettier é executado automaticamente antes dos commits:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,ts,tsx,json,css,md}": ["prettier --write"]
  }
}
```

### 🔍 ESLint

O Prettier trabalha em conjunto com o ESLint:

- **ESLint**: Regras de qualidade de código
- **Prettier**: Regras de formatação/estilo

## 💻 Uso no Editor

### VS Code

Para integração com VS Code, instale a extensão:

- **Prettier - Code formatter** (`esbenp.prettier-vscode`)

**Configuração recomendada** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Outros Editores

- **WebStorm/IntelliJ**: Suporte nativo
- **Vim/Neovim**: Plugin `prettier/vim-prettier`
- **Sublime Text**: Package `JsPrettier`

## 🎨 Exemplos de Formatação

### ✅ Antes e Depois

**Antes** (código mal formatado):

```javascript
const user = {
  name: 'João',
  age: 25,
  skills: ['JavaScript', 'React', 'Node.js'],
};

function greetUser(user) {
  if (user.name) {
    return `Hello, ${user.name}!`;
  }
  return 'Hello, stranger!';
}

const colors = ['red', 'green', 'blue'];
```

**Depois** (formatado pelo Prettier):

```javascript
const user = {
  name: 'João',
  age: 25,
  skills: ['JavaScript', 'React', 'Node.js'],
};

function greetUser(user) {
  if (user.name) {
    return `Hello, ${user.name}!`;
  }
  return 'Hello, stranger!';
}

const colors = ['red', 'green', 'blue'];
```

### 🔤 Aspas Simples vs Duplas

```javascript
// ✅ Formatado (singleQuote: true)
const message = 'Hello World';
const html = '<div class="container">Content</div>';

// ❌ Antes da formatação
const message = 'Hello World';
const html = '<div class="container">Content</div>';
```

### 📏 Quebra de Linha (printWidth: 80)

```javascript
// ✅ Formatado (quebra em 80 caracteres)
const longFunctionCall = someVeryLongFunctionName(
  parameter1,
  parameter2,
  parameter3,
  parameter4
);

// ❌ Antes da formatação
const longFunctionCall = someVeryLongFunctionName(
  parameter1,
  parameter2,
  parameter3,
  parameter4
);
```

### 🏹 Arrow Functions (arrowParens: "avoid")

```javascript
// ✅ Formatado (sem parênteses desnecessários)
const single = x => x * 2;
const multiple = (x, y) => x + y;

// ❌ Antes da formatação
const single = x => x * 2;
```

## 🚀 Comandos Úteis

### Formatar arquivo específico

```bash
npx prettier --write src/components/Header.js
```

### Formatar por extensão

```bash
npx prettier --write "src/**/*.{js,jsx}"
```

### Verificar formatação sem alterar

```bash
npx prettier --check .
```

### Listar arquivos que precisam formatação

```bash
npx prettier --list-different .
```

### Formatar com configuração customizada

```bash
npx prettier --write --single-quote --tab-width 4 src/
```

## 🎛️ Configurações Avançadas

### Por Tipo de Arquivo

```json
{
  "semi": true,
  "overrides": [
    {
      "files": "*.json",
      "options": {
        "tabWidth": 2
      }
    },
    {
      "files": "*.md",
      "options": {
        "printWidth": 100,
        "proseWrap": "always"
      }
    }
  ]
}
```

### Ignorar Código Específico

```javascript
// prettier-ignore
const ugly = {a:1,b:2,c:3};

/* prettier-ignore */
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
```

## 🔍 Verificação de Qualidade

### CI/CD

Adicione no seu pipeline:

```yaml
- name: Check Prettier
  run: npm run format:check
```

### Pre-commit Hook

O Prettier roda automaticamente via Husky:

```bash
# Arquivo modificado -> git add -> git commit
# -> Husky executa lint-staged
# -> lint-staged executa prettier --write
# -> Commit com código formatado
```

## 🐛 Solução de Problemas

### Conflitos ESLint vs Prettier

Se houver conflitos, use:

```bash
npm install --save-dev eslint-config-prettier
```

E adicione ao `.eslintrc`:

```json
{
  "extends": ["next", "prettier"]
}
```

### Formatação não funciona no VS Code

1. Verifique se a extensão está instalada
2. Configure o formatador padrão:
   ```json
   {
     "editor.defaultFormatter": "esbenp.prettier-vscode"
   }
   ```

### Ignorar arquivo não funciona

Verifique se o arquivo está listado em `.prettierignore` e reinicie o editor.

## 🎯 Benefícios

- ✅ **Consistência**: Mesmo estilo em todo o código
- ✅ **Produtividade**: Sem discussões sobre formatação
- ✅ **Legibilidade**: Código mais fácil de ler
- ✅ **Manutenção**: Diffs mais limpos no Git
- ✅ **Integração**: Funciona com editores e CI/CD
- ✅ **Automação**: Formatação automática via hooks
