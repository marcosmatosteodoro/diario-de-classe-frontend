import { renderHook, act } from '@testing-library/react';
import { useLogout } from './useLogout';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { SESSION_END_REASON } from '@/constants/session';
import { clearAllFilters } from '@/utils/filterStorage';
import { clearAppCache } from '@/utils/appCache';
import {
  clearPendingExit,
  markPendingExit,
  postSessionEvent,
} from '@/utils/sessionChannel';
import { logout, clearStatus } from '@/store/slices/authSlice';

jest.mock('react-redux', () => ({ useDispatch: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('@/providers/UserAuthProvider', () => ({ useUserAuth: jest.fn() }));
jest.mock('@/store/slices/authSlice', () => ({
  logout: jest.fn(() => ({ type: 'auth/logout' })),
  clearStatus: jest.fn(() => ({ type: 'auth/clearStatus' })),
}));
jest.mock('@/utils/filterStorage', () => ({ clearAllFilters: jest.fn() }));
jest.mock('@/utils/appCache', () => ({ clearAppCache: jest.fn() }));
jest.mock('@/utils/sessionChannel', () => ({
  SESSION_CHANNEL_EVENT: { SAIDA: 'saida' },
  clearPendingExit: jest.fn(),
  markPendingExit: jest.fn(),
  postSessionEvent: jest.fn(),
}));

const MSG_NAO_CONFIRMADA =
  'Você saiu neste dispositivo, mas a saída no servidor não foi confirmada e será concluída na próxima conexão.';
const MSG_RECUSADA =
  'Não foi possível confirmar a saída no servidor. Entre e saia novamente se o problema persistir.';

describe('useLogout', () => {
  let routerMock, infoMock, warningMock, errorMock, removeAuthenticateMock;
  let resolverSaida, rejeitarSaida;

  // O dispatch devolve o que o thunk real devolve: uma promise com unwrap().
  beforeEach(() => {
    routerMock = { push: jest.fn() };
    infoMock = jest.fn();
    warningMock = jest.fn();
    errorMock = jest.fn();
    removeAuthenticateMock = jest.fn();

    useDispatch.mockReturnValue(action => {
      if (action.type !== 'auth/logout') return action;
      const pendente = new Promise((resolve, reject) => {
        resolverSaida = resolve;
        rejeitarSaida = reject;
      });
      return { unwrap: () => pendente };
    });
    useRouter.mockReturnValue(routerMock);
    useToast.mockReturnValue({
      info: infoMock,
      warning: warningMock,
      error: errorMock,
    });
    useUserAuth.mockReturnValue({ removeAuthenticate: removeAuthenticateMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function sair(result, desfecho) {
    let promessa;
    act(() => {
      promessa = result.current.logoutUser();
    });
    await act(async () => {
      desfecho();
      await promessa;
    });
  }

  it('limpa o status ao montar', () => {
    const dispatch = jest.fn();
    useDispatch.mockReturnValue(dispatch);
    renderHook(() => useLogout());
    expect(dispatch).toHaveBeenCalledWith(clearStatus());
  });

  it('expõe isLoggingOut no retorno real, inicialmente false', () => {
    const { result } = renderHook(() => useLogout());
    expect(result.current.isLoggingOut).toBe(false);
    expect(typeof result.current.logoutUser).toBe('function');
  });

  it('aguarda a resposta: isLoggingOut true e nada encerrado enquanto pendente', async () => {
    const { result } = renderHook(() => useLogout());
    let promessa;
    act(() => {
      promessa = result.current.logoutUser();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout.mock.calls[0]).toHaveLength(0);
    expect(result.current.isLoggingOut).toBe(true);
    expect(removeAuthenticateMock).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();

    await act(async () => {
      resolverSaida();
      await promessa;
    });
    expect(result.current.isLoggingOut).toBe(false);
    expect(removeAuthenticateMock).toHaveBeenCalledTimes(1);
  });

  it('segundo clique durante a espera não dispara outra saída', async () => {
    const { result } = renderHook(() => useLogout());
    let p1;
    act(() => {
      p1 = result.current.logoutUser();
      result.current.logoutUser();
    });
    expect(logout).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolverSaida();
      await p1;
    });
  });

  it('204: encerra a sessão, limpa, avisa, notifica as abas e vai a /login', async () => {
    const { result } = renderHook(() => useLogout());
    await sair(result, () => resolverSaida());

    expect(removeAuthenticateMock).toHaveBeenCalledTimes(1);
    expect(removeAuthenticateMock).toHaveBeenCalledWith(
      SESSION_END_REASON.SAIDA
    );
    expect(clearAllFilters).toHaveBeenCalled();
    expect(clearAppCache).toHaveBeenCalled();
    expect(clearPendingExit).toHaveBeenCalled();
    expect(infoMock).toHaveBeenCalledWith('Você saiu.');
    expect(postSessionEvent).toHaveBeenCalledWith('saida');
    expect(routerMock.push).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith('/login');
    expect(markPendingExit).not.toHaveBeenCalled();
    expect(warningMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
  });

  it.each([
    ['sem response', { message: 'Sem conexão', statusError: undefined }],
    ['500', { message: 'Erro', statusError: 500 }],
  ])(
    'falha de comunicação (%s): encerra local, grava a marca e avisa',
    async (_, payload) => {
      const { result } = renderHook(() => useLogout());
      await sair(result, () => rejeitarSaida(payload));

      expect(removeAuthenticateMock).toHaveBeenCalledWith(
        SESSION_END_REASON.SAIDA
      );
      expect(clearAllFilters).toHaveBeenCalled();
      expect(clearAppCache).toHaveBeenCalled();
      expect(markPendingExit).toHaveBeenCalledTimes(1);
      expect(postSessionEvent).toHaveBeenCalledWith('saida');
      expect(routerMock.push).toHaveBeenCalledWith('/login');
      expect(warningMock).toHaveBeenCalledWith(MSG_NAO_CONFIRMADA);
      expect(infoMock).not.toHaveBeenCalledWith('Você saiu.');
      expect(clearPendingExit).not.toHaveBeenCalled();
      expect(result.current.isLoggingOut).toBe(false);
    }
  );

  it('recusa 403: encerra local, não grava a marca e informa o erro', async () => {
    const { result } = renderHook(() => useLogout());
    await sair(result, () => rejeitarSaida({ message: 'x', statusError: 403 }));

    expect(removeAuthenticateMock).toHaveBeenCalledWith(
      SESSION_END_REASON.SAIDA
    );
    expect(markPendingExit).not.toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalledWith(MSG_RECUSADA);
    expect(warningMock).not.toHaveBeenCalled();
    expect(routerMock.push).toHaveBeenCalledWith('/login');
  });
});
