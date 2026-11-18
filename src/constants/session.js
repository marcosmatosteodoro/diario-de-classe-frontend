export const SESSION_STATUS = {
  RESTORING: 'restoring',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  UNAVAILABLE: 'unavailable',
};

export const SESSION_END_REASON = {
  NUNCA: 'nunca',
  EXPIRADA: 'expirada',
  SAIDA: 'saida',
  OUTRA_ABA: 'outra-aba',
};

export const SESSION_EVENT = {
  EXPIRED: 'expired',
  IDENTITY_CHANGED: 'identity-changed',
  RENEWED: 'renewed',
};

export const RENEW_FAILURE = {
  RECUSADA: 'recusada',
  REDE: 'rede',
  FALHA: 'falha',
  IDENTIDADE: 'identidade',
};

export const RENEW_FAILURE_MESSAGE =
  'Não foi possível concluir a ação agora. Tente novamente em instantes.';

// Backoff da re-tentativa de renovação em FALHA (DEC-005-019): 3 tentativas por episódio.
export const RENEW_RETRY_DELAYS_MS = [2000, 4000, 8000];
