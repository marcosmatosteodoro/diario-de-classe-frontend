import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHealth } from './useHealth';
import { api } from '../services/api';

// Mock do serviço de API
jest.mock('../services/api');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createWrapper = () => {
  const testQueryClient = createTestQueryClient();
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('useHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(null);
  });

  it('should return success data when API call succeeds', async () => {
    const mockHealthData = {
      status: 'ok',
      timestamp: '2025-10-31T12:00:00Z',
      version: '1.0.0',
    };

    api.get.mockResolvedValue(mockHealthData);

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHealthData);
    expect(result.current.error).toBe(null);
    expect(api.get).toHaveBeenCalledWith('/health');
  });

  it('should return error when API call fails', async () => {
    const mockError = new Error('Network error');
    api.get.mockRejectedValue(mockError);

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBeUndefined();
  });

  it('should use correct query key', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useHealth(), {
      wrapper: createWrapper(),
    });

    // O query key deve ser ['health']
    expect(result.current.isLoading).toBe(true);
    expect(api.get).toHaveBeenCalledWith('/health');
  });

  it('should accept custom options', () => {
    const customOptions = {
      enabled: false,
    };

    api.get.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useHealth(customOptions), {
      wrapper: createWrapper(),
    });

    // Com enabled: false, a query não deve executar
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
