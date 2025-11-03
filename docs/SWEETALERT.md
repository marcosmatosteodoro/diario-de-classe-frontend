# SweetAlert2 - Guia de Uso

O SweetAlert2 é uma biblioteca JavaScript para criar alertas bonitos, responsivos e customizáveis. No projeto, implementamos duas formas de usar:

## 🎯 **Hook Personalizado (Recomendado)**

### Importação

```jsx
import { useSweetAlert } from '@/hooks/useSweetAlert';
```

### Uso Básico

```jsx
function MyComponent() {
  const { showSuccess, showError, showConfirm } = useSweetAlert();

  const handleSave = async () => {
    try {
      // Simular operação
      await saveData();
      showSuccess({ title: 'Salvo!', text: 'Dados salvos com sucesso!' });
    } catch (error) {
      showError({ title: 'Erro!', text: 'Falha ao salvar dados.' });
    }
  };

  return <button onClick={handleSave}>Salvar</button>;
}
```

## 📋 **Métodos Disponíveis**

### `showSuccess(options)`

Exibe um alert de sucesso com timer automático.

```jsx
showSuccess({
  title: 'Sucesso!',
  text: 'Operação realizada com sucesso!',
});
```

### `showError(options)`

Exibe um alert de erro.

```jsx
showError({
  title: 'Erro!',
  text: 'Algo deu errado!',
});
```

### `showWarning(options)`

Exibe um alert de aviso.

```jsx
showWarning({
  title: 'Atenção!',
  text: 'Verifique os dados antes de continuar!',
});
```

### `showInfo(options)`

Exibe um alert informativo.

```jsx
showInfo({
  title: 'Informação',
  text: 'Sistema será atualizado às 02:00h',
});
```

### `showConfirm(options)`

Exibe um dialog de confirmação e retorna uma Promise.

```jsx
const result = await showConfirm({
  title: 'Confirmar exclusão?',
  text: 'Esta ação não pode ser desfeita!',
});

if (result.isConfirmed) {
  // Usuário confirmou
  deleteItem();
} else {
  // Usuário cancelou
  console.log('Cancelado');
}
```

### `showDeleteConfirm(itemName, options)`

Dialog específico para confirmação de exclusão.

```jsx
const result = await showDeleteConfirm('este usuário');
if (result.isConfirmed) {
  deleteUser();
}
```

### `showInput(options)`

Dialog com campo de input.

```jsx
const result = await showInput({
  title: 'Digite seu nome',
  inputPlaceholder: 'Nome completo...',
});

if (result.isConfirmed && result.value) {
  console.log('Nome digitado:', result.value);
}
```

### `showLoading(options)`

Exibe um loading spinner.

```jsx
showLoading({ title: 'Processando...' });

// Para fechar o loading
setTimeout(() => {
  showSuccess({ title: 'Concluído!' });
}, 3000);
```

### `showToast(options)`

Exibe uma notificação toast no canto da tela.

```jsx
showToast({
  icon: 'success',
  title: 'Dados salvos!',
});
```

### `close()`

Fecha qualquer alert aberto programaticamente.

```jsx
close();
```

## 🎨 **Customização**

### Opções Comuns

```jsx
showSuccess({
  title: 'Título personalizado',
  text: 'Texto descritivo',
  timer: 5000, // 5 segundos
  timerProgressBar: true,
  showConfirmButton: true,
  confirmButtonText: 'OK',
  allowOutsideClick: false,
  allowEscapeKey: false,
});
```

### Customização de Botões

```jsx
showConfirm({
  title: 'Confirmar?',
  confirmButtonText: 'Sim, continuar',
  cancelButtonText: 'Não, cancelar',
  confirmButtonColor: '#28a745',
  cancelButtonColor: '#dc3545',
});
```

### Input Types

```jsx
// Texto
showInput({ input: 'text' });

// Email
showInput({ input: 'email' });

// Password
showInput({ input: 'password' });

// Textarea
showInput({ input: 'textarea' });

// Select
showInput({
  input: 'select',
  inputOptions: {
    opcao1: 'Opção 1',
    opcao2: 'Opção 2',
  },
});
```

## 🚀 **Exemplos Práticos**

### Confirmação de Exclusão

```jsx
const handleDelete = async userId => {
  const result = await showDeleteConfirm('este usuário');

  if (result.isConfirmed) {
    try {
      await deleteUser(userId);
      showSuccess({
        title: 'Deletado!',
        text: 'Usuário removido com sucesso!',
      });
    } catch (error) {
      showError({ title: 'Erro!', text: 'Falha ao deletar usuário.' });
    }
  }
};
```

### Processo com Loading

```jsx
const handleProcess = async () => {
  showLoading({ title: 'Processando dados...' });

  try {
    await processData();
    showSuccess({ title: 'Sucesso!', text: 'Dados processados!' });
  } catch (error) {
    showError({ title: 'Erro!', text: 'Falha no processamento.' });
  }
};
```

### Formulário com Input

```jsx
const handleAddCategory = async () => {
  const result = await showInput({
    title: 'Nova Categoria',
    inputPlaceholder: 'Nome da categoria...',
    inputValidator: value => {
      if (!value || value.length < 3) {
        return 'Nome deve ter pelo menos 3 caracteres!';
      }
    },
  });

  if (result.isConfirmed) {
    try {
      await addCategory(result.value);
      showSuccess({ title: 'Criado!', text: 'Categoria adicionada!' });
    } catch (error) {
      showError({ title: 'Erro!', text: 'Falha ao criar categoria.' });
    }
  }
};
```

## 🛠 **Utilitário Global (Alternativa)**

Para usar fora de componentes React:

```jsx
import { SweetAlertUtils } from '@/utils/sweetAlert';

// Em qualquer lugar do código
SweetAlertUtils.success({ title: 'Sucesso!' });
SweetAlertUtils.error({ title: 'Erro!' });
```

## 🎯 **Boas Práticas**

1. **Use o hook** `useSweetAlert` em componentes React
2. **Sempre trate** os resultados de confirmação
3. **Customize** títulos e textos para cada contexto
4. **Use loading** para operações demoradas
5. **Prefira toasts** para notificações simples
6. **Delete confirms** para ações destrutivas

## 🆚 **SweetAlert2 vs Toast Provider**

| Aspecto         | SweetAlert2            | Toast Provider        |
| --------------- | ---------------------- | --------------------- |
| **Uso**         | Modais centrais        | Notificações no canto |
| **Interação**   | Requer ação do usuário | Auto-dismiss          |
| **Confirmação** | Sim                    | Não                   |
| **Input**       | Sim                    | Não                   |
| **Loading**     | Sim                    | Não                   |
| **Stackable**   | Não                    | Sim                   |

**Recomendação**: Use SweetAlert2 para confirmações e interações importantes, Toast para feedback simples.
