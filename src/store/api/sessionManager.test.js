import { AxiosError } from 'axios';
import {
  RENEW_FAILURE,
  SESSION_END_REASON,
  SESSION_EVENT,
  SESSION_STATUS,
} from '@/constants';
import { AuthApi } from './authApi';
import {
  clearSession,
  emitSessionEvent,
  getAccessToken,
  getSessionEpoch,
  getUserId,
  renew,
  setSession,
  subscribe,
} from './sessionManager';

jest.mock('@/utils/reloadPage');

function valoresDeWindow() {
  return Object.keys(window).map(chave => {
    try {
      return window[chave];
    } catch {
      return undefined;
    }
  });
}

describe('sessionManager', () => {
  beforeEach(() => {
    clearSession();
  });

  it('setSession guarda acesso e identidade', () => {
    setSession({ accessToken: 'tok-1', userId: 'u-1' });
    expect(getAccessToken()).toBe('tok-1');
    expect(getUserId()).toBe('u-1');
  });

  it('clearSession zera ambos e sobe a época exatamente 1 por chamada; setSession não a altera', () => {
    const inicial = getSessionEpoch();
    setSession({ accessToken: 'tok-1', userId: 'u-1' });
    expect(getSessionEpoch()).toBe(inicial);
    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getUserId()).toBeNull();
    expect(getSessionEpoch()).toBe(inicial + 1);
    clearSession();
    expect(getSessionEpoch()).toBe(inicial + 2);
  });

  it('subscribe recebe o payload emitido e para após o cancelamento', () => {
    const cb = jest.fn();
    const cancelar = subscribe(SESSION_EVENT.EXPIRED, cb);
    emitSessionEvent(SESSION_EVENT.EXPIRED, { x: 1 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ x: 1 });
    cancelar();
    emitSessionEvent(SESSION_EVENT.EXPIRED, { x: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('o assinante só recebe o evento a que se inscreveu', () => {
    const cb = jest.fn();
    const cancelar = subscribe(SESSION_EVENT.RENEWED, cb);
    emitSessionEvent(SESSION_EVENT.EXPIRED, {});
    expect(cb).not.toHaveBeenCalled();
    cancelar();
  });

  describe('constantes de sessão', () => {
    it.each([
      ['RESTORING', 'restoring'],
      ['AUTHENTICATED', 'authenticated'],
      ['ANONYMOUS', 'anonymous'],
      ['UNAVAILABLE', 'unavailable'],
    ])('SESSION_STATUS.%s', (chave, valor) => {
      expect(SESSION_STATUS[chave]).toBe(valor);
    });

    it.each([
      ['NUNCA', 'nunca'],
      ['EXPIRADA', 'expirada'],
      ['SAIDA', 'saida'],
      ['OUTRA_ABA', 'outra-aba'],
    ])('SESSION_END_REASON.%s', (chave, valor) => {
      expect(SESSION_END_REASON[chave]).toBe(valor);
    });

    it.each([
      ['EXPIRED', 'expired'],
      ['IDENTITY_CHANGED', 'identity-changed'],
      ['RENEWED', 'renewed'],
    ])('SESSION_EVENT.%s', (chave, valor) => {
      expect(SESSION_EVENT[chave]).toBe(valor);
    });

    it('não há valores além dos prescritos', () => {
      expect(Object.keys(SESSION_STATUS)).toHaveLength(4);
      expect(Object.keys(SESSION_END_REASON)).toHaveLength(4);
      expect(Object.keys(SESSION_EVENT)).toHaveLength(3);
    });
  });

  describe('o acesso não está onde um script o leia', () => {
    it('não grava em storage (controle: setItem direto é contado)', () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem');
      setSession({ accessToken: 'tok-1', userId: 'u-1' });
      expect(spy).not.toHaveBeenCalled();

      localStorage.setItem('x', 'y');
      sessionStorage.setItem('x', 'y');
      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockRestore();
      localStorage.removeItem('x');
      sessionStorage.removeItem('x');
    });

    it('não vai a document.cookie (controle: escrita direta altera)', () => {
      setSession({ accessToken: 'tok-1', userId: 'u-1' });
      expect(document.cookie).not.toContain('tok-1');

      document.cookie = 'a=b';
      expect(document.cookie).toContain('a=b');
      document.cookie = 'a=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });

    it('nenhum valor enumerável de window é o acesso (controle: window.__prova é detectado)', () => {
      setSession({ accessToken: 'tok-1', userId: 'u-1' });
      expect(valoresDeWindow()).not.toContain('tok-1');

      window.__prova = 'tok-1';
      expect(valoresDeWindow()).toContain('tok-1');
      delete window.__prova;
    });
  });

  describe('evento fora de SESSION_EVENT', () => {
    it('subscribe e emitSessionEvent lançam erro de programação', () => {
      expect(() => subscribe('expirou', jest.fn())).toThrow();
      expect(() => emitSessionEvent('expirou', {})).toThrow();
    });

    it('eventos válidos seguem funcionando', () => {
      const cb = jest.fn();
      const cancelar = subscribe(SESSION_EVENT.RENEWED, cb);
      emitSessionEvent(SESSION_EVENT.RENEWED, { y: 2 });
      expect(cb).toHaveBeenCalledWith({ y: 2 });
      cancelar();
    });
  });
});

describe('sessionManager: renovação', () => {
  let refresh;
  let expirou;
  let renovado;
  let cancelar;

  const ok = (id = 'u1') => ({
    data: { accessToken: 'novo', user: { id }, configuracao: { c: 1 } },
  });
  const recusa = status =>
    new AxiosError('x', 'E', {}, null, {
      status,
      data: {},
      headers: {},
      config: {},
    });
  const rede = () => new AxiosError('Network Error', 'ERR_NETWORK');
  const deferido = () => {
    let resolver;
    let rejeitar;
    const promessa = new Promise((res, rej) => {
      resolver = res;
      rejeitar = rej;
    });
    return { promessa, resolver, rejeitar };
  };
  const online = async () => {
    window.dispatchEvent(new Event('online'));
    await new Promise(r => setTimeout(r, 0));
  };

  beforeEach(() => {
    clearSession();
    setSession({ accessToken: 'velho', userId: 'u1' });
    refresh = jest.spyOn(AuthApi.prototype, 'refreshToken');
    expirou = jest.fn();
    renovado = jest.fn();
    cancelar = [
      subscribe(SESSION_EVENT.EXPIRED, expirou),
      subscribe(SESSION_EVENT.RENEWED, renovado),
    ];
  });

  afterEach(async () => {
    // zera a pendência por rede deixada pelo caso, sem chamar a rede real
    refresh.mockResolvedValue(ok());
    await online();
    cancelar.forEach(c => c());
    refresh.mockRestore();
    clearSession();
  });

  it('200 grava o acesso, emite RENEWED sem o acesso e resolve com os dados', async () => {
    refresh.mockResolvedValue(ok());

    const r = await renew();

    expect(r).toEqual({
      accessToken: 'novo',
      user: { id: 'u1' },
      configuracao: { c: 1 },
    });
    expect(getAccessToken()).toBe('novo');
    expect(renovado).toHaveBeenCalledTimes(1);
    expect(renovado.mock.calls[0][0]).toEqual({
      user: { id: 'u1' },
      configuracao: { c: 1 },
    });
    expect(Object.keys(renovado.mock.calls[0][0])).not.toContain('accessToken');
  });

  it('chamadas simultâneas compartilham uma só renovação', async () => {
    refresh.mockResolvedValue(ok());
    await Promise.all([renew(), renew(), renew()]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])(
    '%s limpa a sessão e emite EXPIRED uma vez',
    async status => {
      refresh.mockRejectedValue(recusa(status));

      await expect(renew()).rejects.toMatchObject({
        tipo: RENEW_FAILURE.RECUSADA,
      });

      expect(getAccessToken()).toBeNull();
      expect(expirou).toHaveBeenCalledTimes(1);
    }
  );

  it('recusa sem sessão prévia não emite EXPIRED', async () => {
    clearSession();
    refresh.mockRejectedValue(recusa(401));

    await expect(renew()).rejects.toMatchObject({
      tipo: RENEW_FAILURE.RECUSADA,
    });

    expect(expirou).not.toHaveBeenCalled();
  });

  it('sem resposta é REDE e não encerra a sessão (ambiente prova a si mesmo)', async () => {
    const falha = rede();
    refresh.mockRejectedValue(falha);

    const r = await renew().catch(e => e);

    expect(r.tipo).toBe(RENEW_FAILURE.REDE);
    expect(r.error.response).toBeUndefined();
    expect(getAccessToken()).toBe('velho');
    expect(expirou).not.toHaveBeenCalled();
  });

  it.each([500, 400])('%s é FALHA, sem limpar a sessão', async status => {
    refresh.mockRejectedValue(recusa(status));

    const r = await renew().catch(e => e);

    expect(r.tipo).toBe(RENEW_FAILURE.FALHA);
    expect(r.error.response.status).toBe(status);
    expect(getAccessToken()).toBe('velho');
    expect(expirou).not.toHaveBeenCalled();
  });

  describe('evento online', () => {
    it('após falha por rede renova uma vez e, com 200, grava o acesso novo e emite RENEWED', async () => {
      refresh.mockRejectedValueOnce(rede());
      await renew().catch(() => {});
      refresh.mockClear();
      refresh.mockResolvedValue(ok());

      await online();

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBe('novo');
      expect(renovado).toHaveBeenCalledTimes(1);
      expect(renovado.mock.calls[0][0]).toEqual({
        user: { id: 'u1' },
        configuracao: { c: 1 },
      });
    });

    it('com 401 emite EXPIRED e limpa a sessão', async () => {
      refresh.mockRejectedValueOnce(rede());
      await renew().catch(() => {});
      refresh.mockRejectedValue(recusa(401));

      await online();

      expect(expirou).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBeNull();
    });

    it('nova falha por rede mantém a pendência', async () => {
      refresh.mockRejectedValue(rede());
      await renew().catch(() => {});
      refresh.mockClear();

      await online();
      await online();

      expect(refresh).toHaveBeenCalledTimes(2);
    });

    it('sem falha por rede pendente não chama refreshToken (controle)', async () => {
      refresh.mockResolvedValue(ok());
      await online();
      expect(refresh).not.toHaveBeenCalled();
    });

    it('o módulo registra o ouvinte uma vez, mesmo importado duas vezes', () => {
      const espia = jest.spyOn(window, 'addEventListener');
      jest.isolateModules(() => {
        require('./sessionManager');
        require('./sessionManager');
      });
      const onlines = espia.mock.calls.filter(([nome]) => nome === 'online');
      espia.mockRestore();
      expect(onlines).toHaveLength(1);
    });
  });

  describe('corrida na troca de sessão (TRISK-003-012)', () => {
    it('clearSession durante a renovação: o 200 tardio não grava nem emite', async () => {
      const d = deferido();
      refresh.mockReturnValue(d.promessa);
      const p = renew();
      clearSession();
      d.resolver(ok());

      await expect(p).rejects.toMatchObject({ tipo: RENEW_FAILURE.RECUSADA });

      expect(getAccessToken()).toBeNull();
      expect(renovado).not.toHaveBeenCalled();
    });

    it('o 200 tardio não sobrescreve o acesso de outro usuário', async () => {
      const d = deferido();
      refresh.mockReturnValue(d.promessa);
      const p = renew();
      clearSession();
      setSession({ accessToken: 'do-outro', userId: 'u9' });
      d.resolver(ok('u9'));

      await expect(p).rejects.toMatchObject({ tipo: RENEW_FAILURE.RECUSADA });

      expect(getAccessToken()).toBe('do-outro');
      expect(renovado).not.toHaveBeenCalled();
    });
  });

  describe('identidade diferente', () => {
    it('emite IDENTITY_CHANGED, não grava o acesso, limpa a sessão e recarrega', async () => {
      const { reloadPage } = require('@/utils/reloadPage');
      reloadPage.mockClear();
      refresh.mockResolvedValue(ok('u2'));

      await expect(renew()).rejects.toMatchObject({
        tipo: RENEW_FAILURE.IDENTIDADE,
      });

      expect(getAccessToken()).toBeNull();
      expect(renovado).not.toHaveBeenCalled();
      expect(reloadPage).toHaveBeenCalledTimes(1);
    });
  });
});
