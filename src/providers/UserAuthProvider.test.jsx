import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { UserAuthProvider, useUserAuth } from './UserAuthProvider';
import { SESSION_END_REASON, SESSION_STATUS } from '@/constants';
import {
  clearSession,
  getAccessToken,
  getUserId,
} from '@/store/api/sessionManager';
import { clearAppCache } from '@/utils/appCache';

jest.mock('@/utils/appCache', () => ({ clearAppCache: jest.fn() }));

const wrapper = ({ children }) => (
  <UserAuthProvider>{children}</UserAuthProvider>
);

const DADOS = {
  accessToken: 'tok-1',
  currentUser: { id: 'u-1', permissao: 'admin' },
  duracaoAula: 50,
  tolerancia: 10,
  diasDeFuncionamento: ['SEGUNDA'],
};

describe('UserAuthProvider (provider real)', () => {
  beforeEach(() => {
    clearSession();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('estado inicial literal', async () => {
    const { result } = renderHook(() => useUserAuth(), { wrapper });
    expect(result.current.currentUser).toBeNull();
    expect(result.current.settings).toEqual({
      duracaoAula: null,
      tolerancia: null,
      diasDeFuncionamento: [],
    });
    expect(result.current.sessionStatus).toBe(SESSION_STATUS.ANONYMOUS);
    expect(result.current.endReason).toBe(SESSION_END_REASON.NUNCA);
    expect(await result.current.isAuthenticated()).toBe(false);
    expect('refreshToken' in result.current).toBe(false);
  });

  it('ignora a chave legada `token` e não lê storage no primeiro render', () => {
    localStorage.setItem(
      'token',
      JSON.stringify({ accessToken: 'legado', currentUser: { id: 'x' } })
    );
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    const renders = [];
    function Sonda() {
      const ctx = useUserAuth();
      renders.push(ctx.currentUser);
      return null;
    }
    render(
      <UserAuthProvider>
        <Sonda />
      </UserAuthProvider>
    );
    expect(renders[0]).toBeNull();
    expect(getItemSpy).not.toHaveBeenCalled();

    localStorage.getItem('controle');
    expect(getItemSpy).toHaveBeenCalledTimes(1);
    getItemSpy.mockRestore();
  });

  it('authenticate guarda em memória, entrega o acesso ao sessionManager e não grava storage', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useUserAuth(), { wrapper });
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
    const { result } = renderHook(() => useUserAuth(), { wrapper });
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
    const { result } = renderHook(() => useUserAuth(), { wrapper });
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
});
