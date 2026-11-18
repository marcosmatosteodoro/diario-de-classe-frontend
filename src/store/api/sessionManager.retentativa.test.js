import { AxiosError } from 'axios';
import {
  RENEW_FAILURE,
  RENEW_RETRY_DELAYS_MS,
  SESSION_EVENT,
} from '@/constants';
import { clearPendingExit, markPendingExit } from '@/utils/sessionChannel';
import { AuthApi } from './authApi';
import {
  clearSession,
  getAccessToken,
  getSessionEpoch,
  getUserId,
  renew,
  setSession,
  subscribe,
} from './sessionManager';

jest.mock('@/utils/reloadPage');

function erroHttp(status) {
  return new AxiosError('x', 'E', {}, null, {
    status,
    data: {},
    headers: {},
    config: {},
  });
}

const OK = {
  data: {
    accessToken: 'novo',
    user: { id: 'u1', nome: 'Ana' },
    configuracao: { duracaoAula: 50 },
  },
};

async function avancar(ms) {
  await jest.advanceTimersByTimeAsync(ms);
}

describe('sessionManager: re-tentativa de renovação em FALHA (DEC-005-019)', () => {
  let refreshToken;
  let expirou;
  let cancelar;

  beforeEach(() => {
    jest.useFakeTimers();
    clearSession();
    clearPendingExit();
    refreshToken = jest
      .spyOn(AuthApi.prototype, 'refreshToken')
      .mockRejectedValue(erroHttp(503));
    expirou = jest.fn();
    cancelar = subscribe(SESSION_EVENT.EXPIRED, expirou);
    setSession({ accessToken: 'tok-1', userId: 'u1' });
  });

  afterEach(() => {
    cancelar();
    clearSession();
    clearPendingExit();
    refreshToken.mockRestore();
    jest.useRealTimers();
  });

  it('constante com os intervalos literais', () => {
    expect(RENEW_RETRY_DELAYS_MS).toHaveLength(3);
    expect(RENEW_RETRY_DELAYS_MS[0]).toBe(2000);
    expect(RENEW_RETRY_DELAYS_MS[1]).toBe(4000);
    expect(RENEW_RETRY_DELAYS_MS[2]).toBe(8000);
  });

  it.each([503, 500, 502])(
    'FALHA %s mantém a sessão e não emite expired',
    async status => {
      refreshToken.mockRejectedValue(erroHttp(status));
      const epoca = getSessionEpoch();
      await expect(renew()).rejects.toMatchObject({
        tipo: RENEW_FAILURE.FALHA,
      });
      expect(getAccessToken()).toBe('tok-1');
      expect(expirou).toHaveBeenCalledTimes(0);
      expect(getSessionEpoch()).toBe(epoca);
    }
  );

  it('re-tenta em 2, 4 e 8 s, no máximo 3 vezes', async () => {
    await expect(renew()).rejects.toMatchObject({ tipo: RENEW_FAILURE.FALHA });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBeGreaterThanOrEqual(1);
    await avancar(1999);
    expect(refreshToken).toHaveBeenCalledTimes(1);
    await avancar(1);
    expect(refreshToken).toHaveBeenCalledTimes(2);
    await avancar(3999);
    expect(refreshToken).toHaveBeenCalledTimes(2);
    await avancar(1);
    expect(refreshToken).toHaveBeenCalledTimes(3);
    await avancar(7999);
    expect(refreshToken).toHaveBeenCalledTimes(3);
    await avancar(1);
    expect(refreshToken).toHaveBeenCalledTimes(4);
    await avancar(60000);
    expect(refreshToken).toHaveBeenCalledTimes(4);
    expect(jest.getTimerCount()).toBe(0);
    expect(expirou).toHaveBeenCalledTimes(0);
    expect(getAccessToken()).toBe('tok-1');
  });

  it('sucesso numa re-tentativa restaura e não agenda mais nada', async () => {
    const renewed = jest.fn();
    const off = subscribe(SESSION_EVENT.RENEWED, renewed);
    refreshToken
      .mockRejectedValueOnce(erroHttp(503))
      .mockRejectedValueOnce(erroHttp(503))
      .mockResolvedValueOnce(OK);
    await expect(renew()).rejects.toMatchObject({ tipo: RENEW_FAILURE.FALHA });
    await avancar(2000);
    await avancar(4000);
    expect(refreshToken).toHaveBeenCalledTimes(3);
    expect(renewed).toHaveBeenCalledTimes(1);
    expect(renewed).toHaveBeenCalledWith({
      user: OK.data.user,
      configuracao: OK.data.configuracao,
    });
    expect(getAccessToken()).toBe('novo');
    expect(getUserId()).toBe('u1');
    expect(jest.getTimerCount()).toBe(0);
    await avancar(60000);
    expect(refreshToken).toHaveBeenCalledTimes(3);
    off();
  });

  it('renovação externa bem-sucedida cancela o timer pendente', async () => {
    await expect(renew()).rejects.toMatchObject({ tipo: RENEW_FAILURE.FALHA });
    refreshToken.mockResolvedValueOnce(OK);
    await renew();
    expect(refreshToken).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
    await avancar(60000);
    expect(refreshToken).toHaveBeenCalledTimes(2);
  });

  describe('recusa não repete', () => {
    it.each([401, 403])(
      '%s na primeira renovação: clearSession, expired 1x, sem re-tentativa',
      async status => {
        refreshToken.mockRejectedValue(erroHttp(status));
        const epoca = getSessionEpoch();
        await expect(renew()).rejects.toMatchObject({
          tipo: RENEW_FAILURE.RECUSADA,
        });
        expect(getAccessToken()).toBeNull();
        expect(getSessionEpoch()).toBe(epoca + 1);
        expect(expirou).toHaveBeenCalledTimes(1);
        await avancar(60000);
        expect(refreshToken).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
      }
    );

    it('sem sessão em memória (restauração inicial) não emite expired', async () => {
      clearSession();
      refreshToken.mockRejectedValue(erroHttp(401));
      await expect(renew()).rejects.toMatchObject({
        tipo: RENEW_FAILURE.RECUSADA,
      });
      expect(expirou).toHaveBeenCalledTimes(0);
      await avancar(60000);
      expect(refreshToken).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('503 e depois 401 na re-tentativa: expired 1x e nada depois', async () => {
      refreshToken
        .mockRejectedValueOnce(erroHttp(503))
        .mockRejectedValueOnce(erroHttp(401));
      await expect(renew()).rejects.toMatchObject({
        tipo: RENEW_FAILURE.FALHA,
      });
      await avancar(2000);
      expect(refreshToken).toHaveBeenCalledTimes(2);
      expect(getAccessToken()).toBeNull();
      expect(expirou).toHaveBeenCalledTimes(1);
      await avancar(60000);
      expect(refreshToken).toHaveBeenCalledTimes(2);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('cancelamento e época', () => {
    it('(i) clearSession cancela o timer', async () => {
      await expect(renew()).rejects.toBeDefined();
      clearSession();
      expect(jest.getTimerCount()).toBe(0);
      await avancar(60000);
      expect(refreshToken).toHaveBeenCalledTimes(1);
    });

    it('(ii) troca de identidade cancela o timer e preserva o novo usuário', async () => {
      await expect(renew()).rejects.toBeDefined();
      setSession({ accessToken: 'tok-2', userId: 'u2' });
      expect(jest.getTimerCount()).toBe(0);
      await avancar(60000);
      expect(refreshToken).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBe('tok-2');
      expect(getUserId()).toBe('u2');
    });

    it('(iii) sem o cancelamento, o disparo confere a época e desiste', async () => {
      const espiao = jest
        .spyOn(globalThis, 'clearTimeout')
        .mockImplementation(() => {});
      await expect(renew()).rejects.toBeDefined();
      clearSession();
      setSession({ accessToken: 'tok-3', userId: 'u3' });
      await avancar(60000);
      espiao.mockRestore();
      expect(refreshToken).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBe('tok-3');
      expect(getUserId()).toBe('u3');
    });

    it('(iv) com saída pendente a FALHA não agenda', async () => {
      markPendingExit();
      await expect(renew()).rejects.toMatchObject({
        tipo: RENEW_FAILURE.FALHA,
      });
      expect(jest.getTimerCount()).toBe(0);
      await avancar(60000);
      expect(refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('evento online depois de esgotar', () => {
    async function esgotar() {
      await expect(renew()).rejects.toBeDefined();
      await avancar(14000);
      expect(refreshToken).toHaveBeenCalledTimes(4);
    }

    it('reinicia o ciclo: 1 renovação e 3 re-tentativas em 2, 4 e 8 s', async () => {
      await esgotar();
      window.dispatchEvent(new Event('online'));
      await avancar(0);
      expect(refreshToken).toHaveBeenCalledTimes(5);
      await avancar(1999);
      expect(refreshToken).toHaveBeenCalledTimes(5);
      await avancar(1);
      expect(refreshToken).toHaveBeenCalledTimes(6);
      await avancar(4000);
      expect(refreshToken).toHaveBeenCalledTimes(7);
      await avancar(8000);
      expect(refreshToken).toHaveBeenCalledTimes(8);
      await avancar(60000);
      expect(refreshToken).toHaveBeenCalledTimes(8);
    });

    it('com saída pendente o online não renova', async () => {
      await esgotar();
      markPendingExit();
      window.dispatchEvent(new Event('online'));
      await avancar(60000);
      expect(refreshToken).toHaveBeenCalledTimes(4);
    });
  });
});
