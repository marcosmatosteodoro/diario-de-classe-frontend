import { renderHook, act, waitFor } from '@testing-library/react';
import { useApplicationLayout } from './useApplicationLayout';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/providers/UserAuthProvider', () => ({ useUserAuth: jest.fn() }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('@/utils/isMobileFunction', () => ({ isMobileFunction: jest.fn() }));

describe('useApplicationLayout', () => {
  let routerMock, isAuthenticatedMock, errorMock, isMobileFunctionMock;

  beforeEach(() => {
    routerMock = { push: jest.fn() };
    isAuthenticatedMock = jest.fn();
    errorMock = jest.fn();
    isMobileFunctionMock = jest.fn();
    require('next/navigation').useRouter.mockReturnValue(routerMock);
    require('@/providers/UserAuthProvider').useUserAuth.mockReturnValue({
      isAuthenticated: isAuthenticatedMock,
    });
    require('@/providers/ToastProvider').useToast.mockReturnValue({
      error: errorMock,
    });
    require('@/utils/isMobileFunction').isMobileFunction.mockImplementation(
      isMobileFunctionMock
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve iniciar com loading true e sidebar fechado', () => {
    isAuthenticatedMock.mockResolvedValue(false);
    const { result } = renderHook(() => useApplicationLayout());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.sidebarExpanded.isExpanded).toBe(false);
  });

  it('deve redirecionar para login se não autenticado', async () => {
    isAuthenticatedMock.mockResolvedValue(false);
    renderHook(() => useApplicationLayout());
    await Promise.resolve();
    expect(errorMock).toHaveBeenCalledWith(
      'Por favor, faça login para acessar o sistema.'
    );
    expect(routerMock.push).toHaveBeenCalledWith('/login');
  });

  it('deve desativar loading se autenticado', async () => {
    isAuthenticatedMock.mockResolvedValue(true);
    const { result } = renderHook(() => useApplicationLayout());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('deve alternar sidebar para mobile', () => {
    isMobileFunctionMock.mockReturnValue(true);
    const { result } = renderHook(() => useApplicationLayout());
    act(() => {
      result.current.toggleSidebar();
    });
    expect(result.current.sidebarExpanded.sidebarClass).toBe('absolute w-full');
    expect(result.current.sidebarExpanded.isExpanded).toBe(true);
  });

  it('deve alternar sidebar para desktop', () => {
    isMobileFunctionMock.mockReturnValue(false);
    const { result } = renderHook(() => useApplicationLayout());
    act(() => {
      result.current.toggleSidebar();
    });
    expect(result.current.sidebarExpanded.sidebarClass).toBe('w-[180px]');
    expect(result.current.sidebarExpanded.mainClass).toBe('ml-[150px]');
    expect(result.current.sidebarExpanded.isExpanded).toBe(true);
  });
});
