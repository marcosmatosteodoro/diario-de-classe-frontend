'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  RENEW_FAILURE,
  SESSION_END_REASON,
  SESSION_EVENT,
  SESSION_STATUS,
} from '@/constants/session';
import {
  clearSession,
  getAccessToken,
  renew,
  setSession,
  subscribe,
} from '@/store/api/sessionManager';
import { clearAppCache } from '@/utils/appCache';
import {
  clearPendingExit,
  hasPendingExit,
  watchPendingExit,
} from '@/utils/sessionChannel';

const UserAuthContext = createContext();

const EMPTY_SETTINGS = {
  duracaoAula: null,
  tolerancia: null,
  diasDeFuncionamento: [],
};

const LEGACY_STORAGE_KEYS = ['token', 'settings'];

function settingsFrom(configuracao) {
  if (!configuracao) return EMPTY_SETTINGS;
  return {
    duracaoAula: configuracao.duracaoAula ?? null,
    tolerancia: configuracao.tolerancia ?? null,
    diasDeFuncionamento: configuracao.diasDeFuncionamento ?? [],
  };
}

// Remove sem ler: a credencial legada nunca é reaproveitada (FR-002-014).
function removeLegacyStorage() {
  LEGACY_STORAGE_KEYS.forEach(chave => {
    try {
      window.localStorage.removeItem(chave);
    } catch {
      // storage bloqueado: nada a remover
    }
  });
}

function createGate() {
  let open;
  const promise = new Promise(resolve => {
    open = resolve;
  });
  return { promise, open };
}

export function UserAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [sessionStatus, setSessionStatus] = useState(SESSION_STATUS.RESTORING);
  const [endReason, setEndReason] = useState(SESSION_END_REASON.NUNCA);

  // Espelhos síncronos do estado: `isAuthenticated` e os ouvintes de evento
  // leem o valor vigente, nunca o de uma closure antiga.
  const statusRef = useRef(SESSION_STATUS.RESTORING);
  const userRef = useRef(null);
  const gateRef = useRef(null);
  const geracaoRef = useRef(0);
  const montadoRef = useRef(false);
  if (gateRef.current === null) gateRef.current = createGate();

  const applyStatus = status => {
    if (status === SESSION_STATUS.RESTORING) {
      if (statusRef.current !== SESSION_STATUS.RESTORING) {
        gateRef.current = createGate();
      }
    } else {
      gateRef.current.open();
    }
    statusRef.current = status;
    setSessionStatus(status);
  };

  const applyUser = user => {
    userRef.current = user;
    setCurrentUser(user);
  };

  const end = motivo => {
    applyUser(null);
    setEndReason(motivo);
    applyStatus(SESSION_STATUS.ANONYMOUS);
  };

  const restored = ({ user, configuracao }) => {
    applyUser(user);
    setSettings(settingsFrom(configuracao));
    applyStatus(SESSION_STATUS.AUTHENTICATED);
  };

  // A renovação é single-flight no sessionManager: a montagem dupla do
  // StrictMode e o retry compartilham a mesma chamada ao servidor. O token que
  // `renew()` resolve fica no sessionManager; aqui só entram `user` e
  // `configuracao`.
  const restore = async () => {
    const geracao = (geracaoRef.current += 1);
    const vigente = () =>
      montadoRef.current &&
      geracao === geracaoRef.current &&
      statusRef.current === SESSION_STATUS.RESTORING;
    applyStatus(SESSION_STATUS.RESTORING);

    if (hasPendingExit()) {
      end(SESSION_END_REASON.NUNCA);
      return;
    }

    try {
      const { user, configuracao } = await renew();
      if (!vigente()) return;
      restored({ user, configuracao });
    } catch (falha) {
      if (!vigente() || falha?.descartada) return;
      if (falha?.tipo === RENEW_FAILURE.RECUSADA) {
        end(SESSION_END_REASON.NUNCA);
        return;
      }
      applyStatus(SESSION_STATUS.UNAVAILABLE);
    }
  };

  const retryRestore = () => {
    if (statusRef.current !== SESSION_STATUS.UNAVAILABLE) return;
    restore();
  };

  useEffect(() => watchPendingExit(), []);

  useEffect(() => {
    montadoRef.current = true;
    removeLegacyStorage();
    restore();
    return () => {
      montadoRef.current = false;
    };
    // Efeito de montagem: `restore` é recriada a cada render e deve rodar uma vez por carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const desassinarExpirada = subscribe(SESSION_EVENT.EXPIRED, () => {
      if (statusRef.current === SESSION_STATUS.ANONYMOUS) return;
      end(SESSION_END_REASON.EXPIRADA);
    });
    const desassinarRenovada = subscribe(SESSION_EVENT.RENEWED, payload => {
      if (statusRef.current !== SESSION_STATUS.UNAVAILABLE) return;
      restored(payload);
    });
    // Sem sessão ativa o `online` do sessionManager não renova (não há acesso
    // a renovar): a restauração indisponível é retomada aqui.
    const aoVoltarOnline = () => retryRestore();
    window.addEventListener('online', aoVoltarOnline);
    return () => {
      desassinarExpirada();
      desassinarRenovada();
      window.removeEventListener('online', aoVoltarOnline);
    };
    // Assina uma vez; os handlers leem o estado atual por `statusRef`, não por closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authenticate = ({
    accessToken,
    currentUser: user,
    duracaoAula,
    tolerancia,
    diasDeFuncionamento,
  }) => {
    clearAppCache();
    clearPendingExit();
    setSession({
      accessToken: accessToken ?? getAccessToken(),
      userId: user?.id ?? null,
    });
    applyUser(user);
    setSettings({ duracaoAula, tolerancia, diasDeFuncionamento });
    applyStatus(SESSION_STATUS.AUTHENTICATED);
  };

  const removeAuthenticate = (motivo = SESSION_END_REASON.SAIDA) => {
    clearSession();
    end(motivo);
  };

  const isAuthenticated = async () => {
    while (statusRef.current === SESSION_STATUS.RESTORING) {
      await gateRef.current.promise;
    }
    return (
      userRef.current !== null &&
      statusRef.current === SESSION_STATUS.AUTHENTICATED
    );
  };

  const isAdmin = () => currentUser && currentUser.permissao === 'admin';

  return (
    <UserAuthContext.Provider
      value={{
        currentUser,
        settings,
        sessionStatus,
        endReason,
        authenticate,
        removeAuthenticate,
        retryRestore,
        isAuthenticated,
        isAdmin,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  return useContext(UserAuthContext);
}
