import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { SESSION_END_REASON } from '@/constants/session';
import { useToast } from '@/providers/ToastProvider';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { logout, clearStatus } from '@/store/slices/authSlice';
import { clearAllFilters } from '@/utils/filterStorage';
import { clearAppCache } from '@/utils/appCache';
import {
  SESSION_CHANNEL_EVENT,
  clearPendingExit,
  markPendingExit,
  postSessionEvent,
} from '@/utils/sessionChannel';

const MSG_NAO_CONFIRMADA =
  'Você saiu neste dispositivo, mas a saída no servidor não foi confirmada e será concluída na próxima conexão.';
const MSG_RECUSADA =
  'Não foi possível confirmar a saída no servidor. Entre e saia novamente se o problema persistir.';

// Recusa (4xx) não se resolve repetindo; sem resposta ou 5xx é falha de comunicação.
function isRecusa(statusError) {
  return (
    Number.isFinite(statusError) && statusError >= 400 && statusError < 500
  );
}

export function useLogout() {
  const dispatch = useDispatch();
  const { removeAuthenticate } = useUserAuth();
  const { info, warning, error } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const emAndamento = useRef(false);

  const encerrarLocalmente = () => {
    removeAuthenticate(SESSION_END_REASON.SAIDA);
    clearAllFilters();
    clearAppCache();
  };

  const logoutUser = async () => {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setIsLoggingOut(true);
    try {
      await dispatch(logout()).unwrap();
      encerrarLocalmente();
      clearPendingExit();
      info('Você saiu.');
    } catch (falha) {
      encerrarLocalmente();
      if (isRecusa(falha?.statusError)) {
        error(MSG_RECUSADA);
      } else {
        markPendingExit();
        warning(MSG_NAO_CONFIRMADA);
      }
    } finally {
      emAndamento.current = false;
      setIsLoggingOut(false);
    }
    postSessionEvent(SESSION_CHANNEL_EVENT.SAIDA);
  };

  useEffect(() => {
    dispatch(clearStatus());
  }, [dispatch]);

  return { logoutUser, isLoggingOut };
}
