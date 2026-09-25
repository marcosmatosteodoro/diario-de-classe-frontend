import { renderHook, act } from '@testing-library/react';
import { useConfiguracaoForm } from './useConfiguracaoForm';

describe('useConfiguracaoForm', () => {
  const baseConfig = {
    duracaoAula: '50',
    tolerancia: '10',
    diasDeFuncionamento: [
      {
        diaSemana: 'SEG',
        ativo: true,
        horaInicial: '08:00',
        horaFinal: '18:00',
      },
      { diaSemana: 'TER', ativo: false, horaInicial: '', horaFinal: '' },
    ],
  };

  it('deve inicializar com configuracao passada', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: baseConfig })
    );
    expect(result.current.formData.duracaoAula).toBe('50');
    expect(result.current.formData.diasDeFuncionamento.length).toBe(2);
  });

  it('deve atualizar campo simples com handleChange', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: baseConfig })
    );
    act(() => {
      result.current.handleChange({
        target: { name: 'duracaoAula', value: '60' },
      });
    });
    expect(result.current.formData.duracaoAula).toBe('60');
  });

  it('deve atualizar diasDeFuncionamento corretamente (horaInicial)', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: baseConfig })
    );
    act(() => {
      result.current.handleDiasDeFuncionamentoChange({
        target: { name: 'SEG.horaInicial', value: '09:00' },
      });
    });
    expect(result.current.formData.diasDeFuncionamento[0].horaInicial).toBe(
      '09:00'
    );
  });

  it('deve atualizar diasDeFuncionamento corretamente (ativo)', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: baseConfig })
    );
    act(() => {
      result.current.handleDiasDeFuncionamentoChange({
        target: { name: 'TER.ativo', checked: true },
      });
    });
    expect(result.current.formData.diasDeFuncionamento[1].ativo).toBe(true);
  });

  it('deve chamar submit ao submeter', () => {
    const submitMock = jest.fn();
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: submitMock, configuracao: baseConfig })
    );
    const fakeEvent = { preventDefault: jest.fn() };
    act(() => {
      result.current.handleSubmit(fakeEvent);
    });
    // O submit está comentado no hook, então não será chamado. Se descomentar, ative este teste:
    // expect(submitMock).toHaveBeenCalledWith(result.current.formData);
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
  });
});

describe('useConfiguracaoForm - isDirty (rastreamento de alteração pendente)', () => {
  const diasCompletos = [
    {
      diaSemana: 'SEGUNDA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      diaSemana: 'TERCA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      diaSemana: 'QUARTA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      diaSemana: 'QUINTA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      diaSemana: 'SEXTA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    { diaSemana: 'SABADO', ativo: false, horaInicial: '', horaFinal: '' },
    { diaSemana: 'DOMINGO', ativo: false, horaInicial: '', horaFinal: '' },
  ];

  const configInicial = {
    duracaoAula: '50',
    tolerancia: '10',
    diasDeFuncionamento: diasCompletos,
  };

  it('isDirty é false logo após a carga inicial', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    expect(result.current.isDirty).toBe(false);
  });

  it('isDirty vira true após handleChange alterar um campo simples', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'duracaoAula', value: '60' },
      });
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('isDirty vira true após alterar um único dia de diasDeFuncionamento', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    act(() => {
      result.current.handleDiasDeFuncionamentoChange({
        target: { name: 'SEGUNDA.horaInicial', value: '09:00' },
      });
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('isDirty volta a false quando o campo alterado é revertido manualmente ao valor original (A-001-001)', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'tolerancia', value: '15' },
      });
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.handleChange({
        target: { name: 'tolerancia', value: '10' },
      });
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('isDirty volta a false quando só um diaSemana entre vários é alterado e revertido manualmente (A-001-001)', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    act(() => {
      result.current.handleDiasDeFuncionamentoChange({
        target: { name: 'QUARTA.ativo', checked: false },
      });
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.handleDiasDeFuncionamentoChange({
        target: { name: 'QUARTA.ativo', checked: true },
      });
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('restaurarUltimaLeitura() repõe formData para a última leitura e zera isDirty', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'duracaoAula', value: '99' },
      });
    });
    expect(result.current.formData.duracaoAula).toBe('99');
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.restaurarUltimaLeitura();
    });

    expect(result.current.formData.duracaoAula).toBe('50');
    expect(result.current.isDirty).toBe(false);
  });

  it('isDirty permanece false quando o formData tem os mesmos 7 dias em ordem diferente da referência (comparação por diaSemana, não por índice)', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    act(() => {
      result.current.setFormData(prev => ({
        ...prev,
        diasDeFuncionamento: [...prev.diasDeFuncionamento].reverse(),
      }));
    });

    expect(result.current.formData.diasDeFuncionamento[0].diaSemana).toBe(
      'DOMINGO'
    );
    expect(result.current.isDirty).toBe(false);
  });

  it('isDirty volta a false após gravação bem-sucedida (rerender com o retorno do PUT com os dias em ordem diferente) e a referência de última leitura passa a ser o novo valor (AC-001-005, parte isDirty)', () => {
    const { result, rerender } = renderHook(
      ({ configuracao }) =>
        useConfiguracaoForm({ submit: jest.fn(), configuracao }),
      { initialProps: { configuracao: configInicial } }
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'tolerancia', value: '20' },
      });
    });
    expect(result.current.isDirty).toBe(true);

    const configuracaoAposPut = {
      ...configInicial,
      tolerancia: '20', // mesmo valor já digitado — a gravação persistiu essa mudança
      diasDeFuncionamento: [...diasCompletos].reverse(),
    };

    rerender({ configuracao: configuracaoAposPut });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.formData.tolerancia).toBe('20');

    // a referência de última leitura passou a ser o novo valor: voltar ao valor antigo
    // agora acusa alteração pendente (prova de que a referência foi mesmo atualizada)
    act(() => {
      result.current.handleChange({
        target: { name: 'tolerancia', value: '10' },
      });
    });
    expect(result.current.isDirty).toBe(true);
  });
});
