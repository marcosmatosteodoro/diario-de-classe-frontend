import { render, screen, fireEvent, within } from '@testing-library/react';
import { AulaForm } from '.';

// Mock dos componentes. `FormSection` permanece real (`jest.requireActual`
// do barrel `@/components/ui` — nunca o barrel `@/components` completo, que
// reexporta este próprio `AulaForm` e criaria ciclo de módulo), para que os
// testes de AC-001-003/AC-001-013 exercitem a associação título↔grupo
// (fieldset/legend) de verdade, não um duplo.
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components/ui'),
  Form: ({ children, handleSubmit }) => (
    <form data-testid="aula-form" onSubmit={handleSubmit}>
      {children}
    </form>
  ),
  FormError: ({ title, errors }) => (
    <div data-testid="aula-form-error">
      {title && <div data-testid="aula-error-title">{title}</div>}
      {errors && <div data-testid="aula-errors">{JSON.stringify(errors)}</div>}
    </div>
  ),
  FormGroup: ({ children }) => (
    <div data-testid="aula-form-group">{children}</div>
  ),
  InputField: ({ htmlFor, label, value, onChange, type, required }) => (
    <div data-testid={`aula-input-${htmlFor}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && ' *'}
      </label>
      <input
        id={htmlFor}
        name={htmlFor}
        value={value || ''}
        onChange={onChange}
        type={type || 'text'}
        required={required}
      />
    </div>
  ),
  SelectField: ({ htmlFor, label, value, onChange, required, options }) => (
    <div data-testid={`aula-select-${htmlFor}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && ' *'}
      </label>
      <select
        id={htmlFor}
        name={htmlFor}
        value={value}
        onChange={onChange}
        required={required}
      >
        <option value="">Selecione...</option>
        {options?.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  TextAreaField: ({
    htmlFor,
    label,
    value,
    onChange,
    required,
    placeholder,
  }) => (
    <div data-testid={`aula-textarea-${htmlFor}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && ' *'}
      </label>
      <textarea
        id={htmlFor}
        name={htmlFor}
        value={value || ''}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
    </div>
  ),
  ButtonsFields: ({ isLoading, href }) => (
    <div data-testid="aula-buttons-fields">
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Carregando...' : 'Salvar'}
      </button>
      <a href={href}>Cancelar</a>
    </div>
  ),
}));

// Mock dos hooks
jest.mock('@/hooks/alunos/useAlunos', () => ({
  useAlunos: () => ({
    alunos: [
      { id: 1, nome: 'João', sobrenome: 'Silva', email: 'joao@example.com' },
    ],
  }),
}));

// `mockUseContratos`/`mockUseProfessores`/`mockUseUserAuth` (jest.fn) permitem
// sobrescrever o retorno por teste via `mockReturnValueOnce`, sem
// `jest.resetModules()` + `require('.')` fresco: `AulaForm` chama `useMemo`
// (React) direto — um segundo módulo `react` carregado por um `require`
// pós-reset teria dispatcher próprio e null, e a chamada do hook quebraria
// ("Invalid hook call").
const mockUseContratos = jest.fn(() => ({
  contratos: [
    {
      id: 1,
      idAluno: 1,
      status: 'ATIVO',
      dataInicio: '2024-01-01',
      dataTermino: '2024-12-31',
    },
  ],
}));
jest.mock('@/hooks/contratos/useContratos', () => ({
  useContratos: (...args) => mockUseContratos(...args),
}));

const mockUseProfessores = jest.fn(() => ({
  professores: [
    { id: 1, nome: 'Maria', sobrenome: 'Santos', email: 'maria@example.com' },
  ],
}));
jest.mock('@/hooks/professores/useProfessores', () => ({
  useProfessores: (...args) => mockUseProfessores(...args),
}));

jest.mock('@/hooks/useFormater', () => ({
  useFormater: () => ({
    dataFormatter: date => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR');
    },
  }),
}));

const mockUseUserAuth = jest.fn(() => ({
  isAdmin: () => true,
  currentUser: {
    id: 1,
    nome: 'Maria',
    sobrenome: 'Santos',
    email: 'maria@example.com',
  },
}));
jest.mock('@/providers/UserAuthProvider', () => ({
  useUserAuth: (...args) => mockUseUserAuth(...args),
}));

jest.mock('@/utils/getEntityOptions', () => ({
  getEntityOptions: entity => {
    if (Array.isArray(entity)) {
      return entity.map(e => ({
        value: e.id,
        label: `${e.nome} ${e.sobrenome} (${e.email})`,
      }));
    }
    return [];
  },
}));

describe('AulaForm', () => {
  const mockFormData = {
    idAluno: 1,
    idProfessor: 1,
    idContrato: 1,
    tipo: 'PADRAO',
    dataAula: '2024-03-11',
    horaInicial: '10:00',
    horaFinal: '11:00',
    observacao: 'Test observation',
    status: 'REALIZADA',
  };

  const mockHandleChange = jest.fn();
  const mockHandleSubmit = jest.fn(e => e.preventDefault());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with data-testid', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-form')).toBeInTheDocument();
    expect(screen.getByTestId('aula-form-error')).toBeInTheDocument();
    expect(screen.getAllByTestId('aula-form-group').length).toBeGreaterThan(0);
  });

  it('should render all input fields', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-select-idAluno')).toBeInTheDocument();
    expect(screen.getByTestId('aula-select-idProfessor')).toBeInTheDocument();
    expect(screen.getByTestId('aula-select-idContrato')).toBeInTheDocument();
    expect(screen.getByTestId('aula-select-tipo')).toBeInTheDocument();
    expect(screen.getByTestId('aula-input-dataAula')).toBeInTheDocument();
    expect(screen.getByTestId('aula-input-horaInicial')).toBeInTheDocument();
    expect(screen.getByTestId('aula-input-horaFinal')).toBeInTheDocument();
    expect(screen.getByTestId('aula-textarea-observacao')).toBeInTheDocument();
  });

  it('should render status field when isEdit is true', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={true}
      />
    );

    expect(screen.getByTestId('aula-select-status')).toBeInTheDocument();
  });

  it('should not render status field when isEdit is false', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.queryByTestId('aula-select-status')).not.toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    const errorMessage = 'Erro ao salvar aula';
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message={errorMessage}
        errors={['Erro 1', 'Erro 2']}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-error-title')).toHaveTextContent(
      errorMessage
    );
  });

  it('should call handleChange when input values change', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const dataAulaInput = screen
      .getByTestId('aula-input-dataAula')
      .querySelector('input');
    fireEvent.change(dataAulaInput, { target: { value: '2024-03-12' } });

    expect(mockHandleChange).toHaveBeenCalled();
  });

  it('should render form with correct initial values', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const dataAulaInput = screen
      .getByTestId('aula-input-dataAula')
      .querySelector('input');
    expect(dataAulaInput.value).toBe(mockFormData.dataAula);
  });

  it('should render buttons field component', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-buttons-fields')).toBeInTheDocument();
  });

  it('should disable submit button when isLoading is true', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={true}
        isEdit={false}
      />
    );

    const submitButton = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();
  });

  it('should call handleSubmit when form is submitted', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const form = screen.getByTestId('aula-form');
    fireEvent.submit(form);

    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('should display all form fields in create mode', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    // Verify all main fields are rendered
    expect(screen.getByTestId('aula-select-idAluno')).toBeInTheDocument();
    expect(screen.getByTestId('aula-select-idProfessor')).toBeInTheDocument();
    expect(screen.getByTestId('aula-select-idContrato')).toBeInTheDocument();
    expect(screen.getByTestId('aula-select-tipo')).toBeInTheDocument();
    expect(screen.getByTestId('aula-input-dataAula')).toBeInTheDocument();
    expect(screen.getByTestId('aula-input-horaInicial')).toBeInTheDocument();
    expect(screen.getByTestId('aula-input-horaFinal')).toBeInTheDocument();
    expect(screen.getByTestId('aula-textarea-observacao')).toBeInTheDocument();
  });

  it('should display all form fields in edit mode', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={true}
      />
    );

    // Verify all main fields plus status field in edit mode
    expect(screen.getByTestId('aula-select-idAluno')).toBeInTheDocument();
    expect(screen.getByTestId('aula-input-dataAula')).toBeInTheDocument();
    expect(screen.getByTestId('aula-select-status')).toBeInTheDocument();
  });

  it('should handle form data with special characters in observacao', () => {
    const specialCharFormData = {
      ...mockFormData,
      observacao: 'Test with special chars: !@#$%^&*()_+-=[]{}|;:",.<>?/\\',
    };

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={specialCharFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const observacaoField = screen
      .getByTestId('aula-textarea-observacao')
      .querySelector('textarea');
    expect(observacaoField.value).toBe(specialCharFormData.observacao);
  });

  it('should handle empty observacao field gracefully', () => {
    const emptyObservacaoData = {
      ...mockFormData,
      observacao: '',
    };

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={emptyObservacaoData}
        isLoading={false}
        isEdit={false}
      />
    );

    const observacaoField = screen
      .getByTestId('aula-textarea-observacao')
      .querySelector('textarea');
    expect(observacaoField.value).toBe('');
  });

  it('should handle null observacao', () => {
    const nullObservacaoData = {
      ...mockFormData,
      observacao: null,
    };

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={nullObservacaoData}
        isLoading={false}
        isEdit={false}
      />
    );

    const observacaoField = screen
      .getByTestId('aula-textarea-observacao')
      .querySelector('textarea');
    expect(observacaoField.value).toBe('');
  });
});

describe('AulaForm Edge Cases', () => {
  const mockFormData = {
    idAluno: 1,
    idProfessor: 1,
    idContrato: 1,
    tipo: 'PADRAO',
    dataAula: '2024-03-11',
    horaInicial: '10:00',
    horaFinal: '11:00',
    observacao: 'Test observation',
    status: 'REALIZADA',
  };

  const mockHandleChange = jest.fn();
  const mockHandleSubmit = jest.fn(e => e.preventDefault());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle form with all null values', () => {
    const nullFormData = {
      idAluno: null,
      idProfessor: null,
      idContrato: null,
      tipo: null,
      dataAula: null,
      horaInicial: null,
      horaFinal: null,
      observacao: null,
      status: null,
    };

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={nullFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-form')).toBeInTheDocument();
  });

  it('should handle form with empty string values', () => {
    const emptyFormData = {
      idAluno: '',
      idProfessor: '',
      idContrato: '',
      tipo: '',
      dataAula: '',
      horaInicial: '',
      horaFinal: '',
      observacao: '',
      status: '',
    };

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={emptyFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-form')).toBeInTheDocument();
  });

  it('should display multiple errors when provided', () => {
    const errors = ['Campo obrigatório', 'Horário inválido', 'Data no passado'];
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message="Erro ao salvar"
        errors={errors}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-form-error')).toBeInTheDocument();
  });

  it('should handle error message without errors array', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message="Erro desconhecido"
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.getByTestId('aula-error-title')).toHaveTextContent(
      'Erro desconhecido'
    );
  });

  it('should handle very long observacao text', () => {
    const longObservacao = 'x'.repeat(2000);
    const longObservacaoData = {
      ...mockFormData,
      observacao: longObservacao,
    };

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={longObservacaoData}
        isLoading={false}
        isEdit={false}
      />
    );

    const observacaoField = screen
      .getByTestId('aula-textarea-observacao')
      .querySelector('textarea');
    expect(observacaoField.value).toBe(longObservacao);
  });

  it('should maintain field values when error message changes', () => {
    const { rerender } = render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    let dataAulaInput = screen
      .getByTestId('aula-input-dataAula')
      .querySelector('input');
    expect(dataAulaInput.value).toBe(mockFormData.dataAula);

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message="Erro ao salvar"
        errors={['Erro']}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    dataAulaInput = screen
      .getByTestId('aula-input-dataAula')
      .querySelector('input');
    expect(dataAulaInput.value).toBe(mockFormData.dataAula);
  });

  it('should handle form rerender with different formData', () => {
    const firstFormData = {
      ...mockFormData,
      horaInicial: '09:00',
    };

    const secondFormData = {
      ...mockFormData,
      horaInicial: '14:00',
    };

    const { rerender } = render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={firstFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    let horaInicialInput = screen
      .getByTestId('aula-input-horaInicial')
      .querySelector('input');
    expect(horaInicialInput.value).toBe('09:00');

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={secondFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    horaInicialInput = screen
      .getByTestId('aula-input-horaInicial')
      .querySelector('input');
    expect(horaInicialInput.value).toBe('14:00');
  });

  it('should disable form submission when isLoading is true', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={true}
        isEdit={false}
      />
    );

    const submitButton = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();
  });

  it('should enable form submission when isLoading is false', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const submitButton = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('button[type="submit"]');
    expect(submitButton).not.toBeDisabled();
  });

  it('should handle rapid isLoading state changes', () => {
    const { rerender } = render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={true}
        isEdit={false}
      />
    );

    let submitButton = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    submitButton = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('button[type="submit"]');
    expect(submitButton).not.toBeDisabled();
  });
});

describe('AulaForm Mode Switching', () => {
  const mockFormData = {
    idAluno: 1,
    idProfessor: 1,
    idContrato: 1,
    tipo: 'PADRAO',
    dataAula: '2024-03-11',
    horaInicial: '10:00',
    horaFinal: '11:00',
    observacao: 'Test observation',
    status: 'REALIZADA',
  };

  const mockHandleChange = jest.fn();
  const mockHandleSubmit = jest.fn(e => e.preventDefault());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transition from create mode to edit mode', () => {
    const { rerender } = render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.queryByTestId('aula-select-status')).not.toBeInTheDocument();

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={true}
      />
    );

    expect(screen.getByTestId('aula-select-status')).toBeInTheDocument();
  });

  it('should transition from edit mode to create mode', () => {
    const { rerender } = render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={true}
      />
    );

    expect(screen.getByTestId('aula-select-status')).toBeInTheDocument();

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    expect(screen.queryByTestId('aula-select-status')).not.toBeInTheDocument();
  });

  it('should display correct status in edit mode with REALIZADA status', () => {
    const editModeData = {
      ...mockFormData,
      status: 'REALIZADA',
    };

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={editModeData}
        isLoading={false}
        isEdit={true}
      />
    );

    // Verify status field is rendered
    expect(screen.getByTestId('aula-select-status')).toBeInTheDocument();
  });

  it('should preserve form data when switching modes', () => {
    const { rerender } = render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    let horaInicialInput = screen
      .getByTestId('aula-input-horaInicial')
      .querySelector('input');
    expect(horaInicialInput.value).toBe(mockFormData.horaInicial);

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={true}
      />
    );

    horaInicialInput = screen
      .getByTestId('aula-input-horaInicial')
      .querySelector('input');
    expect(horaInicialInput.value).toBe(mockFormData.horaInicial);
  });
});

describe('AulaForm User Interactions', () => {
  const mockFormData = {
    idAluno: 1,
    idProfessor: 1,
    idContrato: 1,
    tipo: 'PADRAO',
    dataAula: '2024-03-11',
    horaInicial: '10:00',
    horaFinal: '11:00',
    observacao: 'Test observation',
    status: 'REALIZADA',
  };

  const mockHandleChange = jest.fn();
  const mockHandleSubmit = jest.fn(e => e.preventDefault());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call handleChange when multiple fields change', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const dataAulaInput = screen
      .getByTestId('aula-input-dataAula')
      .querySelector('input');
    fireEvent.change(dataAulaInput, { target: { value: '2024-03-12' } });

    const horaInicialInput = screen
      .getByTestId('aula-input-horaInicial')
      .querySelector('input');
    fireEvent.change(horaInicialInput, { target: { value: '11:00' } });

    expect(mockHandleChange).toHaveBeenCalledTimes(2);
  });

  it('should handle form submission with valid data', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const form = screen.getByTestId('aula-form');
    fireEvent.submit(form);

    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should display correct button label when loading', () => {
    const { rerender } = render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    let submitButton = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('button[type="submit"]');
    expect(submitButton.textContent).toBe('Salvar');

    rerender(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={true}
        isEdit={false}
      />
    );

    submitButton = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('button[type="submit"]');
    expect(submitButton.textContent).toBe('Carregando...');
  });

  it('should maintain cancel link in buttons fields', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const cancelLink = screen
      .getByTestId('aula-buttons-fields')
      .querySelector('a');
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink.textContent).toBe('Cancelar');
  });
});

// Cobre o conteúdo computado de `contratoOptions`/`professorOptions`: filtro
// por aluno, ordem ATIVO-primeiro, restrição do professor não-admin.
describe('AulaForm Non-Regression (AC-001-017)', () => {
  const mockHandleChange = jest.fn();
  const mockHandleSubmit = jest.fn(e => e.preventDefault());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // AC-001-017 (i)
  it('filters Contrato options to the selected aluno, excluding PENDENTE, with ATIVO first', () => {
    mockUseContratos.mockReturnValueOnce({
      contratos: [
        {
          id: 1,
          idAluno: 1,
          status: 'CONCLUIDO',
          dataInicio: '2023-01-01',
          dataTermino: '2023-12-31',
        },
        {
          id: 2,
          idAluno: 1,
          status: 'PENDENTE',
          dataInicio: '2024-01-01',
          dataTermino: '2024-12-31',
        },
        {
          id: 3,
          idAluno: 1,
          status: 'ATIVO',
          dataInicio: '2024-02-01',
          dataTermino: '2024-12-31',
        },
        {
          id: 4,
          idAluno: 2,
          status: 'ATIVO',
          dataInicio: '2024-01-01',
          dataTermino: '2024-12-31',
        },
      ],
    });

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={{ idAluno: 1 }}
        isLoading={false}
        isEdit={false}
      />
    );

    const contratoSelect = screen
      .getByTestId('aula-select-idContrato')
      .querySelector('select');
    const optionValues = Array.from(contratoSelect.querySelectorAll('option'))
      .map(opt => opt.value)
      .filter(value => value !== '');

    // aluno 2 (id=4) e o contrato PENDENTE (id=2) ficam fora; ATIVO (id=3)
    // vem antes do CONCLUIDO (id=1).
    expect(optionValues).toEqual(['3', '1']);
  });

  // AC-001-017 (iii)
  it('restricts Professor options to the current user when isAdmin is false', () => {
    mockUseUserAuth.mockReturnValueOnce({
      isAdmin: () => false,
      currentUser: {
        id: 2,
        nome: 'Carlos',
        sobrenome: 'Souza',
        email: 'carlos@example.com',
      },
    });
    mockUseProfessores.mockReturnValueOnce({
      professores: [
        { id: 1, nome: 'Ana', sobrenome: 'Lima', email: 'ana@example.com' },
        {
          id: 2,
          nome: 'Carlos',
          sobrenome: 'Souza',
          email: 'carlos@example.com',
        },
      ],
    });

    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={{ idProfessor: 2 }}
        isLoading={false}
        isEdit={false}
      />
    );

    const professorSelect = screen
      .getByTestId('aula-select-idProfessor')
      .querySelector('select');
    const optionValues = Array.from(professorSelect.querySelectorAll('option'))
      .map(opt => opt.value)
      .filter(value => value !== '');

    expect(optionValues).toEqual(['2']);
  });
});

describe('AulaForm Sections', () => {
  const mockFormData = {
    idAluno: 1,
    idProfessor: 1,
    idContrato: 1,
    tipo: 'PADRAO',
    dataAula: '2024-03-11',
    horaInicial: '10:00',
    horaFinal: '11:00',
    observacao: 'Test observation',
    status: 'REALIZADA',
  };

  const mockHandleChange = jest.fn();
  const mockHandleSubmit = jest.fn(e => e.preventDefault());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // AC-001-003, AC-001-013
  it('renders "Participantes" and "Detalhes da aula" sections in this order, without the Status field, in create mode', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const participantesSection = screen.getByRole('group', {
      name: 'Participantes',
    });
    const detalhesSection = screen.getByRole('group', {
      name: 'Detalhes da aula',
    });

    expect(participantesSection).toBeInTheDocument();
    expect(detalhesSection).toBeInTheDocument();
    expect(
      participantesSection.compareDocumentPosition(detalhesSection) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      within(participantesSection).getByTestId('aula-select-idAluno')
    ).toBeInTheDocument();
    expect(
      within(participantesSection).getByTestId('aula-select-idProfessor')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('aula-select-status')).not.toBeInTheDocument();
  });

  // AC-001-003
  it('renders the Status field inside the "Detalhes da aula" section in edit mode', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={true}
      />
    );

    const detalhesSection = screen.getByRole('group', {
      name: 'Detalhes da aula',
    });

    expect(
      within(detalhesSection).getByTestId('aula-select-status')
    ).toBeInTheDocument();
    expect(
      within(detalhesSection).getByTestId('aula-select-idContrato')
    ).toBeInTheDocument();
    expect(
      within(detalhesSection).getByTestId('aula-textarea-observacao')
    ).toBeInTheDocument();
  });

  // Retry pós-gate 11 (AC-001-003/FR-001-004, AC-001-016)
  it('wraps the three "Detalhes da aula" blocks in an internal grid gap-6 spacer', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const detalhesSection = screen.getByRole('group', {
      name: 'Detalhes da aula',
    });

    // children[0] é o <legend>; children[1] é o único filho de conteúdo.
    expect(detalhesSection.children).toHaveLength(2);
    const wrapper = detalhesSection.children[1];
    expect(wrapper).toHaveClass('grid');
    expect(wrapper).toHaveClass('gap-6');
    expect(
      within(wrapper).getByTestId('aula-select-idContrato')
    ).toBeInTheDocument();
    expect(
      within(wrapper).getByTestId('aula-textarea-observacao')
    ).toBeInTheDocument();
  });

  // Legítimo: "Participantes" tem um único filho direto e segue sem wrapper
  it('does not wrap "Participantes" content in a grid gap-6 spacer', () => {
    render(
      <AulaForm
        handleSubmit={mockHandleSubmit}
        message=""
        errors={null}
        handleChange={mockHandleChange}
        formData={mockFormData}
        isLoading={false}
        isEdit={false}
      />
    );

    const participantesSection = screen.getByRole('group', {
      name: 'Participantes',
    });

    // children[0] é o <legend>; children[1] é o FormGroup, sem wrapper extra.
    expect(participantesSection.children).toHaveLength(2);
    expect(participantesSection.children[1]).not.toHaveClass('grid');
  });
});
