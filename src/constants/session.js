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
