import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { STATUS } from '@/constants';
import { useLogin } from './useLogin';

const mockStore = configureStore([]);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/providers/ToastProvider', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}));
jest.mock('@/providers/UserAuthProvider', () => ({
  useUserAuth: () => ({ authenticate: jest.fn() }),
}));

describe('useLogin', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        status: STATUS.IDLE,
        message: '',
        action: '',
        data: null,
      },
    });
    store.dispatch = jest.fn();
  });

  function wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    expect(result.current.formData).toEqual({ email: '', senha: '' });
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.handleChange).toBe('function');
    expect(typeof result.current.handleSubmit).toBe('function');
  });

  it('should update formData on handleChange', () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => {
      result.current.handleChange({
        target: { name: 'email', value: 'test@email.com' },
      });
    });
    expect(result.current.formData.email).toBe('test@email.com');
  });

  it('should dispatch login on handleSubmit with valid data', () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => {
      result.current.handleChange({
        target: { name: 'email', value: 'test@email.com' },
      });
      result.current.handleChange({ target: { name: 'senha', value: '123' } });
      result.current.handleSubmit({ preventDefault: jest.fn() });
    });
    expect(store.dispatch).toHaveBeenCalled();
  });

  it('should not dispatch login if email or senha is missing', () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => {
      result.current.handleChange({ target: { name: 'email', value: '' } });
      result.current.handleChange({ target: { name: 'senha', value: '' } });
      result.current.handleSubmit({ preventDefault: jest.fn() });
    });
    // Só deve chamar error, não dispatch(login)
    expect(store.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/login' })
    );
  });
});
