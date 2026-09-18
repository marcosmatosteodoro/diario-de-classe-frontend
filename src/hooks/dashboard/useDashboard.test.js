import { renderHook, act } from '@testing-library/react';
import { useDashboard } from './useDashboard';
import { useDispatch, useSelector } from 'react-redux';
import { STATUS, FILTER_PANEL_STORAGE_KEYS } from '@/constants';
import { useCollapsiblePanelState } from '@/hooks/useCollapsiblePanelState';
import React from 'react';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@/store/slices/dashboardSlice', () => ({
  getDashboard: jest.fn(() => ({ type: 'dashboard/getDashboard' })),
}));

jest.mock('@/store/slices/aulasSlice', () => ({
  updateAula: jest.fn(() => ({ type: 'aulas/updateAula' })),
  clearStatus: jest.fn(() => ({ type: 'aulas/clearStatus' })),
}));

jest.mock('../professores/useProfessores', () => ({
  useProfessores: jest.fn(() => ({ professores: [] })),
}));

jest.mock('../useSweetAlert', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showForm: jest.fn(),
    showSuccess: jest.fn(),
  })),
}));

jest.mock('@/providers/ToastProvider', () => ({
  useToast: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('useDashboard', () => {
  let dispatchMock;
  const mockCurrentUser = { id: 1 };

  const mockSelectorState = selector =>
    selector({
      dashboard: { data: {}, status: STATUS.IDLE },
      aulas: { status: STATUS.IDLE, action: null },
    });

  beforeEach(() => {
    dispatchMock = jest.fn();
    useDispatch.mockReturnValue(dispatchMock);
    // O painel colapsável (COMP-002-002) e a preferência de filtros
    // (COMP-002-004) são persistidos em localStorage; limpa para isolar cada
    // teste — inclusive os que este arquivo não escreveu (ex.: useAulas).
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should dispatch getDashboard on mount', () => {
    useSelector.mockImplementation(selector => {
      const state = {
        dashboard: { data: {}, status: STATUS.IDLE },
        aulas: { status: STATUS.IDLE, action: null },
      };
      return selector(state);
    });
    renderHook(() => useDashboard(mockCurrentUser));
    expect(dispatchMock).toHaveBeenCalled();
  });

  it('should return correct values from state', () => {
    const mockData = {
      totalAulas: 5,
      totalAlunos: 10,
      totalContratos: 3,
      aulas: [{ id: 1 }, { id: 2 }],
    };
    useSelector.mockImplementation(selector => {
      const state = {
        dashboard: { data: mockData, status: STATUS.SUCCESS },
        aulas: { status: STATUS.IDLE, action: null },
      };
      return selector(state);
    });
    const { result } = renderHook(() => useDashboard(mockCurrentUser));
    expect(result.current.aulas).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.current.status).toBe(STATUS.SUCCESS);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.homeCardValues).toHaveLength(3);
    expect(result.current.homeCardValues[0].value).toBe(10);
    expect(result.current.homeCardValues[1].value).toBe(5);
    expect(result.current.homeCardValues[2].value).toBe(3);
  });

  it('should return isLoading true if status is IDLE or LOADING', () => {
    useSelector.mockImplementation(selector => {
      const state = {
        dashboard: { data: {}, status: STATUS.IDLE },
        aulas: { status: STATUS.IDLE, action: null },
      };
      return selector(state);
    });
    let { result } = renderHook(() => useDashboard(mockCurrentUser));
    expect(result.current.isLoading).toBe(true);

    useSelector.mockImplementation(selector => {
      const state = {
        dashboard: { data: {}, status: STATUS.LOADING },
        aulas: { status: STATUS.IDLE, action: null },
      };
      return selector(state);
    });
    const { result: result2 } = renderHook(() => useDashboard(mockCurrentUser));
    expect(result2.current.isLoading).toBe(true);
  });

  describe('painel colapsável do dashboard (COMP-002-002, cablagem real — AC-001-014/016/017)', () => {
    it('AC-001-014: sem preferência salva, o painel nasce aberto', () => {
      useSelector.mockImplementation(mockSelectorState);

      const { result } = renderHook(() => ({
        dashboard: useDashboard(),
        painel: useCollapsiblePanelState(FILTER_PANEL_STORAGE_KEYS.dashboard),
      }));

      expect(result.current.painel.isOpen).toBe(true);
    });

    it('AC-001-016 (parte): alternar persiste a preferência sob panel_dashboard', () => {
      useSelector.mockImplementation(mockSelectorState);

      const { result } = renderHook(() => ({
        dashboard: useDashboard(),
        painel: useCollapsiblePanelState(FILTER_PANEL_STORAGE_KEYS.dashboard),
      }));

      act(() => {
        result.current.painel.toggle();
      });

      expect(result.current.painel.isOpen).toBe(false);
      expect(localStorage.getItem(FILTER_PANEL_STORAGE_KEYS.dashboard)).toBe(
        JSON.stringify('recolhido')
      );
    });

    it('AC-001-016 (parte): nova montagem restaura a preferência recolhida', () => {
      localStorage.setItem(
        FILTER_PANEL_STORAGE_KEYS.dashboard,
        JSON.stringify('recolhido')
      );
      useSelector.mockImplementation(mockSelectorState);

      const { result } = renderHook(() => ({
        dashboard: useDashboard(),
        painel: useCollapsiblePanelState(FILTER_PANEL_STORAGE_KEYS.dashboard),
      }));

      expect(result.current.painel.isOpen).toBe(false);
    });

    it('AC-001-017: falha na leitura (JSON inválido) cai em aberto (fail secure)', () => {
      // JSON corrompido de propósito — nunca `delete global.window` (lição
      // [[teste-de-ambiente-simulado-inerte]]: inerte neste runner, `window`
      // não é configurável no jsdom). Este é um `JSON.parse` que de fato
      // lança, exercitando o `catch` real de `loadPanelState`.
      localStorage.setItem(FILTER_PANEL_STORAGE_KEYS.dashboard, '{invalido');
      useSelector.mockImplementation(mockSelectorState);

      const { result } = renderHook(() => ({
        dashboard: useDashboard(),
        painel: useCollapsiblePanelState(FILTER_PANEL_STORAGE_KEYS.dashboard),
      }));

      expect(result.current.painel.isOpen).toBe(true);
    });
  });

  describe('appliedCount (COMP-002-004) e AC-001-013/AC-001-022 (parte)', () => {
    it('formData alterado do default: appliedCount reflete countAppliedFilters(formData, defaultFormData)', () => {
      useSelector.mockImplementation(mockSelectorState);
      const { result } = renderHook(() => useDashboard());

      act(() => {
        result.current.handleChange({
          target: { name: 'alunoId', value: '123', type: 'text' },
        });
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'professorId', value: '456', type: 'text' },
        });
      });

      expect(result.current.appliedCount).toBe(2);
    });

    it('AC-001-013/AC-001-022 (parte): handleClearFilter zera appliedCount na sequência, sem remontar', () => {
      useSelector.mockImplementation(mockSelectorState);
      const { result } = renderHook(() => useDashboard());

      act(() => {
        result.current.handleChange({
          target: { name: 'alunoId', value: '123', type: 'text' },
        });
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'professorId', value: '456', type: 'text' },
        });
      });

      expect(result.current.appliedCount).toBe(2);

      act(() => {
        result.current.handleClearFilter();
      });

      expect(result.current.appliedCount).toBe(0);
    });
  });

  describe('AC-001-020 (FR-001-025): handleClearFilter não altera isOpen do painel', () => {
    it('painel recolhido: handleClearFilter do hook real mantém isOpen inalterado', () => {
      useSelector.mockImplementation(mockSelectorState);

      const { result } = renderHook(() => ({
        dashboard: useDashboard(),
        painel: useCollapsiblePanelState(FILTER_PANEL_STORAGE_KEYS.dashboard),
      }));

      act(() => {
        result.current.painel.toggle();
      });
      expect(result.current.painel.isOpen).toBe(false);

      act(() => {
        result.current.dashboard.handleClearFilter();
      });

      expect(result.current.painel.isOpen).toBe(false);
    });
  });
});
