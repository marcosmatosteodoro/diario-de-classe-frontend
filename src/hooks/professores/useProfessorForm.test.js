import { renderHook, act } from '@testing-library/react';
import util from 'node:util';
import { useProfessorForm } from './useProfessorForm';
import { PERMISSAO, IDIOMA } from '@/constants';

describe('useProfessorForm', () => {
  it('should initialize with default values if no professor is provided', () => {
    const { result } = renderHook(() =>
      useProfessorForm({ submit: jest.fn() })
    );
    expect(result.current.formData).toEqual({
      nome: '',
      sobrenome: '',
      email: '',
      telefone: '',
      senha: '',
      repetirSenha: '',
      idioma: IDIOMA.INGLES,
      idiomas: [IDIOMA.INGLES],
      permissao: PERMISSAO.MEMBER,
    });
    expect(result.current.isSenhaError).toBe(false);
    expect(result.current.alterarSenhaAtivo).toBe(false);
  });

  it('should initialize with professor values if provided', () => {
    const professor = {
      nome: 'Ana',
      sobrenome: 'Silva',
      email: 'ana@teste.com',
      telefone: '123456789',
      senha: 'abc123',
      repetirSenha: 'abc123',
      permissao: 'admin',
    };
    const { result } = renderHook(() =>
      useProfessorForm({ submit: jest.fn() })
    );
    // setFormData is exposed by the hook; use it to initialize form data
    act(() => {
      result.current.setFormData(professor);
    });
    expect(result.current.formData).toEqual(professor);
  });

  it('should update formData on handleChange', () => {
    const { result } = renderHook(() =>
      useProfessorForm({ submit: jest.fn() })
    );
    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'Carlos' },
      });
    });
    expect(result.current.formData.nome).toBe('Carlos');
  });

  it('should set isSenhaError true if senha and repetirSenha do not match on submit', () => {
    const submit = jest.fn();
    const { result } = renderHook(() => useProfessorForm({ submit }));
    act(() => {
      result.current.handleChange({ target: { name: 'senha', value: '123' } });
      result.current.handleChange({
        target: { name: 'repetirSenha', value: '456' },
      });
    });
    const mockEvent = { preventDefault: jest.fn() };
    act(() => {
      result.current.handleSubmit(mockEvent);
    });
    expect(result.current.isSenhaError).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });

  it('should call submit with correct data when senha matches repetirSenha', () => {
    const submit = jest.fn();
    const { result } = renderHook(() => useProfessorForm({ submit }));
    act(() => {
      result.current.handleChange({ target: { name: 'senha', value: '123' } });
      result.current.handleChange({
        target: { name: 'repetirSenha', value: '123' },
      });
      result.current.handleChange({
        target: { name: 'nome', value: 'Carlos' },
      });
      result.current.handleChange({
        target: { name: 'idioma', value: IDIOMA.INGLES },
      });
    });
    const mockEvent = { preventDefault: jest.fn() };
    act(() => {
      result.current.handleSubmit(mockEvent);
    });
    expect(result.current.isSenhaError).toBe(false);
    expect(submit).toHaveBeenCalledWith({
      id: null,
      dataToSend: {
        nome: 'Carlos',
        sobrenome: '',
        email: '',
        telefone: '',
        senha: '123',
        permissao: PERMISSAO.MEMBER,
        idiomas: [IDIOMA.INGLES],
      },
    });
  });

  it('should transform idioma to idiomas array and remove idioma field on submit', () => {
    const submit = jest.fn();
    const { result } = renderHook(() => useProfessorForm({ submit }));
    act(() => {
      result.current.handleChange({
        target: { name: 'senha', value: 'test123' },
      });
      result.current.handleChange({
        target: { name: 'repetirSenha', value: 'test123' },
      });
      result.current.handleChange({
        target: { name: 'idioma', value: IDIOMA.ESPANHOL },
      });
    });
    const mockEvent = { preventDefault: jest.fn() };
    act(() => {
      result.current.handleSubmit(mockEvent);
    });
    const callArgs = submit.mock.calls[0][0];
    expect(callArgs.dataToSend.idiomas).toEqual([IDIOMA.ESPANHOL]);
    expect(callArgs.dataToSend.idioma).toBeUndefined();
  });

  it('should handle FRANCES idioma correctly', () => {
    const submit = jest.fn();
    const { result } = renderHook(() => useProfessorForm({ submit }));
    act(() => {
      result.current.handleChange({
        target: { name: 'senha', value: 'test123' },
      });
      result.current.handleChange({
        target: { name: 'repetirSenha', value: 'test123' },
      });
      result.current.handleChange({
        target: { name: 'nome', value: 'Pierre' },
      });
      result.current.handleChange({
        target: { name: 'idioma', value: IDIOMA.FRANCES },
      });
    });
    const mockEvent = { preventDefault: jest.fn() };
    act(() => {
      result.current.handleSubmit(mockEvent);
    });
    expect(submit).toHaveBeenCalledWith({
      id: null,
      dataToSend: {
        nome: 'Pierre',
        sobrenome: '',
        email: '',
        telefone: '',
        senha: 'test123',
        permissao: PERMISSAO.MEMBER,
        idiomas: [IDIOMA.FRANCES],
      },
    });
  });

  // DEC-002-003 — estado de "Alterar senha"
  describe('alterarSenhaAtivo (DEC-002-003)', () => {
    it('criação sempre envia senha, mesmo sem acionar "Alterar senha"', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: false })
      );
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: 'segredo1' },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: 'segredo1' },
        });
      });
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });
      expect(submit.mock.calls[0][0].dataToSend.senha).toBe('segredo1');
    });

    it('edição sem acionar "Alterar senha" não envia senha no payload', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: true, id: 'p1' })
      );
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });
      expect(submit).toHaveBeenCalledWith({
        id: 'p1',
        dataToSend: expect.not.objectContaining({ senha: expect.anything() }),
      });
      const callArgs = submit.mock.calls[0][0];
      expect(callArgs.dataToSend.senha).toBeUndefined();
      expect(callArgs.dataToSend.repetirSenha).toBeUndefined();
    });

    it('acionar "Alterar senha" e depois cancelar: submissão em seguida não envia senha', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: true, id: 'p1' })
      );
      act(() => {
        result.current.handleAlterarSenha();
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: 'novaSenha1' },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: 'novaSenha1' },
        });
      });
      act(() => {
        result.current.handleCancelarAlteracaoSenha();
      });
      expect(result.current.alterarSenhaAtivo).toBe(false);
      expect(result.current.formData.senha).toBe('');
      expect(result.current.formData.repetirSenha).toBe('');

      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });
      const callArgs = submit.mock.calls[0][0];
      expect(callArgs.dataToSend.senha).toBeUndefined();
    });

    it('acionar "Alterar senha" com valores coincidentes envia a senha', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: true, id: 'p1' })
      );
      act(() => {
        result.current.handleAlterarSenha();
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: 'novaSenha1' },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: 'novaSenha1' },
        });
      });
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });
      expect(result.current.isSenhaError).toBe(false);
      expect(submit.mock.calls[0][0].dataToSend.senha).toBe('novaSenha1');
    });

    it('acionar "Alterar senha" com valores divergentes bloqueia o envio (isSenhaError)', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: true, id: 'p1' })
      );
      act(() => {
        result.current.handleAlterarSenha();
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: 'novaSenha1' },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: 'outraSenha' },
        });
      });
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });
      expect(result.current.isSenhaError).toBe(true);
      expect(submit).not.toHaveBeenCalled();
    });

    // `handleCancelarAlteracaoSenha` zera isSenhaError (AC-001-008/
    // FR-001-012) junto dos campos de senha — nenhuma transição que oculta
    // os campos deixa o erro de coincidência visível.
    it('cancelar após bloqueio por divergência zera isSenhaError junto com os campos de senha', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: true, id: 'p1' })
      );
      act(() => {
        result.current.handleAlterarSenha();
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: 'novaSenha1' },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: 'outraSenha' },
        });
      });
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });
      expect(result.current.isSenhaError).toBe(true);

      act(() => {
        result.current.handleCancelarAlteracaoSenha();
      });
      expect(result.current.isSenhaError).toBe(false);
      expect(result.current.formData.senha).toBe('');
      expect(result.current.formData.repetirSenha).toBe('');
    });

    // AC-001-015: erro do servidor não limpa o estado
    it('falha do submit não limpa formData.senha/repetirSenha nem alterarSenhaAtivo', () => {
      // `.catch` local evita rejeição não tratada no processo do Jest; o
      // hook não aguarda `submit`, então o teste só observa o estado do
      // formulário após a chamada, não a resolução da promise.
      const submit = jest
        .fn()
        .mockImplementation(() =>
          Promise.reject(new Error('falha no servidor')).catch(() => {})
        );
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: true, id: 'p1' })
      );
      act(() => {
        result.current.handleAlterarSenha();
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: 'novaSenha1' },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: 'novaSenha1' },
        });
      });
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });

      expect(result.current.formData.senha).toBe('novaSenha1');
      expect(result.current.formData.repetirSenha).toBe('novaSenha1');
      expect(result.current.alterarSenhaAtivo).toBe(true);
    });
  });

  // NFR-001-001 (metade frontend, COMP-002-007) — lições
  // prova-de-ausencia-em-log-serializa-como-o-console-e-cobre-o-erro-do-orm e
  // controle-positivo-e-por-assercao-nao-por-mecanismo.
  describe('Ausência de senha em log (NFR-001-001, metade frontend)', () => {
    // Valor sentinela: nunca deve aparecer, sob nenhuma forma, nos argumentos
    // capturados de console.log/console.warn/console.error.
    const SENHA = 'segredo-super-secreto-nfr-001-front';

    let logSpy, warnSpy, errorSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    // JSON.stringify(new Error(...)) vira '{}' — ausência infalsificável;
    // util.inspect com depth: null serializa mensagem, stack e propriedades
    // próprias do erro, como o console realmente formata.
    function capturedLogText() {
      return [logSpy, warnSpy, errorSpy]
        .flatMap(spy => spy.mock.calls)
        .flat()
        .map(arg => util.inspect(arg, { depth: null }))
        .join(' ');
    }

    function expectNoSenhaLogged() {
      expect(capturedLogText()).not.toContain(SENHA);
    }

    // Lição controle-positivo-e-por-assercao-nao-por-mecanismo: cada spy de
    // ausência (log/warn/error) tem seu próprio controle positivo nesta
    // suíte — 3 spies, 3 controles positivos.
    test('controle positivo: console.log dispara e é capturado pelo spy', () => {
      const marcador = 'controle-positivo-console-log';
      console.log(marcador);
      expect(logSpy).toHaveBeenCalledWith(marcador);
    });

    test('controle positivo: console.warn dispara e é capturado pelo spy', () => {
      const marcador = 'controle-positivo-console-warn';
      console.warn(marcador);
      expect(warnSpy).toHaveBeenCalledWith(marcador);
    });

    test('controle positivo: console.error dispara e é capturado pelo spy', () => {
      const marcador = 'controle-positivo-console-error';
      console.error(marcador);
      expect(errorSpy).toHaveBeenCalledWith(marcador);
    });

    // Controle de detecção: a ausência não é vácua — se algo logasse a senha,
    // a captura a detectaria. Loga um `Error` (não uma string simples) para
    // que o mutante que troca a serialização por `JSON.stringify` (Error
    // vira '{}') derrube este teste sem tocar nele.
    test('controle de detecção: argumento logado contendo a senha faz o texto capturado conter a senha', () => {
      console.log(new Error(`valor logado de exemplo: ${SENHA}`));
      expect(capturedLogText()).toContain(SENHA);
    });

    test('useProfessorForm em criação com senha preenchida (incluindo o submit) não loga a senha', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: false })
      );
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: SENHA },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: SENHA },
        });
      });
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });

      expect(submit).toHaveBeenCalled();
      expectNoSenhaLogged();
    });

    test('useProfessorForm em edição, acionado "Alterar senha", com senha preenchida (incluindo o submit) não loga a senha', () => {
      const submit = jest.fn();
      const { result } = renderHook(() =>
        useProfessorForm({ submit, isEdit: true, id: 'p1' })
      );
      act(() => {
        result.current.handleAlterarSenha();
      });
      act(() => {
        result.current.handleChange({
          target: { name: 'senha', value: SENHA },
        });
        result.current.handleChange({
          target: { name: 'repetirSenha', value: SENHA },
        });
      });
      act(() => {
        result.current.handleSubmit({ preventDefault: jest.fn() });
      });

      expect(submit).toHaveBeenCalled();
      expectNoSenhaLogged();
    });
  });
});
