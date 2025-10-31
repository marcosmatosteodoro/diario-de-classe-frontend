# Configuração do Husky

O Husky é usado para automatizar verificações de qualidade de código através de Git hooks, garantindo que apenas código de qualidade seja commitado e enviado para o repositório.

## 📦 Dependências

- `husky` - Gerenciador de Git hooks
- `lint-staged` - Executa comandos apenas em arquivos modificados

## ⚙️ Configuração

### 🔧 Inicialização

O Husky foi inicializado com:

```bash
npx husky init
```

### 📁 Estrutura de Arquivos

```
.husky/
├── _/              # Arquivos internos do Husky
├── pre-commit      # Hook executado antes do commit
├── pre-push        # Hook executado antes do push
└── commit-msg      # Hook para validar mensagem de commit
```

## 🎯 Git Hooks Configurados

### 📝 pre-commit

**Arquivo**: `.husky/pre-commit`

```bash
npx lint-staged
```

**Funcionalidade**:

- Executa automaticamente antes de cada commit
- Roda `lint-staged` nos arquivos modificados
- Aplica ESLint + Prettier apenas nos arquivos alterados
- **Bloqueia o commit** se houver erros de lint

**Arquivos processados**:

- `*.{js,jsx,ts,tsx}`: ESLint + Prettier
- `*.{js,jsx,ts,tsx,json,css,md}`: Prettier

### 🚀 pre-push

**Arquivo**: `.husky/pre-push`

```bash
npm run test
```

**Funcionalidade**:

- Executa automaticamente antes de cada push
- Roda **todos os testes** do projeto
- **Bloqueia o push** se algum teste falhar
- Garante que código quebrado não chegue ao repositório

### 💬 commit-msg

**Arquivo**: `.husky/commit-msg`

```bash
#!/bin/sh

# Validar mensagem de commit
commit_regex='^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}'
commit_message=$(cat "$1")

if ! echo "$commit_message" | grep -qE "$commit_regex"; then
    echo "❌ Mensagem de commit inválida!"
    echo ""
    echo "A mensagem deve seguir o padrão:"
    echo "tipo(escopo): descrição"
    echo ""
    echo "Tipos válidos:"
    echo "- feat: nova funcionalidade"
    echo "- fix: correção de bug"
    echo "- docs: documentação"
    echo "- style: formatação, estilo"
    echo "- refactor: refatoração"
    echo "- test: testes"
    echo "- chore: tarefas de manutenção"
    echo ""
    echo "Exemplo: 'feat(header): adicionar navegação responsiva'"
    exit 1
fi
```

**Funcionalidade**:

- Valida o formato da mensagem de commit
- Segue o padrão **Conventional Commits**
- **Bloqueia commits** com mensagens mal formatadas
- Força consistência no histórico do Git

## 📋 Configuração do lint-staged

**Arquivo**: `package.json`

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,ts,tsx,json,css,md}": ["prettier --write"]
  }
}
```

## 🎨 Padrão de Commit Messages

### ✅ Exemplos Válidos

```bash
feat: adicionar componente de login
fix: corrigir bug na validação de formulário
docs: atualizar README com instruções de instalação
style: aplicar formatação no componente Header
refactor: reorganizar estrutura de pastas
test: adicionar testes para hook useAuth
chore: atualizar dependências do projeto

# Com escopo
feat(auth): implementar sistema de login
fix(header): corrigir responsividade da navegação
docs(api): documentar endpoints de usuário
```

### ❌ Exemplos Inválidos

```bash
Add login component              # Falta tipo
login component                  # Falta tipo e dois pontos
feat add login                   # Falta dois pontos
FEAT: add login                  # Tipo em maiúscula
feat: adicionar componente de login que permite ao usuário fazer login no sistema com email e senha # Muito longo (>50 chars)
```

## 🛠️ Scripts NPM Relacionados

```json
{
  "scripts": {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "prepare": "husky"
  }
}
```

## 🚨 Como Pular Verificações (Emergência)

⚠️ **Use apenas em casos excepcionais!**

### Pular pre-commit

```bash
git commit --no-verify -m "feat: commit emergencial"
```

### Pular pre-push

```bash
git push --no-verify
```

### Pular validação de mensagem

```bash
git commit --no-verify -m "mensagem sem padrão"
```

## 🔧 Comandos Úteis

### Executar lint-staged manualmente

```bash
npx lint-staged
```

### Testar hook de commit-msg

```bash
echo "feat: teste" | .husky/commit-msg
```

### Reinstalar hooks (se necessário)

```bash
npx husky install
```

## 📊 Fluxo de Trabalho

1. **Desenvolvedor modifica arquivos**
2. **`git add .`** - Adiciona arquivos ao stage
3. **`git commit -m "feat: nova funcionalidade"`**
   - ✅ **commit-msg**: Valida formato da mensagem
   - ✅ **pre-commit**: Executa lint-staged (ESLint + Prettier)
4. **`git push`**
   - ✅ **pre-push**: Executa todos os testes
5. **Código enviado para o repositório** 🎉

## 🎯 Benefícios

- ✅ **Qualidade garantida**: Código sempre formatado e sem erros de lint
- ✅ **Testes automáticos**: Nunca enviar código quebrado
- ✅ **Histórico limpo**: Mensagens de commit padronizadas
- ✅ **Time alinhado**: Todos seguem as mesmas regras
- ✅ **CI/CD confiável**: Menos erros em produção

## 🐛 Solução de Problemas

### Hook não está executando

```bash
# Reinstalar hooks
npx husky install

# Verificar permissões
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
chmod +x .husky/commit-msg
```

### Erro "husky command not found"

```bash
# Instalar husky globalmente (opcional)
npm install -g husky

# Ou usar npx
npx husky install
```

### Lint-staged não funciona

```bash
# Verificar se lint-staged está instalado
npm list lint-staged

# Executar manualmente para debug
npx lint-staged --debug
```
