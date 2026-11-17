import { SESSION_END_REASON, SESSION_EVENT, SESSION_STATUS } from '@/constants';
import {
  clearSession,
  emitSessionEvent,
  getAccessToken,
  getSessionEpoch,
  getUserId,
  setSession,
  subscribe,
} from './sessionManager';

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
});
