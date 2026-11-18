import axios from 'axios';
import { AuthenticatedApi } from './authenticatedApi';
import { setSession, clearSession } from './sessionManager';

jest.mock('axios');
jest.mock('./baseApi', () => {
  return {
    BaseApi: class {
      constructor() {
        this.api = axios.create();
      }
    },
  };
});

describe('AuthenticatedApi', () => {
  let interceptorFn;
  let getItemSpy;

  beforeEach(() => {
    interceptorFn = undefined;
    axios.create.mockReturnValue({
      interceptors: {
        request: {
          use: jest.fn(fn => {
            interceptorFn = fn;
          }),
        },
        response: { use: jest.fn() },
      },
    });
    clearSession();
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
  });

  afterEach(() => {
    getItemSpy.mockRestore();
  });

  it('registra o interceptor de request no construtor', () => {
    new AuthenticatedApi();
    expect(interceptorFn).toBeInstanceOf(Function);
  });

  it('lê o acesso a cada requisição, na mesma instância', () => {
    const apiInstance = new AuthenticatedApi();
    setSession({ accessToken: 't1', userId: 'u-1' });
    expect(interceptorFn({ headers: {} }).headers.Authorization).toBe(
      'Bearer t1'
    );
    setSession({ accessToken: 't2', userId: 'u-1' });
    expect(interceptorFn({ headers: {} }).headers.Authorization).toBe(
      'Bearer t2'
    );
    expect(apiInstance.token).toBeUndefined();
  });

  it('sem sessão não envia Authorization', () => {
    new AuthenticatedApi();
    expect(
      interceptorFn({ headers: {} }).headers.Authorization
    ).toBeUndefined();
  });

  it('isAuthenticated deriva do módulo: true com sessão, false após clearSession', () => {
    const apiInstance = new AuthenticatedApi();
    expect(apiInstance.isAuthenticated()).toBe(false);
    setSession({ accessToken: 'tokenzinho', userId: 'u-1' });
    expect(apiInstance.isAuthenticated()).toBe(true);
    clearSession();
    expect(apiInstance.isAuthenticated()).toBe(false);
  });

  it('não lê localStorage na construção nem na requisição (com controle positivo)', () => {
    setSession({ accessToken: 't1', userId: 'u-1' });
    const apiInstance = new AuthenticatedApi();
    interceptorFn({ headers: {} });
    apiInstance.isAuthenticated();
    expect(getItemSpy).not.toHaveBeenCalled();

    localStorage.getItem('qualquer');
    expect(getItemSpy).toHaveBeenCalledTimes(1);
  });
});
