import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useDeletarProfessor } from './useDeletarProfessor';
import { deleteProfessor } from '@/store/slices/professoresSlice';
import useSweetAlert from '@/hooks/useSweetAlert';

// Mock dos módulos
jest.mock('@/store/slices/professoresSlice', () => ({
  deleteProfessor: jest.fn(),
}));

jest.mock('@/hooks/useSweetAlert', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock store simples
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

describe('useDeletarProfessor', () => {
  let mockDispatch;
  let mockShowSuccess;
  let mockShowError;
  let mockShowConfirm;
  let store;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock das funções do SweetAlert
    mockShowSuccess = jest.fn();
    mockShowError = jest.fn();
    mockShowConfirm = jest.fn();

    useSweetAlert.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showConfirm: mockShowConfirm,
    });

    // Mock do dispatch
    mockDispatch = jest.fn();

    // Mock do deleteProfessor action
    deleteProfessor.mockImplementation(id => ({
      type: 'professores/deleteProfessor',
      payload: id,
    }));

    // Criar store mock
    store = createMockStore();
    store.dispatch = mockDispatch;
  });

  it('should return handleDeleteProfessor function', () => {
    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useDeletarProfessor(), { wrapper });

    expect(result.current).toEqual({
      handleDeleteProfessor: expect.any(Function),
    });
  });

  it('should show confirmation dialog when handleDeleteProfessor is called', async () => {
    mockShowConfirm.mockResolvedValue({ isConfirmed: false });

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useDeletarProfessor(), { wrapper });

    await act(async () => {
      await result.current.handleDeleteProfessor(123);
    });

    expect(mockShowConfirm).toHaveBeenCalledWith({
      title: 'Confirmar exclusão?',
      text: 'O registro desse professor não pode ser recuperado!',
    });
  });

  it('should not dispatch delete action when user cancels confirmation', async () => {
    mockShowConfirm.mockResolvedValue({ isConfirmed: false });

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useDeletarProfessor(), { wrapper });

    await act(async () => {
      await result.current.handleDeleteProfessor(123);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockShowSuccess).not.toHaveBeenCalled();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('should dispatch delete action and show success when user confirms and operation succeeds', async () => {
    mockShowConfirm.mockResolvedValue({ isConfirmed: true });
    mockDispatch.mockResolvedValue({ type: 'success' });

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useDeletarProfessor(), { wrapper });

    await act(async () => {
      await result.current.handleDeleteProfessor(123);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'professores/deleteProfessor',
      payload: 123,
    });

    expect(mockShowSuccess).toHaveBeenCalledWith({
      title: 'Confirmado!',
      text: 'Professor excluído com sucesso.',
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('should show error message when delete operation fails', async () => {
    mockShowConfirm.mockResolvedValue({ isConfirmed: true });
    mockDispatch.mockResolvedValue({ error: true });

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useDeletarProfessor(), { wrapper });

    await act(async () => {
      await result.current.handleDeleteProfessor(456);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'professores/deleteProfessor',
      payload: 456,
    });

    expect(mockShowError).toHaveBeenCalledWith({
      title: 'Erro!',
      text: 'Não foi possível excluir o professor.',
    });

    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  it('should handle string IDs correctly', async () => {
    mockShowConfirm.mockResolvedValue({ isConfirmed: true });
    mockDispatch.mockResolvedValue({ type: 'success' });

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useDeletarProfessor(), { wrapper });

    await act(async () => {
      await result.current.handleDeleteProfessor('abc123');
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'professores/deleteProfessor',
      payload: 'abc123',
    });
  });

  it('should handle confirmation dialog errors gracefully', async () => {
    mockShowConfirm.mockRejectedValue(new Error('Dialog error'));

    const wrapper = createWrapper(store);
    const { result } = renderHook(() => useDeletarProfessor(), { wrapper });

    await act(async () => {
      await expect(result.current.handleDeleteProfessor(123)).rejects.toThrow(
        'Dialog error'
      );
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
