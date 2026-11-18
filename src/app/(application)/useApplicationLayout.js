'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SESSION_END_REASON, SESSION_STATUS } from '@/constants/session';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { clearAppCache } from '@/utils/appCache';
import { SESSION_CHANNEL_EVENT, onSessionEvent } from '@/utils/sessionChannel';

const MSG_SEM_LOGIN = 'Por favor, faça login para acessar o sistema.';
const MSG_EXPIRADA = 'Sua sessão expirou. Entre novamente para continuar.';

export function useApplicationLayout() {
  const router = useRouter();
  const { sessionStatus, endReason, removeAuthenticate, retryRestore } =
    useUserAuth();
  const { error } = useToast();
  const [sidebarExpanded, setSidebarExpanded] = useState({
    isExpanded: false,
  });
  // Valor anterior do par que decide a reação: o efeito age uma vez por fim
  // de sessão, também sob a montagem dupla do StrictMode.
  const anterior = useRef(null);

  const toggleSidebar = () => {
    setSidebarExpanded({
      isExpanded: !sidebarExpanded.isExpanded,
    });
  };

  useEffect(() => {
    const prev = anterior.current;
    anterior.current = { sessionStatus, endReason };
    if (
      prev &&
      prev.sessionStatus === sessionStatus &&
      prev.endReason === endReason
    ) {
      return;
    }
    if (sessionStatus !== SESSION_STATUS.ANONYMOUS) return;

    if (endReason === SESSION_END_REASON.NUNCA) {
      error(MSG_SEM_LOGIN);
    } else if (endReason === SESSION_END_REASON.EXPIRADA) {
      error(MSG_EXPIRADA);
      clearAppCache();
    }
    router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, endReason]);

  // A guarda é o único reator da navegação: o evento de outra aba só encerra
  // a sessão, e o estado `outra-aba` leva ao login.
  useEffect(() => {
    return onSessionEvent(tipo => {
      if (tipo !== SESSION_CHANNEL_EVENT.SAIDA) return;
      removeAuthenticate(SESSION_END_REASON.OUTRA_ABA);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isUnauthorized: sessionStatus === SESSION_STATUS.ANONYMOUS,
    isLoading: sessionStatus === SESSION_STATUS.RESTORING,
    isUnavailable: sessionStatus === SESSION_STATUS.UNAVAILABLE,
    retryRestore,
    sidebarExpanded,
    toggleSidebar,
  };
}
