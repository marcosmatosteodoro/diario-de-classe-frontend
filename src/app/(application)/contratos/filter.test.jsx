import { render, screen, fireEvent } from '@testing-library/react';
import { Filter } from './filter';
import { IDIOMA_ARRAY, IDIOMA_LABEL } from '@/constants';

// Mock do getEntityOptions
jest.mock('@/utils/getEntityOptions', () => ({
  getEntityOptions: jest.fn(entities =>
    entities.map(entity => ({
      label: `${entity.nome} - ${entity.email}`,
      value: entity.id,
    }))
  ),
}));

// Mock dos componentes
jest.mock('@/components', () => ({
  Form: ({ children, handleSubmit }) => (
    <form onSubmit={handleSubmit} data-testid="filter-form">
      {children}
    </form>
  ),
  FormGroup: ({ children }) => <div data-testid="form-group">{children}</div>,
  InputField: ({ htmlFor, label, type, onChange, value, required }) => (
    <div data-testid={`input-${htmlFor}`}>
      <label htmlFor={htmlFor}>{label}</label>
      <input
        id={htmlFor}
        name={htmlFor}
        type={type}
        onChange={onChange}
        value={value}
        required={required}
        data-testid={`input-field-${htmlFor}`}
      />
    </div>
  ),
  SelectField: ({ htmlFor, label, placeholder, options, onChange, value }) => (
    <div data-testid={`select-${htmlFor}`}>
      <label htmlFor={htmlFor}>{label}</label>
      <select
        id={htmlFor}
        name={htmlFor}
        onChange={onChange}
        value={value}
        data-testid={`select-field-${htmlFor}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option, idx) => (
          <option key={idx} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
  // Estande equivalente ao SelectField acima (mesma superfície observável:
  // label, options, onChange no formato { target: { name, value } }), mas
  // sem <select>/<option> nativos — reflete o widget combobox real
  // (SearchableSelectField exibe o rótulo resolvido, não o id bruto).
  SearchableSelectField: ({
    htmlFor,
    label,
    placeholder,
    options,
    onChange,
    value,
    selectedLabel,
  }) => {
    const selectedOption = options.find(
      option => String(option.value) === String(value)
    );
    const displayValue = selectedOption
      ? selectedOption.label
      : value
        ? selectedLabel || String(value)
        : '';
    return (
      <div data-testid={`select-${htmlFor}`}>
        <label htmlFor={htmlFor}>{label}</label>
        <input
          id={htmlFor}
          name={htmlFor}
          role="combobox"
          aria-expanded="false"
          aria-controls={`${htmlFor}-listbox`}
          placeholder={placeholder}
          value={displayValue}
          onChange={e =>
            onChange({ target: { name: htmlFor, value: e.target.value } })
          }
          data-testid={`select-field-${htmlFor}`}
        />
        <ul
          id={`${htmlFor}-listbox`}
          data-testid={`select-field-${htmlFor}-options`}
        >
          {options.map((option, idx) => (
            <li
              key={idx}
              role="option"
              aria-selected={String(option.value) === String(value)}
              data-testid={`select-field-${htmlFor}-option`}
              onClick={() =>
                onChange({ target: { name: htmlFor, value: option.value } })
              }
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>
    );
  },
  ClearFiltersButton: ({ onClick }) => (
    <button type="button" data-testid="clear-filters-button" onClick={onClick}>
      Limpar filtros
    </button>
  ),
}));

describe('Filter Component', () => {
  const mockHandleSubmit = jest.fn(e => e?.preventDefault?.());
  const mockHandleChange = jest.fn();
  const mockFormData = {
    dataInicio: '2024-01-01',
    dataTermino: '2024-12-31',
    idioma: '',
    idAluno: '',
  };
  const mockAlunos = [
    { id: 1, nome: 'João Silva', email: 'joao@email.com' },
    { id: 2, nome: 'Maria Santos', email: 'maria@email.com' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the filter form without an internal "Filtros" heading (owned by the collapsible panel wrapper)', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      expect(screen.getByTestId('filter-form')).toBeInTheDocument();
      expect(screen.queryByText('Filtros')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      expect(screen.getByTestId('input-dataInicio')).toBeInTheDocument();
      expect(screen.getByTestId('input-dataTermino')).toBeInTheDocument();
      expect(screen.getByTestId('select-idioma')).toBeInTheDocument();
      expect(screen.getByTestId('select-idAluno')).toBeInTheDocument();
    });

    it('should render date fields with correct labels', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      expect(screen.getByText('Data de início')).toBeInTheDocument();
      expect(screen.getByText('Data de fim')).toBeInTheDocument();
    });

    it('should render select fields with correct labels', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      expect(screen.getByText('Idioma')).toBeInTheDocument();
      expect(screen.getByText('Aluno')).toBeInTheDocument();
    });

    it('should render idioma options based on IDIOMA_ARRAY', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const idiomaSelect = screen.getByTestId('select-field-idioma');
      const options = idiomaSelect.querySelectorAll('option');

      // +1 for placeholder option
      expect(options.length).toBe(IDIOMA_ARRAY.length + 1);
    });

    it('should render aluno options from provided alunos list', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const alunoOptionsList = screen.getByTestId(
        'select-field-idAluno-options'
      );
      const options = alunoOptionsList.querySelectorAll(
        '[data-testid="select-field-idAluno-option"]'
      );

      // Combobox pesquisável não tem opção de placeholder nativa (sem +1).
      expect(options.length).toBe(mockAlunos.length);
    });
  });

  describe('Clear Filters', () => {
    it('should render clear filters button and call handleClearFilter on click', () => {
      const handleClearFilter = jest.fn();
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          handleClearFilter={handleClearFilter}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      fireEvent.click(screen.getByTestId('clear-filters-button'));
      expect(handleClearFilter).toHaveBeenCalled();
    });
  });

  describe('Form Data Binding', () => {
    it('should display dataInicio value from formData', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const dataInicioInput = screen.getByTestId('input-field-dataInicio');
      expect(dataInicioInput.value).toBe('2024-01-01');
    });

    it('should display dataTermino value from formData', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const dataTerminoInput = screen.getByTestId('input-field-dataTermino');
      expect(dataTerminoInput.value).toBe('2024-12-31');
    });

    it('should display idioma value from formData', () => {
      const formDataWithIdioma = { ...mockFormData, idioma: 'INGLES' };

      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={formDataWithIdioma}
          alunos={mockAlunos}
        />
      );

      const idiomaSelect = screen.getByTestId('select-field-idioma');
      expect(idiomaSelect.value).toBe('INGLES');
    });

    it('should display idAluno value from formData', () => {
      const formDataWithAluno = { ...mockFormData, idAluno: '1' };

      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={formDataWithAluno}
          alunos={mockAlunos}
        />
      );

      // O combobox pesquisável exibe o rótulo resolvido (per getEntityOptions
      // mockado), não o id bruto — diferente do <select> nativo anterior.
      const alunoSelect = screen.getByTestId('select-field-idAluno');
      expect(alunoSelect.value).toBe('João Silva - joao@email.com');
    });
  });

  describe('User Interactions', () => {
    it('should call handleChange when dataInicio changes', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const dataInicioInput = screen.getByTestId('input-field-dataInicio');
      fireEvent.change(dataInicioInput, { target: { value: '2024-02-01' } });

      expect(mockHandleChange).toHaveBeenCalled();
    });

    it('should call handleChange when dataTermino changes', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const dataTerminoInput = screen.getByTestId('input-field-dataTermino');
      fireEvent.change(dataTerminoInput, { target: { value: '2025-01-01' } });

      expect(mockHandleChange).toHaveBeenCalled();
    });

    it('should call handleChange when idioma changes', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const idiomaSelect = screen.getByTestId('select-field-idioma');
      fireEvent.change(idiomaSelect, { target: { value: 'INGLES' } });

      expect(mockHandleChange).toHaveBeenCalled();
    });

    it('should call handleChange when idAluno changes', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const alunoSelect = screen.getByTestId('select-field-idAluno');
      fireEvent.change(alunoSelect, { target: { value: '1' } });

      expect(mockHandleChange).toHaveBeenCalledWith({
        target: { name: 'idAluno', value: '1' },
      });
    });

    it('should call handleSubmit when form is submitted', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const form = screen.getByTestId('filter-form');
      fireEvent.submit(form);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should render with empty alunos array', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={[]}
        />
      );

      const alunoOptionsList = screen.getByTestId(
        'select-field-idAluno-options'
      );
      const options = alunoOptionsList.querySelectorAll(
        '[data-testid="select-field-idAluno-option"]'
      );

      // Sem placeholder nativo no combobox: lista vazia é zero opções.
      expect(options.length).toBe(0);
    });

    it('should render with empty formData values', () => {
      const emptyFormData = {
        dataInicio: '',
        dataTermino: '',
        idioma: '',
        idAluno: '',
      };

      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={emptyFormData}
          alunos={mockAlunos}
        />
      );

      expect(screen.getByTestId('input-field-dataInicio').value).toBe('');
      expect(screen.getByTestId('input-field-dataTermino').value).toBe('');
      expect(screen.getByTestId('select-field-idioma').value).toBe('');
      expect(screen.getByTestId('select-field-idAluno').value).toBe('');
    });

    it('should render date fields as optional', () => {
      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      const dataInicioInput = screen.getByTestId('input-field-dataInicio');
      const dataTerminoInput = screen.getByTestId('input-field-dataTermino');

      expect(dataInicioInput).not.toHaveAttribute('required');
      expect(dataTerminoInput).not.toHaveAttribute('required');
    });
  });

  describe('SearchableSelectField widget (AC-001-011, AC-001-008 — parte, wiring do filtro)', () => {
    it('AC-001-011: com formData.idAluno vazio (estado pós-handleClearFilter), o campo renderiza sem seleção', () => {
      const clearedFormData = { ...mockFormData, idAluno: '' };

      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={clearedFormData}
          alunos={mockAlunos}
        />
      );

      expect(screen.getByTestId('select-field-idAluno').value).toBe('');
    });

    it('AC-001-008: com formData.idAluno apontando para um Aluno excluído (fora de `alunos`), o filtro renderiza sem erro e sem descartar o valor em silêncio (fallback ao value bruto, sem `selectedLabel`)', () => {
      const formDataWithDeletedAluno = { ...mockFormData, idAluno: '999' };

      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={formDataWithDeletedAluno}
          alunos={mockAlunos}
        />
      );

      // Nenhum option de `alunos` corresponde a '999' (Aluno deletado, hard
      // delete). Sem `selectedLabel` passado por este ponto de consumo, o
      // fallback é o próprio value bruto — nunca vazio/silencioso.
      expect(screen.getByTestId('select-field-idAluno').value).toBe('999');
    });
  });

  describe('Integration with getEntityOptions', () => {
    it('should call getEntityOptions with alunos', () => {
      const { getEntityOptions } = require('@/utils/getEntityOptions');

      render(
        <Filter
          handleSubmit={mockHandleSubmit}
          handleChange={mockHandleChange}
          formData={mockFormData}
          alunos={mockAlunos}
        />
      );

      expect(getEntityOptions).toHaveBeenCalledWith(mockAlunos);
    });
  });
});
