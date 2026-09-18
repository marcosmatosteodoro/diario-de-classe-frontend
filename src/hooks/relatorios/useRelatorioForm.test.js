import { createElement } from 'react';
import { renderHook, act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useRelatorioForm } from './useRelatorioForm';

// Monta o hook via `flushSync` (fora de `act`) para observar
// dataInicial/dataFinal ANTES do `useEffect([])` assentar. `renderHook` do
// RTL embrulha o mount em `act()`, que assenta efeitos passivos
// sincronamente antes de retornar — tornaria o estado pré-efeito
// inobservável por esse caminho. O estado é lido do DOM (não de uma
// variável capturada por fora do componente) para manter o harness puro.
function mountHookRaw(hookArgs) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  // O mount fora de `act` (necessário para o `flushSync` abaixo observar o
  // pré-efeito) dispara o aviso "not wrapped in act(...)" do React quando o
  // `useEffect([])` assenta depois — esperado por construção, suprimido
  // aqui.
  const consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});
  function Harness() {
    const { filtros } = useRelatorioForm(hookArgs);
    return createElement(
      'div',
      { 'data-testid': 'filtros' },
      JSON.stringify({
        dataInicial: filtros.dataInicial,
        dataFinal: filtros.dataFinal,
      })
    );
  }
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(Harness));
  });
  return {
    getFiltros() {
      const text = container.querySelector(
        '[data-testid="filtros"]'
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

describe('useRelatorioForm', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockClear();
  });

  it('should initialize with empty filtros when relatorio.filters is null', () => {
    const relatorio = {
      filters: null,
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    expect(result.current.filtros).toEqual({});
  });

  it('should initialize with empty filtros when relatorio.filters is empty array', () => {
    const relatorio = {
      filters: [],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    expect(result.current.filtros).toEqual({});
  });

  it('should set initial dataInicial to current date', () => {
    const now = new Date();
    const expectedDate = now.toISOString().split('T')[0];

    const relatorio = {
      filters: [{ htmlFor: 'dataInicial', label: 'Data Inicial' }],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    expect(result.current.filtros.dataInicial).toBe(expectedDate);
  });

  it('should set initial dataFinal to 6 months from now', () => {
    const now = new Date();
    const expected = new Date();
    expected.setMonth(expected.getMonth() + 6);
    const expectedDate = expected.toISOString().split('T')[0];

    const relatorio = {
      filters: [{ htmlFor: 'dataFinal', label: 'Data Final' }],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    expect(result.current.filtros.dataFinal).toBe(expectedDate);
  });

  it('should initialize other filter fields as empty strings', () => {
    const relatorio = {
      filters: [
        { htmlFor: 'alunoId', label: 'Aluno' },
        { htmlFor: 'professorId', label: 'Professor' },
        { htmlFor: 'status', label: 'Status' },
      ],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    expect(result.current.filtros.alunoId).toBe('');
    expect(result.current.filtros.professorId).toBe('');
    expect(result.current.filtros.status).toBe('');
  });

  it('should initialize with all date types', () => {
    const relatorio = {
      filters: [
        { htmlFor: 'dataInicial', label: 'Data Inicial' },
        { htmlFor: 'dataFinal', label: 'Data Final' },
        { htmlFor: 'alunoId', label: 'Aluno' },
      ],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    expect(result.current.filtros.dataInicial).toBeDefined();
    expect(result.current.filtros.dataFinal).toBeDefined();
    expect(result.current.filtros.alunoId).toBe('');
  });

  it('should handle input change', () => {
    const relatorio = {
      filters: [{ htmlFor: 'alunoId', label: 'Aluno' }],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    act(() => {
      const event = {
        target: { name: 'alunoId', value: '123' },
      };
      result.current.handleChange(event);
    });

    expect(result.current.filtros.alunoId).toBe('123');
  });

  it('should handle multiple input changes', () => {
    const relatorio = {
      filters: [
        { htmlFor: 'alunoId', label: 'Aluno' },
        { htmlFor: 'professorId', label: 'Professor' },
        { htmlFor: 'status', label: 'Status' },
      ],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    act(() => {
      result.current.handleChange({ target: { name: 'alunoId', value: '1' } });
      result.current.handleChange({
        target: { name: 'professorId', value: '2' },
      });
      result.current.handleChange({
        target: { name: 'status', value: 'ATIVO' },
      });
    });

    expect(result.current.filtros).toEqual({
      alunoId: '1',
      professorId: '2',
      status: 'ATIVO',
    });
  });

  it('should update existing filter value', () => {
    const relatorio = {
      filters: [{ htmlFor: 'alunoId', label: 'Aluno' }],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'alunoId', value: '123' },
      });
    });

    expect(result.current.filtros.alunoId).toBe('123');

    act(() => {
      result.current.handleChange({
        target: { name: 'alunoId', value: '456' },
      });
    });

    expect(result.current.filtros.alunoId).toBe('456');
  });

  it('should call submit with endpoint and filtros', () => {
    const relatorio = {
      filters: [{ htmlFor: 'alunoId', label: 'Aluno' }],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'alunoId', value: '123' },
      });
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(mockSubmit).toHaveBeenCalledWith('/api/relatorios/vendas', {
      alunoId: '123',
    });
  });

  it('should call submit with all filters', () => {
    const relatorio = {
      filters: [
        { htmlFor: 'dataInicial', label: 'Data Inicial' },
        { htmlFor: 'dataFinal', label: 'Data Final' },
        { htmlFor: 'alunoId', label: 'Aluno' },
      ],
      endpoint: '/api/relatorios/aulas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    const initialData = result.current.filtros;

    act(() => {
      result.current.handleChange({ target: { name: 'alunoId', value: '99' } });
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(mockSubmit).toHaveBeenCalledWith('/api/relatorios/aulas', {
      ...initialData,
      alunoId: '99',
    });
  });

  it('should not modify other filters when changing one', () => {
    const relatorio = {
      filters: [
        { htmlFor: 'alunoId', label: 'Aluno' },
        { htmlFor: 'professorId', label: 'Professor' },
      ],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    act(() => {
      result.current.handleChange({ target: { name: 'alunoId', value: '1' } });
      result.current.handleChange({
        target: { name: 'professorId', value: '2' },
      });
    });

    expect(result.current.filtros.alunoId).toBe('1');
    expect(result.current.filtros.professorId).toBe('2');

    act(() => {
      result.current.handleChange({ target: { name: 'alunoId', value: '3' } });
    });

    expect(result.current.filtros.alunoId).toBe('3');
    expect(result.current.filtros.professorId).toBe('2'); // Should not change
  });

  it('should handle clearing a filter value', () => {
    const relatorio = {
      filters: [{ htmlFor: 'alunoId', label: 'Aluno' }],
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'alunoId', value: '123' },
      });
    });

    expect(result.current.filtros.alunoId).toBe('123');

    act(() => {
      result.current.handleChange({ target: { name: 'alunoId', value: '' } });
    });

    expect(result.current.filtros.alunoId).toBe('');
  });

  it('should return handleChange and handleSubmit functions', () => {
    const relatorio = {
      filters: null,
      endpoint: '/api/relatorios/vendas',
    };

    const { result } = renderHook(() =>
      useRelatorioForm({ relatorio, submit: mockSubmit })
    );

    expect(typeof result.current.handleChange).toBe('function');
    expect(typeof result.current.handleSubmit).toBe('function');
    expect(typeof result.current.filtros).toBe('object');
  });

  describe('dataInicial/dataFinal default estável até montar (AC-001-006)', () => {
    const relatorio = {
      filters: [
        { htmlFor: 'dataInicial', label: 'Data Inicial' },
        { htmlFor: 'dataFinal', label: 'Data Final' },
      ],
      endpoint: '/api/relatorios/vendas',
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    it('paridade: dataInicial/dataFinal nascem null independente do relógio', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-30T23:59:59.000Z'));
      const hook1 = mountHookRaw({ relatorio, submit: mockSubmit });
      expect(hook1.getFiltros()).toEqual({
        dataInicial: null,
        dataFinal: null,
      });
      hook1.unmount();

      jest.setSystemTime(new Date('2026-07-01T00:00:01.000Z'));
      const hook2 = mountHookRaw({ relatorio, submit: mockSubmit });
      expect(hook2.getFiltros()).toEqual({
        dataInicial: null,
        dataFinal: null,
      });
      hook2.unmount();
    });

    it('preenchimento pós-montagem: datas passam a refletir o relógio real no instante T', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-30T00:00:00.000Z'));

      const hook = mountHookRaw({ relatorio, submit: mockSubmit });
      expect(hook.getFiltros()).toEqual({
        dataInicial: null,
        dataFinal: null,
      });
      await hook.flush();

      const expectedFim = new Date('2026-06-30T00:00:00.000Z');
      expectedFim.setMonth(expectedFim.getMonth() + 6);
      expect(hook.getFiltros()).toEqual({
        dataInicial: '2026-06-30',
        dataFinal: expectedFim.toISOString().split('T')[0],
      });
      hook.unmount();
    });
  });
});
