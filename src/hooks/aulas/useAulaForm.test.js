import { createElement } from 'react';
import { renderHook, act } from '@testing-library/react';
import { mountRaw } from '@/utils/mountRaw';
import { todayLocalDate } from '@/utils/todayLocalDate';
import { useAulaForm } from './useAulaForm';

// `mountRaw` (ACH-10) cuida do `flushSync`/supressão de aviso de `act`
// compartilhados entre os 7 testes que precisam observar estado pré-efeito;
// só o que varia por hook fica aqui: o `Harness` e como ler `dataAula` do
// DOM (não de uma variável capturada por fora do componente, para manter o
// harness puro).
function mountHookRaw(hookArgs) {
  function Harness() {
    const { formData } = useAulaForm(hookArgs);
    return createElement(
      'div',
      { 'data-testid': 'dataAula' },
      formData.dataAula === null ? '' : formData.dataAula
    );
  }
  const hook = mountRaw(createElement(Harness));
  return {
    ...hook,
    getDataAula() {
      const text = hook.container.querySelector(
        '[data-testid="dataAula"]'
      ).textContent;
      return text === '' ? null : text;
    },
  };
}

describe('useAulaForm', () => {
  describe('Form State Management', () => {
    it('should update formData on handleChange', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'idAluno', value: '123' },
        });
      });
      expect(result.current.formData.idAluno).toBe('123');
    });

    it('should update formData for multiple fields', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'idAluno', value: '1' },
        });
        result.current.handleChange({
          target: { name: 'idProfessor', value: '2' },
        });
        result.current.handleChange({
          target: { name: 'tipo', value: 'REPOSICAO' },
        });
      });
      expect(result.current.formData.idAluno).toBe('1');
      expect(result.current.formData.idProfessor).toBe('2');
      expect(result.current.formData.tipo).toBe('REPOSICAO');
    });

    it('should allow setFormData to update the whole form', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.setFormData({
          idAluno: '10',
          idProfessor: '20',
          idContrato: '30',
          dataAula: '2024-03-04',
          horaInicial: '10:00',
          horaFinal: '11:00',
          tipo: 'PADRAO',
          status: 'AGENDADA',
          observacao: 'Teste',
        });
      });
      expect(result.current.formData.idAluno).toBe('10');
      expect(result.current.formData.horaInicial).toBe('10:00');
      expect(result.current.formData.observacao).toBe('Teste');
    });

    it('should initialize with today date', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-15T12:00:00.000-03:00'));
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      // Literal fixo (fuso local, `todayLocalDate`) — não recalculado pelo
      // mesmo algoritmo da produção (ACH-08).
      expect(result.current.formData.dataAula).toBe('2026-01-15');
      jest.useRealTimers();
    });
  });

  describe('Hora Final Calculation', () => {
    it('should calculate horaFinal when horaInicial changes with fixed duracaoAula', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'horaInicial', value: '09:00' },
        });
      });
      expect(result.current.formData.horaFinal).toBe('09:40'); // 40 min default
    });

    it('should preserve duracaoAula when changing horaInicial', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'horaInicial', value: '10:00' },
        });
      });
      // duracaoAula should be preserved (default is 40)
      expect(result.current.formData.horaFinal).toBe('10:40');
    });

    it('should calculate horaFinal correctly when both horaInicial and duracaoAula are set', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.setFormData({
          idAluno: '',
          idProfessor: '',
          idContrato: '',
          dataAula: new Date().toISOString().split('T')[0],
          duracaoAula: 60,
          horaInicial: '10:00',
          horaFinal: '',
          tipo: 'PADRAO',
          status: 'AGENDADA',
          observacao: '',
        });
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'duracaoAula', value: 60 },
        });
      });
      expect(result.current.formData.horaFinal).toBe('11:00');
    });

    it('should calculate horaFinal with 80 minute duration when both fields are set', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.setFormData(prev => ({
          ...prev,
          horaInicial: '14:00',
          duracaoAula: 80,
        }));
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'duracaoAula', value: 80 },
        });
      });
      expect(result.current.formData.horaFinal).toBe('15:20');
    });

    it('should handle horaFinal calculation across midnight', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.setFormData(prev => ({
          ...prev,
          horaInicial: '23:40',
          duracaoAula: 40,
        }));
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'duracaoAula', value: 40 },
        });
      });
      expect(result.current.formData.horaFinal).toBe('00:20');
    });

    it('should not calculate horaFinal if horaInicial is empty', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'duracaoAula', value: 60 },
        });
      });
      // horaFinal should be NaN:NaN when horaInicial is empty
      expect(result.current.formData.horaFinal).toMatch(/NaN/);
    });
  });

  describe('Form Submission', () => {
    it('should call submit on handleSubmit and format dataAula as ISO', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: 1, submit }));
      const fakeEvent = { preventDefault: jest.fn() };
      // `todayLocalDate()`, não `new Date().toISOString()`: o campo é
      // `<input type="date">`, que trabalha em data local — em UTC-3, das
      // 21h em diante `.toISOString()` já virou o dia seguinte em UTC
      // (mesmo bug que `todayLocalDate.js` documenta e corrige).
      const todayStr = todayLocalDate();
      act(() => {
        result.current.handleChange({
          target: { name: 'dataAula', value: todayStr },
        });
        result.current.handleSubmit(fakeEvent);
      });
      expect(submit).toHaveBeenCalledWith({
        id: 1,
        dataToSend: expect.objectContaining({
          dataAula: expect.stringMatching(new RegExp(`^${todayStr}T00:00:00`)),
        }),
      });
      expect(fakeEvent.preventDefault).toHaveBeenCalled();
    });

    it('should format duracaoAula as integer on submit', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      const fakeEvent = { preventDefault: jest.fn() };
      act(() => {
        result.current.setFormData(prev => ({
          ...prev,
          duracaoAula: 60,
        }));
      });
      act(() => {
        result.current.handleSubmit(fakeEvent);
      });
      const callArgs = submit.mock.calls[0][0];
      expect(typeof callArgs.dataToSend.duracaoAula).toBe('number');
      expect(Number.isInteger(callArgs.dataToSend.duracaoAula)).toBe(true);
      expect(callArgs.dataToSend.duracaoAula).toBe(60);
    });

    it('should include all form fields on submit', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: 5, submit }));
      const fakeEvent = { preventDefault: jest.fn() };
      const today = new Date().toISOString().split('T')[0];
      act(() => {
        result.current.setFormData({
          idAluno: '10',
          idProfessor: '20',
          idContrato: '30',
          dataAula: today,
          durcaoAula: 60,
          horaInicial: '09:00',
          horaFinal: '10:00',
          tipo: 'REPOSICAO',
          status: 'CONCLUIDA',
          observacao: 'Test observation',
        });
      });
      act(() => {
        result.current.handleSubmit(fakeEvent);
      });
      const callArgs = submit.mock.calls[0][0];
      expect(callArgs.id).toBe(5);
      expect(callArgs.dataToSend.idAluno).toBe('10');
      expect(callArgs.dataToSend.idProfessor).toBe('20');
      expect(callArgs.dataToSend.idContrato).toBe('30');
      expect(callArgs.dataToSend.horaInicial).toBe('09:00');
      expect(callArgs.dataToSend.tipo).toBe('REPOSICAO');
      expect(callArgs.dataToSend.status).toBe('CONCLUIDA');
      expect(callArgs.dataToSend.observacao).toBe('Test observation');
    });
  });

  describe('Default Values', () => {
    it('should initialize with default duracaoAula', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      expect(result.current.formData.duracaoAula).toBeDefined();
    });

    it('should initialize with PADRAO type', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      expect(result.current.formData.tipo).toBe('PADRAO');
    });

    it('should initialize with AGENDADA status', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      expect(result.current.formData.status).toBe('AGENDADA');
    });

    it('should initialize with empty observacao', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      expect(result.current.formData.observacao).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty horaInicial gracefully', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'horaInicial', value: '' },
        });
      });
      expect(result.current.formData.horaInicial).toBe('');
    });

    it('should preserve other fields when updating horaInicial', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'idAluno', value: '5' },
        });
        result.current.handleChange({
          target: { name: 'horaInicial', value: '10:00' },
        });
      });
      expect(result.current.formData.idAluno).toBe('5');
      expect(result.current.formData.horaInicial).toBe('10:00');
    });

    it('should handle duracaoAula change with empty horaInicial', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'duracaoAula', value: 60 },
        });
      });
      expect(result.current.formData.duracaoAula).toBe(60);
    });

    it('should maintain formData integrity across rapid updates', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));
      act(() => {
        result.current.handleChange({
          target: { name: 'idAluno', value: '1' },
        });
        result.current.handleChange({
          target: { name: 'idProfessor', value: '2' },
        });
        result.current.handleChange({
          target: { name: 'idContrato', value: '3' },
        });
        result.current.handleChange({
          target: { name: 'horaInicial', value: '10:00' },
        });
        result.current.handleChange({
          target: { name: 'duracaoAula', value: 60 },
        });
      });
      expect(result.current.formData.idAluno).toBe('1');
      expect(result.current.formData.idProfessor).toBe('2');
      expect(result.current.formData.idContrato).toBe('3');
      expect(result.current.formData.horaInicial).toBe('10:00');
      expect(result.current.formData.duracaoAula).toBe(60);
    });
  });

  describe('Integration Tests', () => {
    it('should update horaFinal when both horaInicial and duracaoAula change', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));

      act(() => {
        result.current.handleChange({
          target: { name: 'horaInicial', value: '08:00' },
        });
      });
      expect(result.current.formData.horaFinal).toBe('08:40');

      act(() => {
        result.current.handleChange({
          target: { name: 'duracaoAula', value: 80 },
        });
      });
      expect(result.current.formData.horaFinal).toBe('09:20');
    });

    it('should preserve horaFinal calculation consistency', () => {
      const submit = jest.fn();
      const { result } = renderHook(() => useAulaForm({ id: null, submit }));

      const times = [
        { horaInicial: '07:00', duracaoAula: 40, expected: '07:40' },
        { horaInicial: '12:00', duracaoAula: 60, expected: '13:00' },
        { horaInicial: '15:30', duracaoAula: 80, expected: '16:50' },
      ];

      times.forEach(({ horaInicial, duracaoAula, expected }) => {
        act(() => {
          result.current.setFormData(prev => ({
            ...prev,
            horaInicial,
            duracaoAula,
          }));
        });
        act(() => {
          result.current.handleChange({
            target: { name: 'duracaoAula', value: duracaoAula },
          });
        });
        expect(result.current.formData.horaFinal).toBe(expected);
      });
    });
  });

  describe('dataAula default estável até montar (AC-001-006)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('paridade: dataAula nasce null independente do relógio do sistema', () => {
      const submit = jest.fn();

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-30T23:59:59.000Z'));
      const hook1 = mountHookRaw({ id: null, submit });
      expect(hook1.getDataAula()).toBeNull();
      hook1.unmount();

      jest.setSystemTime(new Date('2026-07-01T00:00:01.000Z'));
      const hook2 = mountHookRaw({ id: null, submit });
      expect(hook2.getDataAula()).toBeNull();
      hook2.unmount();
    });

    it('preenchimento pós-montagem: dataAula passa a refletir o dia real no instante T', async () => {
      const submit = jest.fn();
      jest.useFakeTimers();
      // Instantes com offset explícito `-03:00`: `todayLocalDate` lê o
      // relógio no fuso local, não em UTC — usar `Z` aqui deslocaria a
      // fronteira do dia em 3h e o teste passaria a afirmar o dia errado.
      jest.setSystemTime(new Date('2026-06-30T23:59:59.000-03:00'));

      const hook1 = mountHookRaw({ id: null, submit });
      expect(hook1.getDataAula()).toBeNull();
      await hook1.flush();
      expect(hook1.getDataAula()).toBe('2026-06-30');
      hook1.unmount();

      jest.setSystemTime(new Date('2026-07-01T00:00:01.000-03:00'));
      const hook2 = mountHookRaw({ id: null, submit });
      expect(hook2.getDataAula()).toBeNull();
      await hook2.flush();
      expect(hook2.getDataAula()).toBe('2026-07-01');
      hook2.unmount();
    });
  });
});
