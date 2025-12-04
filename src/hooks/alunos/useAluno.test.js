import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAluno } from './useAluno';
import { getAluno } from '@/store/slices/alunosSlice';
import { STATUS } from '@/constants';

// Mock dos módulos
jest.mock('@/store/slices/alunosSlice', () => ({
  getAluno: jest.fn(),
}));

jest.mock('@/constants', () => ({
  STATUS: {
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILED: 'failed',
  },
}));

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      alunos: (state = initialState, action) => state,
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

describe('useAluno', () => {
  let mockDispatch;

  beforeEach(() => {
    jest.clearAllMocks();

    // Implementação do action para facilitar asserções
    getAluno.mockImplementation(id => ({
      type: 'alunos/getAluno',
      payload: id,
    }));

    mockDispatch = jest.fn();
  });

  it('dispatches getAluno when id is provided', () => {
    const initialState = {
      current: { id: 123, nome: 'João', sobrenome: 'Silva' },
      message: 'ok',
      status: STATUS.IDLE,
      statusError: null,
    };

    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    renderHook(() => useAluno(123), { wrapper });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'alunos/getAluno',
      payload: 123,
    });
  });

  it('does not dispatch when id is falsy', () => {
    const initialState = {};
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    renderHook(() => useAluno(null), { wrapper });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('returns correct shape and flags for IDLE status', () => {
    const initialState = {
      current: { id: 5, nome: 'Ana', sobrenome: 'Santos' },
      message: 'all good',
      status: STATUS.IDLE,
      statusError: null,
    };

    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useAluno(5), { wrapper });

    expect(result.current).toEqual({
      aluno: initialState.current,
      message: initialState.message,
      isLoading: true,
      isSuccess: false,
      isFailed: false,
      statusError: null,
    });
  });

  it('returns correct flags for LOADING status', () => {
    const initialState = {
      current: null,
      message: '',
      status: STATUS.LOADING,
      statusError: null,
    };

    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useAluno(5), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFailed).toBe(false);
  });

  it('returns correct flags for SUCCESS status', () => {
    const initialState = {
      current: { id: 10, nome: 'Carlos', sobrenome: 'Pereira' },
      message: 'success',
      status: STATUS.SUCCESS,
      statusError: null,
    };

    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useAluno(10), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isFailed).toBe(false);
  });

  it('returns correct flags for FAILED status', () => {
    const initialState = {
      current: null,
      message: 'error message',
      status: STATUS.FAILED,
      statusError: '404',
    };

    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useAluno(5), { wrapper });

    expect(result.current.isFailed).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.statusError).toBe('404');
  });

  it('should return statusError when present', () => {
    const initialState = {
      current: null,
      message: 'Not found',
      status: STATUS.FAILED,
      statusError: '404',
    };

    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useAluno(999), { wrapper });

    expect(result.current.statusError).toBe('404');
  });

  it('should handle undefined state gracefully', () => {
    const store = createMockStore();
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useAluno(1), { wrapper });

    expect(result.current.aluno).toBeUndefined();
    expect(result.current.message).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFailed).toBe(false);
  });

  it('should dispatch with string id', () => {
    const initialState = {
      current: { id: 'abc123', nome: 'Maria' },
      message: '',
      status: STATUS.SUCCESS,
      statusError: null,
    };

    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    renderHook(() => useAluno('abc123'), { wrapper });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'alunos/getAluno',
      payload: 'abc123',
    });
  });
});
