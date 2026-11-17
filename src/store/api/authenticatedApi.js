import { RENEW_FAILURE } from '@/constants/session';
import { BaseApi } from './baseApi';
import { expireSession, getAccessToken, renew } from './sessionManager';

const REPETIDA = Symbol('requisicaoRepetida');

export class AuthenticatedApi extends BaseApi {
  constructor() {
    super();
    this.addTokenInterceptor();
    this.addRenewInterceptor();
  }

  addTokenInterceptor() {
    this.api.interceptors.request.use(config => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Só esta classe renova (DEC-003-012): AuthApi herda BaseApi e fica sem
  // interceptor, então entrar, renovar e sair nunca disparam renovação.
  addRenewInterceptor() {
    this.api.interceptors.response.use(
      response => response,
      error => this.tratarRecusa(error)
    );
  }

  async tratarRecusa(error) {
    const config = error?.config;
    if (error?.response?.status !== 401 || !config || config[REPETIDA]) {
      throw error;
    }
    const atual = getAccessToken();
    if (atual === null) throw error;

    const usado = config.headers?.Authorization ?? null;
    if (usado === `Bearer ${atual}`) {
      try {
        await renew();
      } catch (falha) {
        throw this.erroDaRenovacao(error, falha);
      }
    }
    return this.repetir(config);
  }

  erroDaRenovacao(original, falha) {
    if (falha?.tipo === RENEW_FAILURE.RECUSADA) {
      original.sessionExpired = true;
      return original;
    }
    if (falha?.tipo === RENEW_FAILURE.IDENTIDADE) {
      const erro = new Error('Identidade da sessão alterada');
      erro.identidadeAlterada = true;
      return erro;
    }
    return falha?.error ?? original;
  }

  async repetir(config) {
    config[REPETIDA] = true;
    try {
      return await this.api.request(config);
    } catch (error) {
      if (error?.response?.status === 401) {
        expireSession();
        error.sessionExpired = true;
      }
      throw error;
    }
  }

  isAuthenticated() {
    return Boolean(getAccessToken());
  }
}
