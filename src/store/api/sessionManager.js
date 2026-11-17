import { RENEW_FAILURE, SESSION_EVENT } from '@/constants/session';
import { reloadPage } from '@/utils/reloadPage';
import { AuthApi } from './authApi';

// Exceção à cadeia fixa (DEC-003-011): o acesso vive só nesta variável de
// módulo, lida pelo interceptor das Apis a cada requisição. Nunca em storage,
// cookie legível, `window` ou store Redux.
let accessToken = null;
let userId = null;
let epoch = 0;

const listeners = Object.fromEntries(
  Object.values(SESSION_EVENT).map(evento => [evento, new Set()])
);

export function getAccessToken() {
  return accessToken;
}

export function getUserId() {
  return userId;
}

export function getSessionEpoch() {
  return epoch;
}

export function setSession({ accessToken: token, userId: id }) {
  accessToken = token ?? null;
  userId = id ?? null;
}

export function clearSession() {
  accessToken = null;
  userId = null;
  epoch += 1;
}

export function subscribe(evento, callback) {
  const set = listeners[evento];
  if (!set) {
    throw new Error(`Evento de sessão desconhecido: ${evento}`);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
  };
}

export function emitSessionEvent(evento, payload) {
  const set = listeners[evento];
  if (!set) {
    throw new Error(`Evento de sessão desconhecido: ${evento}`);
  }
  [...set].forEach(callback => callback(payload));
}

export function expireSession() {
  if (accessToken === null) return;
  clearSession();
  emitSessionEvent(SESSION_EVENT.EXPIRED);
}

// Renovação pelo cookie (DEC-003-012): uma promessa compartilhada por todas as
// chamadas simultâneas. Rejeita sempre com { tipo, error } (RENEW_FAILURE).
let renovacaoEmVoo = null;
let pendentePorRede = false;

function rejeicao(tipo, error) {
  return { tipo, error };
}

async function executarRenovacao() {
  const epocaInicial = epoch;
  let resposta;
  try {
    resposta = await new AuthApi().refreshToken();
  } catch (error) {
    if (epocaInicial !== epoch) {
      throw rejeicao(RENEW_FAILURE.RECUSADA, error);
    }
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      pendentePorRede = false;
      const havia = accessToken !== null;
      clearSession();
      if (havia) emitSessionEvent(SESSION_EVENT.EXPIRED);
      throw rejeicao(RENEW_FAILURE.RECUSADA, error);
    }
    pendentePorRede = !error?.response;
    throw rejeicao(
      error?.response ? RENEW_FAILURE.FALHA : RENEW_FAILURE.REDE,
      error
    );
  }
  if (epocaInicial !== epoch) {
    throw rejeicao(RENEW_FAILURE.RECUSADA, null);
  }
  const { accessToken: novo, user, configuracao } = resposta.data;
  pendentePorRede = false;
  if (userId !== null && user?.id !== userId) {
    emitSessionEvent(SESSION_EVENT.IDENTITY_CHANGED);
    throw rejeicao(RENEW_FAILURE.IDENTIDADE, null);
  }
  setSession({ accessToken: novo, userId: user?.id });
  emitSessionEvent(SESSION_EVENT.RENEWED, { user, configuracao });
  return { accessToken: novo, user, configuracao };
}

export function renew() {
  if (renovacaoEmVoo) return renovacaoEmVoo;
  const promessa = executarRenovacao().finally(() => {
    if (renovacaoEmVoo === promessa) renovacaoEmVoo = null;
  });
  renovacaoEmVoo = promessa;
  return promessa;
}

subscribe(SESSION_EVENT.IDENTITY_CHANGED, () => {
  clearSession();
  reloadPage();
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (pendentePorRede) {
      renew().catch(() => {});
    }
  });
}
