import { LogoutService } from '@/services/auth/logoutService';

export const SESSION_CHANNEL_EVENT = {
  SAIDA: 'saida',
};

export const PENDING_EXIT_KEY = 'bls-saida-pendente';

const CHANNEL_NAME = 'bls-sessao';
const STORAGE_EVENT_KEY = 'bls-sessao-evento';

// Nada de credencial trafega aqui: só o tipo do evento e um carimbo (o
// carimbo faz o valor do storage mudar a cada envio, senão o evento
// `storage` não dispara para um tipo repetido).
// O BroadcastChannel entrega a mensagem também a outros objetos de mesmo nome
// na PRÓPRIA aba (o ouvinte do layout); a origem aleatória do módulo, que não
// é segredo nem identifica o usuário, deixa o ouvinte descartar o próprio eco.
const ORIGEM = Math.random().toString(36).slice(2);

function hasBroadcastChannel() {
  return typeof BroadcastChannel !== 'undefined';
}

function hasWindow() {
  return typeof window !== 'undefined';
}

export function postSessionEvent(tipo) {
  const mensagem = { tipo, carimbo: Date.now() };

  if (hasBroadcastChannel()) {
    try {
      const canal = new BroadcastChannel(CHANNEL_NAME);
      canal.postMessage({ ...mensagem, origem: ORIGEM });
      canal.close();
      return;
    } catch {
      // cai para o fallback por storage
    }
  }

  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(mensagem));
  } catch {
    // storage bloqueado: sem sincronia entre abas (TRISK-003-009)
  }
}

export function onSessionEvent(callback) {
  if (hasBroadcastChannel()) {
    const canal = new BroadcastChannel(CHANNEL_NAME);
    canal.onmessage = evento => {
      if (evento?.data?.origem === ORIGEM) return;
      const tipo = evento?.data?.tipo;
      if (typeof tipo === 'string') callback(tipo);
    };
    return () => {
      canal.onmessage = null;
      canal.close();
    };
  }

  if (!hasWindow()) return () => {};

  const handler = evento => {
    if (evento.key !== STORAGE_EVENT_KEY || evento.newValue == null) return;
    try {
      const tipo = JSON.parse(evento.newValue)?.tipo;
      if (typeof tipo === 'string') callback(tipo);
    } catch {
      // valor ilegível: ignora
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function markPendingExit() {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(PENDING_EXIT_KEY, '1');
  } catch {
    // storage bloqueado: a marca não persiste
  }
}

// Presença da chave, nunca comparação de valor.
export function hasPendingExit() {
  if (!hasWindow()) return false;
  try {
    return window.localStorage.getItem(PENDING_EXIT_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearPendingExit() {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(PENDING_EXIT_KEY);
  } catch {
    // storage bloqueado
  }
}

export async function retryPendingExit() {
  if (!hasPendingExit()) return;
  try {
    await LogoutService.handle();
    clearPendingExit();
  } catch {
    // a marca permanece até o 204
  }
}

export function watchPendingExit() {
  if (!hasWindow()) return () => {};

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    retryPendingExit();
  }
  const aoVoltarOnline = () => {
    retryPendingExit();
  };
  window.addEventListener('online', aoVoltarOnline);
  return () => window.removeEventListener('online', aoVoltarOnline);
}
