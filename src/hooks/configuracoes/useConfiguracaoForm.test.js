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
      {
        diaSemana: 'TER',
        ativo: false,
        horaInicial: '08:00',
        horaFinal: '18:00',
      },
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
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledWith(result.current.formData);
  });
});

describe('useConfiguracaoForm - isDirty (rastreamento de alteração pendente)', () => {
  const diasCompletos = [
    {
      id: 'dia-segunda',
      diaSemana: 'SEGUNDA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      id: 'dia-terca',
      diaSemana: 'TERCA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      id: 'dia-quarta',
      diaSemana: 'QUARTA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      id: 'dia-quinta',
      diaSemana: 'QUINTA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      id: 'dia-sexta',
      diaSemana: 'SEXTA',
      ativo: true,
      horaInicial: '08:00',
      horaFinal: '18:00',
    },
    {
      id: 'dia-sabado',
      diaSemana: 'SABADO',
      ativo: false,
      horaInicial: '',
      horaFinal: '',
    },
    {
      id: 'dia-domingo',
      diaSemana: 'DOMINGO',
      ativo: false,
      horaInicial: '',
      horaFinal: '',
    },
  ];

  // Shape do contrato: duracaoAula/tolerancia number (Prisma Int), como a API devolve —
  // não string, como o input entrega.
  const configInicial = {
    duracaoAula: 50,
    tolerancia: 10,
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

  it('isDirty permanece true quando o valor digitado é numericamente diferente da referência (não normaliza demais)', () => {
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: jest.fn(), configuracao: configInicial })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'tolerancia', value: '11' },
      });
    });

    expect(result.current.isDirty).toBe(true);
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

    expect(result.current.formData.duracaoAula).toBe(50);
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
      tolerancia: 20, // number — a API devolve number (Prisma Int), mesmo valor já digitado
      diasDeFuncionamento: [...diasCompletos].reverse(),
    };

    rerender({ configuracao: configuracaoAposPut });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.formData.tolerancia).toBe(20);

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

describe('useConfiguracaoForm — validação client-side no handleSubmit (TASK-002-006)', () => {
  const diasValidos = [
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
  ];

  const configValida = {
    duracaoAula: 50,
    tolerancia: 10,
    diasDeFuncionamento: diasValidos,
  };

  const fakeEvent = () => ({ preventDefault: jest.fn() });

  it('com duracaoAula inválida (vazia), handleSubmit não chama submit() e popula errosValidacao.duracaoAula', () => {
    const submitMock = jest.fn();
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: submitMock, configuracao: configValida })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'duracaoAula', value: '' },
      });
    });

    act(() => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(submitMock).not.toHaveBeenCalled();
    expect(result.current.errosValidacao.duracaoAula).toBe('Campo obrigatório');
  });

  it('com um dia com horaFinal <= horaInicial, handleSubmit não chama submit() e popula errosValidacao.diasDeFuncionamento nesse dia', () => {
    const submitMock = jest.fn();
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: submitMock, configuracao: configValida })
    );

    act(() => {
      result.current.handleDiasDeFuncionamentoChange({
        target: { name: 'TERCA.horaFinal', value: '07:00' },
      });
    });

    act(() => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(submitMock).not.toHaveBeenCalled();
    expect(
      result.current.errosValidacao.diasDeFuncionamento.TERCA.horaFinal
    ).toBe('A hora final deve ser maior que a hora inicial.');
    // sem indicar outro dia (AC-001-007)
    expect(result.current.errosValidacao.diasDeFuncionamento.SEGUNDA).toEqual({
      horaInicial: undefined,
      horaFinal: undefined,
    });
  });

  it('com todos os dados válidos, handleSubmit chama submit(formData) e não popula erros', () => {
    const submitMock = jest.fn();
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: submitMock, configuracao: configValida })
    );

    act(() => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(submitMock).toHaveBeenCalledWith(result.current.formData);
    expect(result.current.errosValidacao.duracaoAula).toBeUndefined();
    expect(result.current.errosValidacao.tolerancia).toBeUndefined();
  });

  it('corrigir o erro e submeter de novo limpa errosValidacao e chama submit()', () => {
    const submitMock = jest.fn();
    const { result } = renderHook(() =>
      useConfiguracaoForm({ submit: submitMock, configuracao: configValida })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'tolerancia', value: '0' },
      });
    });
    act(() => {
      result.current.handleSubmit(fakeEvent());
    });
    expect(submitMock).not.toHaveBeenCalled();
    expect(result.current.errosValidacao.tolerancia).toBe('Não pode ser zero');

    act(() => {
      result.current.handleChange({
        target: { name: 'tolerancia', value: '10' },
      });
    });
    act(() => {
      result.current.handleSubmit(fakeEvent());
    });

    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(result.current.errosValidacao.tolerancia).toBeUndefined();
  });
});
