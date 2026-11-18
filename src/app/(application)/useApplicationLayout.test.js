import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { useApplicationLayout } from './useApplicationLayout';
import { SESSION_END_REASON, SESSION_STATUS } from '@/constants/session';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { clearAppCache } from '@/utils/appCache';
import { onSessionEvent } from '@/utils/sessionChannel';
import professoresReducer from '@/store/slices/professoresSlice';
import alunosReducer from '@/store/slices/alunosSlice';
import aulasReducer from '@/store/slices/aulasSlice';
import contratosReducer from '@/store/slices/contratosSlice';
import configuracaoReducer from '@/store/slices/configuracaoSlice';
import livrosReducer from '@/store/slices/livrosSlice';
import diasAulasReducer from '@/store/slices/diasAulasSlice';
import cronogramasReducer from '@/store/slices/cronogramasSlice';
import relatorioReducer from '@/store/slices/relatorioSlice';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/providers/UserAuthProvider', () => ({ useUserAuth: jest.fn() }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: jest.fn() }));
// Canário do NFR-001-005/AC-001-020: prova que o hook nunca chama
// isMobileFunction no fluxo de render/toggle (nenhum outro teste deste
// arquivo exercita este módulo).
jest.mock('@/utils/isMobileFunction', () => ({
  isMobileFunction: jest.fn(() => {
    throw new Error(
      'isMobileFunction não pode ser chamada no fluxo de render/toggle'
    );
  }),
}));
jest.mock('@/utils/appCache', () => ({ clearAppCache: jest.fn() }));
jest.mock('@/utils/sessionChannel', () => ({
  SESSION_CHANNEL_EVENT: { SAIDA: 'saida' },
  onSessionEvent: jest.fn(),
}));

const MSG_SEM_LOGIN = 'Por favor, faça login para acessar o sistema.';
const MSG_EXPIRADA = 'Sua sessão expirou. Entre novamente para continuar.';

const REDUCERS = {
  professores: professoresReducer,
  alunos: alunosReducer,
  aulas: aulasReducer,
  contratos: contratosReducer,
  configuracao: configuracaoReducer,
  livros: livrosReducer,
  diasAulas: diasAulasReducer,
  cronogramas: cronogramasReducer,
  relatorio: relatorioReducer,
};

describe('useApplicationLayout', () => {
  let routerMock, errorMock, removeAuthenticateMock, retryRestoreMock;
  let cancelarMock;

  // Retorno real do provider: as mesmas chaves que o teste do provider afirma.
  function sessao(sessionStatus, endReason = SESSION_END_REASON.NUNCA) {
    useUserAuth.mockReturnValue({
      currentUser: null,
      settings: {},
      sessionStatus,
      endReason,
      authenticate: jest.fn(),
      removeAuthenticate: removeAuthenticateMock,
      retryRestore: retryRestoreMock,
      isAuthenticated: jest.fn(),
      isAdmin: jest.fn(),
    });
  }

  beforeEach(() => {
    cancelarMock = jest.fn();
    onSessionEvent.mockReset();
    onSessionEvent.mockReturnValue(cancelarMock);
    routerMock = { push: jest.fn() };
    errorMock = jest.fn();
    removeAuthenticateMock = jest.fn();
    retryRestoreMock = jest.fn();
    require('next/navigation').useRouter.mockReturnValue(routerMock);
    useToast.mockReturnValue({ error: errorMock });
    sessao(SESSION_STATUS.AUTHENTICATED);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('inicia com a sidebar fechada', () => {
    const { result } = renderHook(() => useApplicationLayout());
    expect(result.current.sidebarExpanded.isExpanded).toBe(false);
  });

  it('alterna isExpanded ao chamar toggleSidebar, sem calcular classes', () => {
    const { result } = renderHook(() => useApplicationLayout());
    act(() => {
      result.current.toggleSidebar();
    });
    expect(result.current.sidebarExpanded).toEqual({ isExpanded: true });
  });

  it('não chama isMobileFunction no fluxo de render/toggle', () => {
    const { result } = renderHook(() => useApplicationLayout());
    expect(() => {
      act(() => {
        result.current.toggleSidebar();
      });
    }).not.toThrow();
    expect(result.current.sidebarExpanded).toEqual({ isExpanded: true });
  });

  describe('guarda de rota por estado (AC-002-007, AC-002-009, AC-002-034)', () => {
    it('RESTORING: isLoading true, sem toast e sem push', () => {
      sessao(SESSION_STATUS.RESTORING);
      const { result } = renderHook(() => useApplicationLayout());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isUnavailable).toBe(false);
      expect(errorMock).not.toHaveBeenCalled();
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it('AUTHENTICATED: isLoading false, sem toast e sem push', () => {
      const { result } = renderHook(() => useApplicationLayout());
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isUnauthorized).toBe(false);
      expect(errorMock).not.toHaveBeenCalled();
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it('ANONYMOUS + NUNCA: aviso de login 1 vez e push para /login 1 vez', () => {
      sessao(SESSION_STATUS.ANONYMOUS, SESSION_END_REASON.NUNCA);
      const { result } = renderHook(() => useApplicationLayout());
      expect(errorMock).toHaveBeenCalledTimes(1);
      expect(errorMock).toHaveBeenCalledWith(MSG_SEM_LOGIN);
      expect(routerMock.push).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/login');
      expect(clearAppCache).not.toHaveBeenCalled();
      expect(result.current.isUnauthorized).toBe(true);
    });

    it('ANONYMOUS + EXPIRADA: aviso de expiração 1 vez, clearAppCache 1 vez e push', () => {
      sessao(SESSION_STATUS.ANONYMOUS, SESSION_END_REASON.EXPIRADA);
      renderHook(() => useApplicationLayout());
      expect(errorMock).toHaveBeenCalledTimes(1);
      expect(errorMock).toHaveBeenCalledWith(MSG_EXPIRADA);
      expect(clearAppCache).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/login');
    });

    it('SAIDA: só push para /login, sem toast e sem clearAppCache (controle positivo da guarda real)', () => {
      sessao(SESSION_STATUS.ANONYMOUS, SESSION_END_REASON.SAIDA);
      renderHook(() => useApplicationLayout());
      expect(routerMock.push).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/login');
      expect(errorMock).not.toHaveBeenCalled();
      expect(clearAppCache).not.toHaveBeenCalled();
    });

    it('OUTRA_ABA: push para /login sem toast', () => {
      sessao(SESSION_STATUS.ANONYMOUS, SESSION_END_REASON.OUTRA_ABA);
      renderHook(() => useApplicationLayout());
      expect(routerMock.push).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/login');
      expect(errorMock).not.toHaveBeenCalled();
      expect(clearAppCache).not.toHaveBeenCalled();
    });

    it('UNAVAILABLE: isUnavailable true, sem toast e sem push; retryRestore é o do provider', () => {
      sessao(SESSION_STATUS.UNAVAILABLE);
      const { result } = renderHook(() => useApplicationLayout());
      expect(result.current.isUnavailable).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(errorMock).not.toHaveBeenCalled();
      expect(routerMock.push).not.toHaveBeenCalled();
      result.current.retryRestore();
      expect(retryRestoreMock).toHaveBeenCalledTimes(1);
    });

    it('retorna exatamente as chaves do contrato', () => {
      const { result } = renderHook(() => useApplicationLayout());
      expect(Object.keys(result.current).sort()).toEqual(
        [
          'isUnauthorized',
          'isLoading',
          'isUnavailable',
          'retryRestore',
          'sidebarExpanded',
          'toggleSidebar',
        ].sort()
      );
    });

    it('em StrictMode com o estado final EXPIRADA o aviso e o push ocorrem 1 vez', () => {
      sessao(SESSION_STATUS.ANONYMOUS, SESSION_END_REASON.EXPIRADA);
      renderHook(() => useApplicationLayout(), { wrapper: StrictMode });
      expect(errorMock).toHaveBeenCalledTimes(1);
      expect(clearAppCache).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledTimes(1);
    });

    it('reage a cada fim de sessão pela transição, comparando com o valor anterior', () => {
      const { rerender } = renderHook(() => useApplicationLayout());
      expect(routerMock.push).not.toHaveBeenCalled();

      sessao(SESSION_STATUS.ANONYMOUS, SESSION_END_REASON.EXPIRADA);
      rerender();
      rerender();
      expect(errorMock).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledTimes(1);

      sessao(SESSION_STATUS.AUTHENTICATED, SESSION_END_REASON.EXPIRADA);
      rerender();
      sessao(SESSION_STATUS.ANONYMOUS, SESSION_END_REASON.EXPIRADA);
      rerender();
      expect(errorMock).toHaveBeenCalledTimes(2);
      expect(routerMock.push).toHaveBeenCalledTimes(2);
    });
  });

  describe('nenhum slice com 401 desloga sozinho (observador removido)', () => {
    it.each(Object.keys(REDUCERS))(
      'slice %s com statusError 401 não encerra a sessão, não avisa e não navega',
      chave => {
        const inicial = REDUCERS[chave](undefined, { type: '@@init' });
        const store = configureStore({
          reducer: REDUCERS,
          preloadedState: { [chave]: { ...inicial, statusError: 401 } },
        });
        expect(store.getState()[chave].statusError).toBe(401);

        renderHook(() => useApplicationLayout(), {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        });

        expect(removeAuthenticateMock).not.toHaveBeenCalled();
        expect(clearAppCache).not.toHaveBeenCalled();
        expect(errorMock).not.toHaveBeenCalled();
        expect(routerMock.push).not.toHaveBeenCalled();
      }
    );
  });

  describe('saída vinda de outra aba (AC-002-023)', () => {
    function capturarCallback() {
      return onSessionEvent.mock.calls[onSessionEvent.mock.calls.length - 1][0];
    }

    it('saida só encerra com motivo outra-aba: o efeito não navega nem avisa', () => {
      renderHook(() => useApplicationLayout());
      capturarCallback()('saida');

      expect(removeAuthenticateMock).toHaveBeenCalledTimes(1);
      expect(removeAuthenticateMock).toHaveBeenCalledWith(
        SESSION_END_REASON.OUTRA_ABA
      );
      expect(routerMock.push).not.toHaveBeenCalled();
      expect(errorMock).not.toHaveBeenCalled();
    });

    it('tipo desconhecido não encerra a sessão', () => {
      renderHook(() => useApplicationLayout());
      capturarCallback()('outra-coisa');
      expect(removeAuthenticateMock).not.toHaveBeenCalled();
    });

    it('cancela a assinatura no unmount', () => {
      const { unmount } = renderHook(() => useApplicationLayout());
      expect(cancelarMock).not.toHaveBeenCalled();
      unmount();
      expect(cancelarMock).toHaveBeenCalledTimes(1);
    });

    it('em StrictMode a montagem dupla registra e cancela sem duplicar a ação', () => {
      renderHook(() => useApplicationLayout(), { wrapper: StrictMode });

      expect(onSessionEvent).toHaveBeenCalledTimes(2);
      expect(cancelarMock).toHaveBeenCalledTimes(1);

      capturarCallback()('saida');
      expect(removeAuthenticateMock).toHaveBeenCalledTimes(1);
    });
  });
});
