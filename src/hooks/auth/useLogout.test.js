import { renderHook } from '@testing-library/react';
import { useLogout } from './useLogout';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';
import { useUserAuth } from '@/providers/UserAuthProvider';

jest.mock('react-redux', () => ({ useDispatch: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('@/providers/UserAuthProvider', () => ({ useUserAuth: jest.fn() }));
jest.mock('@/store/slices/authSlice', () => ({
  logout: jest.fn(),
  clearStatus: jest.fn(),
}));
jest.mock('@/utils/filterStorage', () => ({ clearAllFilters: jest.fn() }));
jest.mock('@/utils/appCache', () => ({ clearAppCache: jest.fn() }));

describe('useLogout', () => {
  let dispatchMock, routerMock, infoMock, removeAuthenticateMock;

  beforeEach(() => {
    dispatchMock = jest.fn();
    routerMock = { push: jest.fn() };
    infoMock = jest.fn();
    removeAuthenticateMock = jest.fn();

    useDispatch.mockReturnValue(dispatchMock);
    useRouter.mockReturnValue(routerMock);
    useToast.mockReturnValue({ info: infoMock });
    useUserAuth.mockReturnValue({
      removeAuthenticate: removeAuthenticateMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should clear status on mount', () => {
    const { result } = renderHook(() => useLogout());
    const { clearStatus } = require('@/store/slices/authSlice');
    expect(dispatchMock).toHaveBeenCalledWith(clearStatus());
  });

  it('should logout user without argument and redirect', () => {
    const { result } = renderHook(() => useLogout());
    const { logout } = require('@/store/slices/authSlice');

    result.current.logoutUser();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout.mock.calls[0]).toHaveLength(0);
    expect('refreshToken' in useUserAuth()).toBe(false);
    expect(removeAuthenticateMock).toHaveBeenCalled();
    expect(infoMock).toHaveBeenCalledWith('Você saiu.');
    expect(routerMock.push).toHaveBeenCalledWith('/login');
  });

  it('should clear all persisted filters on logout', () => {
    const { result } = renderHook(() => useLogout());
    const { clearAllFilters } = require('@/utils/filterStorage');

    result.current.logoutUser();

    expect(clearAllFilters).toHaveBeenCalled();
  });

  it('should clear the app cache on logout (AC-001-009)', () => {
    const { result } = renderHook(() => useLogout());
    const { clearAppCache } = require('@/utils/appCache');

    result.current.logoutUser();

    expect(clearAppCache).toHaveBeenCalled();
  });
});
