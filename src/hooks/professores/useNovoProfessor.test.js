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

  it('should return initial form data and functions', () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    expect(result.current.formData).toEqual({
      nome: '',
      sobrenome: '',
      email: '',
      telefone: '',
      senha: '',
      repetirSenha: '',
      permissao: 'professor',
    });
    expect(result.current.handleChange).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
  });

  it('should update form data when handleChange is called', () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'João' },
      });
    });

    expect(result.current.formData.nome).toBe('João');
  });

  it('should update multiple form fields correctly', () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'João' },
      });
    });

    act(() => {
      result.current.handleChange({
        target: { name: 'email', value: 'joao@test.com' },
      });
    });

    expect(result.current.formData.nome).toBe('João');
    expect(result.current.formData.email).toBe('joao@test.com');
    expect(result.current.formData.sobrenome).toBe(''); // outros campos mantidos
  });

  it('should call preventDefault on form submission', async () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    // Submit do form
    const mockEvent = { preventDefault: jest.fn() };
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should handle form data correctly', async () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    // Preencher dados incluindo repetirSenha
    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'João' },
      });
      result.current.handleChange({
        target: { name: 'repetirSenha', value: '123456' },
      });
    });

    // Verificar se dados foram atualizados no form
    expect(result.current.formData.nome).toBe('João');
    expect(result.current.formData.repetirSenha).toBe('123456');
  });

  it('should handle form submission', async () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    const mockEvent = { preventDefault: jest.fn() };
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should return correct loading states', () => {
    const loadingState = {
      status: STATUS.LOADING,
      message: '',
      errors: {},
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
    };
    const store = createMockStore(successState);
    store.dispatch = mockDispatch;

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.message).toBe('Professor criado com sucesso');
  });

  it('should handle form submission errors gracefully', async () => {
    const initialState = {
      status: STATUS.IDLE,
      message: '',
      errors: {},
    };
    const store = createMockStore(initialState);
    store.dispatch = mockDispatch;

    // Mock de erro na submissão
    mockCreateProfessor.mockRejectedValue(new Error('Network error'));

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useNovoProfessor(), { wrapper });

    const mockEvent = { preventDefault: jest.fn() };

    // Não deve lançar erro, deve ser tratado internamente
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
