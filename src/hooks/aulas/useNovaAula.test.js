import { renderHook, act } from '@testing-library/react';
import { useNovoAula } from './useNovaAula';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/providers/ToastProvider', () => ({
  useToast: () => ({ success: jest.fn() }),
}));
jest.mock('@/store/slices/aulasSlice', () => ({
  createAula: jest.fn(() => ({ type: 'createAula' })),
  clearStatus: jest.fn(() => ({ type: 'clearStatus' })),
  clearCurrent: jest.fn(() => ({ type: 'clearCurrent' })),
}));

const mockDispatch = jest.fn();

beforeEach(() => {
  require('react-redux').useDispatch.mockReturnValue(mockDispatch);
  require('react-redux').useSelector.mockImplementation(cb =>
    cb({
      aulas: {
        status: 'IDLE',
        message: '',
        errors: [],
        current: null,
        action: '',
      },
    })
  );
  jest.clearAllMocks();
});

describe('useNovoAula', () => {
  it('should return default values and call submit', () => {
    const { result } = renderHook(() => useNovoAula());
    act(() => {
      result.current.submit({ dataToSend: { nome: 'Aula' } });
    });
    expect(mockDispatch).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });
});
