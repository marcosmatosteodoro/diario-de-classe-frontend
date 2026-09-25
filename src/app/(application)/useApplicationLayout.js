'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { logout } from '@/store/slices/authSlice';
import { clearErrors as clearProfessoresErrors } from '@/store/slices/professoresSlice';
import { clearErrors as clearAlunosErrors } from '@/store/slices/alunosSlice';
import { clearErrors as clearAulasErrors } from '@/store/slices/aulasSlice';
import { clearErrors as clearContratoErrors } from '@/store/slices/contratosSlice';

export function useApplicationLayout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, removeAuthenticate, refreshToken } = useUserAuth();
  const { error } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState({
    isExpanded: false,
  });

  const professoresState = useSelector(state => state.professores);
  const alunosState = useSelector(state => state.alunos);
  const aulasState = useSelector(state => state.aulas);
  const contratosState = useSelector(state => state.contratos);
  const configuracaoState = useSelector(state => state.configuracao);
  const states = useMemo(
    () => [
      professoresState,
      alunosState,
      aulasState,
      contratosState,
      configuracaoState,
    ],
    [
      professoresState,
      alunosState,
      aulasState,
      contratosState,
      configuracaoState,
    ]
  );

  const toggleSidebar = () => {
    setSidebarExpanded({
      isExpanded: !sidebarExpanded.isExpanded,
    });
  };

  useEffect(() => {
    dispatch(clearProfessoresErrors());
    dispatch(clearAlunosErrors());
    dispatch(clearAulasErrors());
    dispatch(clearContratoErrors());
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function checkAuth() {
      const userIsAuth = await isAuthenticated();
      if (!isCurrent) {
        return;
      }
      if (!userIsAuth) {
        error('Por favor, faça login para acessar o sistema.');
        router.push('/login');
        return;
      } else {
        setIsLoading(false);
      }
    }
    checkAuth();

    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const statusErrors = states.map(state => String(state.statusError));

    if (!isUnauthorized && statusErrors.includes('401')) {
      setIsUnauthorized(true);
      dispatch(logout(refreshToken));
      removeAuthenticate();
      error('Sua sessão expirou.');
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states]);

  return {
    isUnauthorized,
    isLoading,
    sidebarExpanded,
    toggleSidebar,
  };
}
