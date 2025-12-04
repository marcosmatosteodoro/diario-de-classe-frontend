import { renderHook, act } from '@testing-library/react';
import { useAlunoForm } from './useAlunoForm';

describe('useAlunoForm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAlunoForm({ submit: jest.fn() }));
    expect(result.current.formData).toEqual({
      nome: '',
      sobrenome: '',
      email: '',
      telefone: '',
    });
  });

  it('should initialize with provided id', () => {
    const { result } = renderHook(() =>
      useAlunoForm({ id: 123, submit: jest.fn() })
    );
    // O id não altera o formData inicial, apenas é usado no submit
    expect(result.current.formData).toEqual({
      nome: '',
      sobrenome: '',
      email: '',
      telefone: '',
    });
  });

  it('should update formData on handleChange', () => {
    const { result } = renderHook(() => useAlunoForm({ submit: jest.fn() }));

    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'João' },
      });
    });

    expect(result.current.formData.nome).toBe('João');
  });

  it('should update multiple fields correctly', () => {
    const { result } = renderHook(() => useAlunoForm({ submit: jest.fn() }));

    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'João' },
      });
      result.current.handleChange({
        target: { name: 'sobrenome', value: 'Silva' },
      });
      result.current.handleChange({
        target: { name: 'email', value: 'joao@test.com' },
      });
      result.current.handleChange({
        target: { name: 'telefone', value: '11999999999' },
      });
    });

    expect(result.current.formData).toEqual({
      nome: 'João',
      sobrenome: 'Silva',
      email: 'joao@test.com',
      telefone: '11999999999',
    });
  });

  it('should call submit with correct data when handleSubmit is called', () => {
    const mockSubmit = jest.fn();
    const { result } = renderHook(() => useAlunoForm({ submit: mockSubmit }));

    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'Maria' },
      });
      result.current.handleChange({
        target: { name: 'email', value: 'maria@test.com' },
      });
    });

    const mockEvent = { preventDefault: jest.fn() };

    act(() => {
      result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockSubmit).toHaveBeenCalledWith({
      id: null,
      dataToSend: {
        nome: 'Maria',
        sobrenome: '',
        email: 'maria@test.com',
        telefone: '',
      },
    });
  });

  it('should call submit with id when provided', () => {
    const mockSubmit = jest.fn();
    const { result } = renderHook(() =>
      useAlunoForm({ id: 456, submit: mockSubmit })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'Carlos' },
      });
    });

    const mockEvent = { preventDefault: jest.fn() };

    act(() => {
      result.current.handleSubmit(mockEvent);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      id: 456,
      dataToSend: {
        nome: 'Carlos',
        sobrenome: '',
        email: '',
        telefone: '',
      },
    });
  });

  it('should update formData using setFormData', () => {
    const { result } = renderHook(() => useAlunoForm({ submit: jest.fn() }));

    const newData = {
      nome: 'Ana',
      sobrenome: 'Santos',
      email: 'ana@test.com',
      telefone: '11988888888',
    };

    act(() => {
      result.current.setFormData(newData);
    });

    expect(result.current.formData).toEqual(newData);
  });

  it('should partially update formData using setFormData with function', () => {
    const { result } = renderHook(() => useAlunoForm({ submit: jest.fn() }));

    act(() => {
      result.current.setFormData({
        nome: 'Pedro',
        sobrenome: 'Oliveira',
        email: 'pedro@test.com',
        telefone: '11977777777',
      });
    });

    act(() => {
      result.current.setFormData(prev => ({
        ...prev,
        nome: 'Pedro Henrique',
      }));
    });

    expect(result.current.formData).toEqual({
      nome: 'Pedro Henrique',
      sobrenome: 'Oliveira',
      email: 'pedro@test.com',
      telefone: '11977777777',
    });
  });

  it('should handle empty values correctly', () => {
    const mockSubmit = jest.fn();
    const { result } = renderHook(() => useAlunoForm({ submit: mockSubmit }));

    const mockEvent = { preventDefault: jest.fn() };

    act(() => {
      result.current.handleSubmit(mockEvent);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      id: null,
      dataToSend: {
        nome: '',
        sobrenome: '',
        email: '',
        telefone: '',
      },
    });
  });

  it('should preserve previous values when updating single field', () => {
    const { result } = renderHook(() => useAlunoForm({ submit: jest.fn() }));

    act(() => {
      result.current.handleChange({
        target: { name: 'nome', value: 'João' },
      });
      result.current.handleChange({
        target: { name: 'email', value: 'joao@test.com' },
      });
    });

    expect(result.current.formData.nome).toBe('João');
    expect(result.current.formData.email).toBe('joao@test.com');
    expect(result.current.formData.sobrenome).toBe('');
    expect(result.current.formData.telefone).toBe('');
  });

  it('should return all expected properties', () => {
    const { result } = renderHook(() => useAlunoForm({ submit: jest.fn() }));

    expect(result.current).toEqual({
      formData: expect.any(Object),
      handleSubmit: expect.any(Function),
      handleChange: expect.any(Function),
      setFormData: expect.any(Function),
    });
  });
});
