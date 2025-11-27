import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRouter } from 'next/navigation';
import { useNovoProfessor } from './useNovoProfessor';
import { createProfessor } from '@/store/slices/professoresSlice';
import { STATUS } from '@/constants';
import { useToast } from '@/providers/ToastProvider';

// Mock dos módulos
jest.mock('@/store/slices/professoresSlice', () => ({
  createProfessor: jest.fn(),
  clearStatus: jest.fn(),
  clearCurrent: jest.fn(),
}));

jest.mock('@/constants', () => ({
  STATUS: {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILED: 'failed',
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/providers/ToastProvider', () => ({
  useToast: jest.fn(),
}));

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      professores: (state = initialState, action) => state,
    },
  });
};

// Wrapper para Provider
const createWrapper = store => {
  const Wrapper = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('useNovoProfessor', () => {
  let mockDispatch;
  let mockPush;
  let mockSuccess;
  let mockCreateProfessor;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock do router
    mockPush = jest.fn();
    useRouter.mockReturnValue({
      push: mockPush,
    });

    // Mock do toast
    mockSuccess = jest.fn();
    useToast.mockReturnValue({
      success: mockSuccess,
    });

    // Mock do createProfessor dispatch
    mockCreateProfessor = jest.fn();
    mockDispatch = jest.fn().mockImplementation(action => {
      if (typeof action === 'function') {
        return mockCreateProfessor(action);
      }
      return action;
    });
  });

  it('should dispatch createProfessor on submit', () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
      current: null,
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    act(() => {
      result.current.submit({ nome: 'João' });
    });

    // Verifica se o dispatch foi chamado com createProfessor
    expect(mockDispatch).toHaveBeenCalledWith(
      createProfessor({ nome: 'João' })
    );
  });

  it('should return correct loading states', () => {
    const loadingState = {
      status: STATUS.LOADING,
      message: '',
      errors: {},
      current: null,
    };
    const store = createMockStore(loadingState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSubmitting).toBe(true);
  });

  it('should return correct success states', () => {
    const successState = {
      status: STATUS.SUCCESS,
      message: 'Professor criado com sucesso',
      errors: {},
      current: { id: 1, nome: 'João' },
    };
    const store = createMockStore(successState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.message).toBe('Professor criado com sucesso');
  });

  it('should show success toast and redirect when status is SUCCESS and current exists', () => {
    const successState = {
      status: STATUS.SUCCESS,
      message: 'Professor criado com sucesso',
      errors: {},
      current: { id: 1, nome: 'João' },
    };
    const store = createMockStore(successState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    renderHook(() => useNovoProfessor(), { wrapper });

    expect(mockSuccess).toHaveBeenCalledWith('Professor criado com sucesso!');
    expect(mockPush).toHaveBeenCalledWith('/professores');
  });
});
