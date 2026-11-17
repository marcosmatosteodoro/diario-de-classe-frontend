'use client';

import React, { createContext, useContext, useState } from 'react';
import { SESSION_END_REASON, SESSION_STATUS } from '@/constants/session';
import { clearSession, setSession } from '@/store/api/sessionManager';
import { clearAppCache } from '@/utils/appCache';

const UserAuthContext = createContext();

const EMPTY_SETTINGS = {
  duracaoAula: null,
  tolerancia: null,
  diasDeFuncionamento: [],
};

export function UserAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [sessionStatus, setSessionStatus] = useState(SESSION_STATUS.ANONYMOUS);
  const [endReason, setEndReason] = useState(SESSION_END_REASON.NUNCA);

  const authenticate = ({
    accessToken,
    currentUser: user,
    duracaoAula,
    tolerancia,
    diasDeFuncionamento,
  }) => {
    clearAppCache();
    setSession({ accessToken, userId: user?.id ?? null });
    setCurrentUser(user);
    setSettings({ duracaoAula, tolerancia, diasDeFuncionamento });
    setSessionStatus(SESSION_STATUS.AUTHENTICATED);
  };

  const removeAuthenticate = (motivo = SESSION_END_REASON.SAIDA) => {
    clearSession();
    setCurrentUser(null);
    setSessionStatus(SESSION_STATUS.ANONYMOUS);
    setEndReason(motivo);
  };

  const isAuthenticated = async () => {
    return (
      currentUser !== null && sessionStatus === SESSION_STATUS.AUTHENTICATED
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
