import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useDashboard } from './useDashboard';
import { useDispatch, useSelector } from 'react-redux';
import { STATUS, FILTER_STORAGE_KEYS } from '@/constants';
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

  beforeEach(() => {
    dispatchMock = jest.fn();
    useDispatch.mockReturnValue(dispatchMock);
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

  describe('dataInicio/dataTermino default estável até montar (AC-001-006)', () => {
    // Monta o hook via `flushSync` (fora de `act`) para observar
    // dataInicio/dataTermino ANTES do `useEffect([])` assentar. `renderHook`
    // do RTL embrulha o mount em `act()`, que assenta efeitos passivos
    // sincronamente antes de retornar — tornaria o estado pré-efeito
    // inobservável por esse caminho. O estado é lido do DOM (não de uma
    // variável capturada por fora do componente) para manter o harness
    // puro.
    function mountHookRaw() {
      const container = document.createElement('div');
      document.body.appendChild(container);
      // O mount fora de `act` (necessário para o `flushSync` abaixo observar
      // o pré-efeito) dispara o aviso "not wrapped in act(...)" do React
      // quando o `useEffect([])` assenta depois — esperado por construção,
      // suprimido aqui.
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      function Harness() {
        const { formData } = useDashboard(mockCurrentUser);
        return createElement(
          'div',
          { 'data-testid': 'datas' },
          JSON.stringify({
            dataInicio: formData.dataInicio,
            dataTermino: formData.dataTermino,
          })
        );
      }
      const root = createRoot(container);
      flushSync(() => {
        root.render(createElement(Harness));
      });
      return {
        getDatas() {
          const text = container.querySelector(
            '[data-testid="datas"]'
          ).textContent;
          return JSON.parse(text);
        },
        async flush() {
          await act(async () => {
            await Promise.resolve();
          });
        },
        unmount() {
          act(() => {
            root.unmount();
          });
          consoleErrorSpy.mockRestore();
          document.body.removeChild(container);
        },
      };
    }

    beforeEach(() => {
      localStorage.clear();
      useSelector.mockImplementation(selector => {
        const state = {
          dashboard: { data: {}, status: STATUS.IDLE },
          aulas: { status: STATUS.IDLE, action: null },
        };
        return selector(state);
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('paridade: dataInicio/dataTermino nascem null independente do relógio', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-30T23:59:59.000Z'));
      const hook1 = mountHookRaw();
      expect(hook1.getDatas()).toEqual({
        dataInicio: null,
        dataTermino: null,
      });
      hook1.unmount();

      jest.setSystemTime(new Date('2026-07-01T00:00:01.000Z'));
      const hook2 = mountHookRaw();
      expect(hook2.getDatas()).toEqual({
        dataInicio: null,
        dataTermino: null,
      });
      hook2.unmount();
    });

    it('preenchimento pós-montagem: datas passam a refletir o relógio real (sem filtro salvo)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-30T00:00:00.000Z'));

      const hook = mountHookRaw();
      expect(hook.getDatas()).toEqual({ dataInicio: null, dataTermino: null });
      await hook.flush();

      const expectedFim = new Date('2026-06-30T00:00:00.000Z');
      expectedFim.setMonth(expectedFim.getMonth() + 6);
      expect(hook.getDatas()).toEqual({
        dataInicio: '2026-06-30',
        dataTermino: expectedFim.toISOString().split('T')[0],
      });
      hook.unmount();
    });

    it('filtro salvo não é sobrescrito pelo efeito de default', async () => {
      localStorage.setItem(
        FILTER_STORAGE_KEYS.dashboard,
        JSON.stringify({ dataInicio: '2024-05-05', dataTermino: '2024-08-08' })
      );
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-30T00:00:00.000Z'));

      const hook = mountHookRaw();
      expect(hook.getDatas()).toEqual({
        dataInicio: '2024-05-05',
        dataTermino: '2024-08-08',
      });
      await hook.flush();
      expect(hook.getDatas()).toEqual({
        dataInicio: '2024-05-05',
        dataTermino: '2024-08-08',
      });
      hook.unmount();
    });
  });
});
