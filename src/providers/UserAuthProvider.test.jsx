import React, { StrictMode } from 'react';
import { AxiosError } from 'axios';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { UserAuthProvider, useUserAuth } from './UserAuthProvider';
import { SESSION_END_REASON, SESSION_EVENT, SESSION_STATUS } from '@/constants';
import { AuthApi } from '@/store/api/authApi';
import {
  clearSession,
  emitSessionEvent,
  getAccessToken,
  getUserId,
  setSession,
} from '@/store/api/sessionManager';
import { clearAppCache } from '@/utils/appCache';
import { clearPendingExit, watchPendingExit } from '@/utils/sessionChannel';

jest.mock('@/utils/appCache', () => ({ clearAppCache: jest.fn() }));
jest.mock('@/utils/sessionChannel', () => {
  const real = jest.requireActual('@/utils/sessionChannel');
  return {
    ...real,
    clearPendingExit: jest.fn(real.clearPendingExit),
    watchPendingExit: jest.fn(() => jest.fn()),
  };
});

const wrapper = ({ children }) => (
  <UserAuthProvider>{children}</UserAuthProvider>
);

const RESTAURADA = {
  data: {
    accessToken: 'novo',
    user: { id: 'u1', nome: 'Ana', permissao: 'admin' },
    configuracao: {
      duracaoAula: 50,
      tolerancia: 10,
      diasDeFuncionamento: ['SEGUNDA'],
    },
  },
};

function recusa(status) {
  return new AxiosError('x', 'E', {}, null, {
    status,
    data: {},
    headers: {},
    config: {},
  });
}

// Erro de transporte: sem `response` (o ambiente é provado nos casos de rede).
function semResposta() {
  const erro = new AxiosError('Network Error', 'ERR_NETWORK');
  expect(erro.response).toBeUndefined();
  return erro;
}

// A renovação em voo é do módulo (single-flight): uma promessa que nunca
// resolve contaminaria os testes seguintes, então o afterEach a resolve.
const pendencias = [];
function pendurar(spy) {
  spy.mockReturnValueOnce(
    new Promise(resolve => {
      pendencias.push(resolve);
    })
  );
}

async function montar(opcoes = {}) {
  const hook = renderHook(() => useUserAuth(), { wrapper, ...opcoes });
  await act(async () => {});
  return hook;
}

const DADOS = {
  accessToken: 'tok-1',
  currentUser: { id: 'u-1', permissao: 'admin' },
  duracaoAula: 50,
  tolerancia: 10,
  diasDeFuncionamento: ['SEGUNDA'],
};

describe('UserAuthProvider (provider real)', () => {
  let refreshToken;

  beforeEach(() => {
    clearSession();
    localStorage.clear();
    jest.clearAllMocks();
    refreshToken = jest
      .spyOn(AuthApi.prototype, 'refreshToken')
      .mockRejectedValue(recusa(401));
  });

  afterEach(async () => {
    await act(async () => {
      pendencias.splice(0).forEach(resolve => resolve(RESTAURADA));
    });
    refreshToken.mockRestore();
  });

  it('estado inicial literal: restoring, isAuthenticated pendente e sem usuário na memória', async () => {
    pendurar(refreshToken);
    const { result } = renderHook(() => useUserAuth(), { wrapper });
    expect(result.current.currentUser).toBeNull();
    expect(result.current.settings).toEqual({
      duracaoAula: null,
      tolerancia: null,
      diasDeFuncionamento: [],
    });
    expect(result.current.sessionStatus).toBe(SESSION_STATUS.RESTORING);
    expect(result.current.endReason).toBe(SESSION_END_REASON.NUNCA);
    expect(getUserId()).toBeNull();
    expect('refreshToken' in result.current).toBe(false);
    expect(Object.keys(result.current).sort()).toEqual(
      [
        'currentUser',
        'settings',
        'sessionStatus',
        'endReason',
        'authenticate',
        'removeAuthenticate',
        'retryRestore',
        'isAuthenticated',
        'isAdmin',
      ].sort()
    );
    let resolvido = false;
    result.current.isAuthenticated().then(() => {
      resolvido = true;
    });
    await act(async () => {});
    expect(resolvido).toBe(false);
  });

  it('authenticate guarda em memória, entrega o acesso ao sessionManager e não grava storage', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const { result } = await montar();
    await act(async () => {
      result.current.authenticate(DADOS);
    });
    expect(result.current.currentUser).toEqual(DADOS.currentUser);
    expect(result.current.settings).toEqual({
      duracaoAula: 50,
      tolerancia: 10,
      diasDeFuncionamento: ['SEGUNDA'],
    });
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);
    expect(getAccessToken()).toBe('tok-1');
    expect(getUserId()).toBe('u-1');
    expect(await result.current.isAuthenticated()).toBe(true);
    expect(clearAppCache).toHaveBeenCalledTimes(1);
    expect(setItemSpy).not.toHaveBeenCalled();

    localStorage.setItem('x', 'y');
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    setItemSpy.mockRestore();
  });

  it('removeAuthenticate encerra em memória com o motivo padrão e com motivo explícito', async () => {
    const { result } = await montar();
    await act(async () => {
      result.current.authenticate(DADOS);
    });
    await act(async () => {
      result.current.removeAuthenticate();
    });
    expect(result.current.currentUser).toBeNull();
    expect(result.current.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
    expect(result.current.endReason).toBe(SESSION_END_REASON.SAIDA);
    expect(getAccessToken()).toBeNull();
    expect(result.current.isAdmin()).toBeFalsy();
    expect(await result.current.isAuthenticated()).toBe(false);

    await act(async () => {
      result.current.authenticate(DADOS);
    });
    await act(async () => {
      result.current.removeAuthenticate(SESSION_END_REASON.EXPIRADA);
    });
    expect(result.current.endReason).toBe(SESSION_END_REASON.EXPIRADA);
  });

  it('trocar de usuário sem sair purga o cache e troca o acesso (AC-001-011)', async () => {
    const { result } = await montar();
    await act(async () => {
      result.current.authenticate(DADOS);
    });
    clearAppCache.mockClear();
    await act(async () => {
      result.current.authenticate({
        ...DADOS,
        accessToken: 'tok-b',
        currentUser: { id: 'u-b', permissao: 'user' },
      });
    });
    expect(clearAppCache).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('tok-b');
    expect(getUserId()).toBe('u-b');
    expect(result.current.isAdmin()).toBe(false);
  });

  it('authenticate sem accessToken preserva o acesso já entregue ao sessionManager', async () => {
    const { accessToken: _omitido, ...semToken } = DADOS;
    const { result } = await montar();
    setSession({ accessToken: 'tok-thunk', userId: null });
    await act(async () => {
      result.current.authenticate(semToken);
    });
    expect(getAccessToken()).toBe('tok-thunk');
    expect(getUserId()).toBe(DADOS.currentUser.id);
  });

  describe('saída pendente (FR-002-017)', () => {
    it('authenticate limpa a marca de saída pendente', async () => {
      localStorage.setItem('bls-saida-pendente', '1');
      const { result } = await montar();

      act(() => {
        result.current.authenticate(DADOS);
      });

      expect(clearPendingExit).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('bls-saida-pendente')).toBeNull();
    });

    it('registra watchPendingExit na montagem e cancela no unmount', async () => {
      const cancelar = jest.fn();
      watchPendingExit.mockReturnValueOnce(cancelar);
      const { unmount } = await montar();

      expect(watchPendingExit).toHaveBeenCalledTimes(1);
      expect(cancelar).not.toHaveBeenCalled();
      unmount();
      expect(cancelar).toHaveBeenCalledTimes(1);
    });
  });

  describe('restauração ao abrir (AC-002-008, AC-002-009, AC-002-025, AC-002-034)', () => {
    it('sucesso: AUTHENTICATED com usuário e configurações do servidor; token só no sessionManager', async () => {
      refreshToken.mockResolvedValue(RESTAURADA);
      const { result } = renderHook(() => useUserAuth(), { wrapper });
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.RESTORING);
      expect(getUserId()).toBeNull();
      const pendente = result.current.isAuthenticated();

      await waitFor(() =>
        expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED)
      );
      expect(await pendente).toBe(true);
      expect(result.current.currentUser).toEqual(RESTAURADA.data.user);
      expect(result.current.settings).toEqual({
        duracaoAula: 50,
        tolerancia: 10,
        diasDeFuncionamento: ['SEGUNDA'],
      });
      expect(result.current.isAdmin()).toBe(true);
      expect(getAccessToken()).toBe('novo');
      expect(await result.current.isAuthenticated()).toBe(true);
      expect(JSON.stringify(result.current)).not.toContain('novo');
    });

    it('configuracao null: settings vazias de hoje', async () => {
      refreshToken.mockResolvedValue({
        data: { ...RESTAURADA.data, configuracao: null },
      });
      const { result } = await montar();
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);
      expect(result.current.settings).toEqual({
        duracaoAula: null,
        tolerancia: null,
        diasDeFuncionamento: [],
      });
    });

    it.each([401, 403])(
      'recusa %s: ANONYMOUS, endReason nunca, sem usuário',
      async status => {
        refreshToken.mockRejectedValue(recusa(status));
        const { result } = await montar();
        expect(result.current.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
        expect(result.current.endReason).toBe(SESSION_END_REASON.NUNCA);
        expect(result.current.currentUser).toBeNull();
        expect(await result.current.isAuthenticated()).toBe(false);
      }
    );

    it.each([
      ['ausência de resposta', semResposta],
      ['500', () => recusa(500)],
    ])(
      '%s: UNAVAILABLE, nunca ANONYMOUS, sessão não limpa',
      async (_n, falha) => {
        refreshToken.mockRejectedValue(falha());
        const { result } = await montar();
        expect(result.current.sessionStatus).toBe(SESSION_STATUS.UNAVAILABLE);
        expect(result.current.endReason).toBe(SESSION_END_REASON.NUNCA);
        expect(result.current.currentUser).toBeNull();
        expect(await result.current.isAuthenticated()).toBe(false);
      }
    );

    it('sob StrictMode o refreshToken é chamado exatamente 1 vez e o resultado é aplicado', async () => {
      refreshToken.mockResolvedValue(RESTAURADA);
      const { result } = await montar({
        wrapper: ({ children }) => (
          <StrictMode>
            <UserAuthProvider>{children}</UserAuthProvider>
          </StrictMode>
        ),
      });
      expect(refreshToken).toHaveBeenCalledTimes(1);
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);
      expect(result.current.currentUser).toEqual(RESTAURADA.data.user);
    });

    it('resposta que chega depois do unmount não age', async () => {
      let resolver;
      refreshToken.mockReturnValue(
        new Promise(r => {
          resolver = r;
        })
      );
      const { result, unmount } = renderHook(() => useUserAuth(), { wrapper });
      unmount();
      await act(async () => {
        resolver(RESTAURADA);
      });
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.RESTORING);
    });
  });

  describe('credencial legada (AC-002-014)', () => {
    const LEGADO = JSON.stringify({
      accessToken: 'legado',
      currentUser: { id: 'x', nome: 'Legado' },
    });

    it.each([
      [
        'restauração recusada',
        () => refreshToken.mockRejectedValue(recusa(401)),
      ],
      ['restauração ok', () => refreshToken.mockResolvedValue(RESTAURADA)],
    ])(
      'remove token e settings sem lê-los e nunca assume o usuário legado (%s)',
      async (_n, preparar) => {
        preparar();
        localStorage.setItem('token', LEGADO);
        localStorage.setItem('settings', '{"duracaoAula":1}');
        const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
        const usuarios = [];
        function Sonda() {
          usuarios.push(useUserAuth().currentUser);
          return null;
        }
        render(
          <UserAuthProvider>
            <Sonda />
          </UserAuthProvider>
        );
        await act(async () => {});

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('settings')).toBeNull();
        // o próprio getItem acima é o controle positivo do espião
        const chaves = getItemSpy.mock.calls.map(([chave]) => chave);
        expect(chaves.filter(c => c === 'token')).toHaveLength(1);
        expect(chaves.filter(c => c === 'settings')).toHaveLength(1);
        expect(usuarios.some(u => u?.nome === 'Legado')).toBe(false);
        getItemSpy.mockRestore();
      }
    );

    it('falha de acesso ao storage na remoção não derruba a montagem', async () => {
      const removeSpy = jest
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('bloqueado');
        });
      const { result } = await montar();
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
      removeSpy.mockRestore();
    });
  });

  describe('marca de saída pendente (AC-002-022, FR-002-017)', () => {
    it('com marca (valor "0") não renova, vai a ANONYMOUS/NUNCA e a marca segue presente', async () => {
      localStorage.setItem('bls-saida-pendente', '0');
      refreshToken.mockResolvedValue(RESTAURADA);
      const { result } = await montar();
      expect(refreshToken).not.toHaveBeenCalled();
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
      expect(result.current.endReason).toBe(SESSION_END_REASON.NUNCA);
      expect(localStorage.getItem('bls-saida-pendente')).toBe('0');
    });

    it('sem marca o mesmo cenário renova 1 vez e a restauração bem-sucedida não limpa marca alguma', async () => {
      refreshToken.mockResolvedValue(RESTAURADA);
      const { result } = await montar();
      expect(refreshToken).toHaveBeenCalledTimes(1);
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);
      expect(clearPendingExit).not.toHaveBeenCalled();
      expect(clearAppCache).not.toHaveBeenCalled();
    });
  });

  describe('indisponibilidade e recuperação (AC-002-026, FR-002-020)', () => {
    it('retryRestore: UNAVAILABLE -> RESTORING -> AUTHENTICATED; nova falha volta a UNAVAILABLE', async () => {
      refreshToken.mockRejectedValue(semResposta());
      const { result } = await montar();
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.UNAVAILABLE);

      let liberar;
      refreshToken.mockReturnValueOnce(new Promise(r => (liberar = r)));
      act(() => {
        result.current.retryRestore();
      });
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.RESTORING);
      await act(async () => {
        liberar(RESTAURADA);
      });
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);
    });

    it('retryRestore com nova falha de rede volta a UNAVAILABLE', async () => {
      refreshToken.mockRejectedValue(semResposta());
      const { result } = await montar();
      await act(async () => {
        result.current.retryRestore();
      });
      expect(refreshToken).toHaveBeenCalledTimes(2);
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.UNAVAILABLE);
    });

    it('retryRestore fora de UNAVAILABLE é no-op (autenticada e anônima)', async () => {
      refreshToken.mockResolvedValue(RESTAURADA);
      const { result } = await montar();
      refreshToken.mockClear();
      await act(async () => {
        result.current.retryRestore();
      });
      expect(refreshToken).not.toHaveBeenCalled();
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);

      refreshToken.mockRejectedValue(recusa(401));
      const anonimo = await montar();
      refreshToken.mockClear();
      await act(async () => {
        anonimo.result.current.retryRestore();
      });
      expect(refreshToken).not.toHaveBeenCalled();
    });

    it('evento real `online` em UNAVAILABLE restaura com o usuário e a configuração do servidor', async () => {
      refreshToken.mockRejectedValueOnce(semResposta());
      const { result } = await montar();
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.UNAVAILABLE);

      refreshToken.mockResolvedValue({
        data: {
          accessToken: 'outro',
          user: { id: 'u2', nome: 'Beto', permissao: 'user' },
          configuracao: {
            duracaoAula: 30,
            tolerancia: 5,
            diasDeFuncionamento: ['TERCA'],
          },
        },
      });
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);
      expect(result.current.currentUser.id).toBe('u2');
      expect(result.current.settings.duracaoAula).toBe(30);
    });

    it('RENEWED em UNAVAILABLE restaura com o payload; com a sessão AUTHENTICATED não troca currentUser', async () => {
      refreshToken.mockRejectedValue(semResposta());
      const { result } = await montar();
      await act(async () => {
        emitSessionEvent(SESSION_EVENT.RENEWED, {
          user: { id: 'u3', nome: 'Caio' },
          configuracao: null,
        });
      });
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.AUTHENTICATED);
      expect(result.current.currentUser.nome).toBe('Caio');

      await act(async () => {
        emitSessionEvent(SESSION_EVENT.RENEWED, {
          user: { id: 'u4', nome: 'Duda' },
          configuracao: null,
        });
      });
      expect(result.current.currentUser.nome).toBe('Caio');
    });

    it('RENEWED durante RESTORING e ANONYMOUS não altera o estado', async () => {
      pendurar(refreshToken);
      const { result } = renderHook(() => useUserAuth(), { wrapper });
      await act(async () => {
        emitSessionEvent(SESSION_EVENT.RENEWED, { user: { id: 'u5' } });
      });
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.RESTORING);
      expect(result.current.currentUser).toBeNull();
    });

    it('EXPIRED com a sessão AUTHENTICATED -> ANONYMOUS/EXPIRADA e sem usuário', async () => {
      refreshToken.mockResolvedValue(RESTAURADA);
      const { result } = await montar();
      await act(async () => {
        emitSessionEvent(SESSION_EVENT.EXPIRED);
      });
      expect(result.current.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
      expect(result.current.endReason).toBe(SESSION_END_REASON.EXPIRADA);
      expect(result.current.currentUser).toBeNull();
      expect(await result.current.isAuthenticated()).toBe(false);
    });

    it('EXPIRED com a sessão já encerrada por saída não sobrescreve o motivo', async () => {
      refreshToken.mockResolvedValue(RESTAURADA);
      const { result } = await montar();
      await act(async () => {
        result.current.removeAuthenticate(SESSION_END_REASON.SAIDA);
      });
      await act(async () => {
        emitSessionEvent(SESSION_EVENT.EXPIRED);
      });
      expect(result.current.endReason).toBe(SESSION_END_REASON.SAIDA);
    });
  });
});
