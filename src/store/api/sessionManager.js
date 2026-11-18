import {
  RENEW_FAILURE,
  RENEW_RETRY_DELAYS_MS,
  SESSION_EVENT,
} from '@/constants/session';
import { reloadPage } from '@/utils/reloadPage';
import { hasPendingExit } from '@/utils/sessionChannel';
import { AuthApi } from './authApi';

// Exceção à cadeia fixa (DEC-003-011): o acesso vive só nesta variável de
// módulo, lida pelo interceptor das Apis a cada requisição. Nunca em storage,
// cookie legível, `window` ou store Redux.
let accessToken = null;
let userId = null;
let epoch = 0;
// A pendência por rede pertence à época da sessão que a criou: clearSession a desarma.
let pendentePorRede = false;
// Re-tentativa de FALHA (DEC-005-019): timer único no módulo, preso à época que o agendou.
let timerRetentativa = null;
let retentativasFeitas = 0;
let ciclosEsgotado = false;

function cancelarRetentativa() {
  if (timerRetentativa !== null) clearTimeout(timerRetentativa);
  timerRetentativa = null;
}

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
  const novoId = id ?? null;
  // Troca de identidade sem clearSession() prévio também encerra a época: as
  // requisições em voo do usuário anterior deixam de valer.
  if (userId !== null && novoId !== userId) {
    epoch += 1;
    cancelarRetentativa();
  }
  accessToken = token ?? null;
  userId = novoId;
}

export function clearSession() {
  accessToken = null;
  userId = null;
  epoch += 1;
  pendentePorRede = false;
  cancelarRetentativa();
  retentativasFeitas = 0;
  ciclosEsgotado = false;
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
// chamadas simultâneas. Rejeita sempre com { tipo, error[, descartada] } (RENEW_FAILURE).
let renovacaoEmVoo = null;

function rejeicao(tipo, error) {
  return { tipo, error };
}

function agendarRetentativa(epocaAgendada) {
  cancelarRetentativa();
  if (hasPendingExit()) return;
  if (retentativasFeitas >= RENEW_RETRY_DELAYS_MS.length) {
    ciclosEsgotado = true;
    return;
  }
  const atraso = RENEW_RETRY_DELAYS_MS[retentativasFeitas];
  timerRetentativa = setTimeout(() => {
    timerRetentativa = null;
    if (epocaAgendada !== epoch || hasPendingExit()) return;
    retentativasFeitas += 1;
    renovar().catch(() => {});
  }, atraso);
}

async function executarRenovacao() {
  const epocaInicial = epoch;
  let resposta;
  try {
    resposta = await new AuthApi().refreshToken();
  } catch (error) {
    if (epocaInicial !== epoch) {
      throw { ...rejeicao(RENEW_FAILURE.RECUSADA, error), descartada: true };
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
    if (error?.response) agendarRetentativa(epocaInicial);
    throw rejeicao(
      error?.response ? RENEW_FAILURE.FALHA : RENEW_FAILURE.REDE,
      error
    );
  }
  if (epocaInicial !== epoch) {
    throw { ...rejeicao(RENEW_FAILURE.RECUSADA, null), descartada: true };
  }
  const { accessToken: novo, user, configuracao } = resposta.data;
  pendentePorRede = false;
  cancelarRetentativa();
  retentativasFeitas = 0;
  ciclosEsgotado = false;
  if (userId !== null && user?.id !== userId) {
    emitSessionEvent(SESSION_EVENT.IDENTITY_CHANGED);
    throw rejeicao(RENEW_FAILURE.IDENTIDADE, null);
  }
  setSession({ accessToken: novo, userId: user?.id });
  emitSessionEvent(SESSION_EVENT.RENEWED, { user, configuracao });
  return { accessToken: novo, user, configuracao };
}

function renovar() {
  if (renovacaoEmVoo) return renovacaoEmVoo;
  const promessa = executarRenovacao().finally(() => {
    if (renovacaoEmVoo === promessa) renovacaoEmVoo = null;
  });
  renovacaoEmVoo = promessa;
  return promessa;
}

// Chamada de fora do timer: abre um episódio novo de re-tentativas.
export function renew() {
  if (!renovacaoEmVoo) {
    retentativasFeitas = 0;
    ciclosEsgotado = false;
  }
  return renovar();
}

subscribe(SESSION_EVENT.IDENTITY_CHANGED, () => {
  clearSession();
  reloadPage();
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (
      (pendentePorRede || ciclosEsgotado) &&
      accessToken !== null &&
      !hasPendingExit()
    ) {
      renew().catch(() => {});
    }
  });
}
