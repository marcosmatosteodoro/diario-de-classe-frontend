'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { isMobileFunction } from '@/utils/isMobileFunction';

export function useApplicationLayout() {
  const router = useRouter();
  const { isAuthenticated } = useUserAuth();
  const { error } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState({
    mainClass: 'ml-18',
    sidebarClass: 'w-18',
    isExpanded: false,
  });

  const toggleSidebar = () => {
    const isMobile = isMobileFunction();
    let mainClass = 'ml-18';
    let sidebarClass = 'w-18';

    if (!sidebarExpanded.isExpanded) {
      if (isMobile === true) {
        sidebarClass = 'absolute w-full';
      } else {
        sidebarClass = 'w-[180px]';
        mainClass = 'ml-[150px]';
      }
    }

    setSidebarExpanded({
      mainClass: mainClass,
      sidebarClass: sidebarClass,
      isExpanded: !sidebarExpanded.isExpanded,
    });
  };

  useEffect(() => {
    async function checkAuth() {
      const userIsAuth = await isAuthenticated();
      if (!userIsAuth) {
        error('Por favor, faça login para acessar o sistema.');
        router.push('/login');
        return;
      } else {
        setIsLoading(false);
      }
    }
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading, sidebarExpanded, toggleSidebar };
}
