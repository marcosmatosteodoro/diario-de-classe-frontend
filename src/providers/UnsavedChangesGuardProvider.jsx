'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import useSweetAlert from '@/hooks/useSweetAlert';

const UnsavedChangesGuardContext = createContext(null);

// Um guard registrado que lança ao ser lido nunca pode travar navegação/
// logout de toda a aplicação (TRISK-002-003, superfície sensível) — trata
// como "sem alteração pendente" em vez de propagar o erro.
function lerGuardComFailSecure(guardFn) {
  if (!guardFn) return false;
  try {
    return Boolean(guardFn());
  } catch {
    return false;
  }
}

// Fora do provider (ou dentro dele, sem tela com alteração pendente), o guard
// nulo garante que `SidebarItem`/`Header` naveguem/deslogem exatamente como
// hoje: `confirmNavigation()` resolve `true` sem diálogo, `setGuard`/
// `clearGuard` não fazem nada e nunca lançam — ao contrário de `useToast`
// (ToastProvider.jsx:16), que exige o provider.
const GUARD_NULO = {
  setGuard: () => {},
  clearGuard: () => {},
  confirmNavigation: () => true,
};

export const useUnsavedChangesGuard = () => {
  const context = useContext(UnsavedChangesGuardContext);
  return context || GUARD_NULO;
};

export const UnsavedChangesGuardProvider = ({ children }) => {
  const guardRef = useRef(null);
  const [isDirtyRegistrado, setIsDirtyRegistrado] = useState(false);
  const { showConfirm } = useSweetAlert();

  const setGuard = useCallback(fn => {
    guardRef.current = fn;
    setIsDirtyRegistrado(lerGuardComFailSecure(fn));
  }, []);

  const clearGuard = useCallback(() => {
    guardRef.current = null;
    setIsDirtyRegistrado(false);
  }, []);

  // `confirmNavigation()` é deliberadamente polimórfica: devolve o booleano
  // `true` de forma síncrona (nunca uma Promise) quando não há alteração
  // pendente, para que `SidebarItem`/`Header` continuem navegando/deslogando
  // sem aguardar nada — um `.then()`/`await` sempre adia a continuação para
  // um microtask, o que quebraria a asserção síncrona logo após o clique nos
  // testes de regressão. Só quando há alteração pendente ela devolve a
  // Promise do diálogo de confirmação.
  const confirmNavigation = useCallback(() => {
    const isDirty = lerGuardComFailSecure(guardRef.current);
    if (!isDirty) return true;

    return showConfirm({
      title: 'Sair sem salvar?',
      text: 'Há alterações não salvas nesta tela. Se você sair agora, elas serão perdidas.',
      confirmButtonText: 'Sair sem salvar',
      cancelButtonText: 'Continuar editando',
    })
      .then(result => Boolean(result.isConfirmed))
      .catch(() => false);
  }, [showConfirm]);

  useEffect(() => {
    if (!isDirtyRegistrado) return undefined;

    const handleBeforeUnload = event => {
      event.preventDefault();
      // Legado de navegadores antigos: alguns só exibem o aviso nativo
      // quando `returnValue` é atribuído.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirtyRegistrado]);

  const value = { setGuard, clearGuard, confirmNavigation };

  return (
    <UnsavedChangesGuardContext.Provider value={value}>
      {children}
    </UnsavedChangesGuardContext.Provider>
  );
};
