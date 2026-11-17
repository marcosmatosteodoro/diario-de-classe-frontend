import { SESSION_EVENT } from '@/constants/session';

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
