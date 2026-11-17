import { StrictMode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfessorForm } from '.';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { PERMISSAO, IDIOMA } from '@/constants';

jest.mock('@/providers/UserAuthProvider');

// Mock parcial do barrel `@/components`: `FormSection` permanece real
// (`jest.requireActual('@/components/ui')` — nunca o barrel `@/components`
// completo, que reexporta este próprio `ProfessorForm` e gera ciclo de
// módulo), para que `getByRole('group', { name })` resolva sobre a
// implementação real de fieldset/legend (AC-001-013).
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components/ui'),
  Form: ({ children, handleSubmit }) => (
    <form data-testid="form" onSubmit={handleSubmit}>
      {children}
    </form>
  ),
  FormError: ({ title, errors }) => (
    <div data-testid="form-error">
      {title && <div data-testid="error-title">{title}</div>}
      {errors && <div data-testid="errors">{JSON.stringify(errors)}</div>}
    </div>
  ),
  FormGroup: ({ children, dataTestId = 'form-group' }) => (
    <div data-testid={dataTestId}>{children}</div>
  ),
  InputField: ({ htmlFor, label, value, onChange, required, placeholder }) => (
    <div data-testid={`input-${htmlFor}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && ' *'}
      </label>
      <input
        id={htmlFor}
        name={htmlFor}
        value={value || ''}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
    </div>
  ),
  // `ref` chega como prop normal (React 19) e é repassado ao `<input>` real,
  // igual ao `PasswordField` de produção (`...props` espalhado no `<input>`)
  // — necessário para os testes de foco abaixo observarem `document.activeElement`.
  // `hint`/`error` seguem o mesmo par aria-describedby/aria-invalid + mensagem
  // associada por id do `PasswordField`/`BaseField` reais, replicado aqui
  // porque o stub não importa `describedByIds`.
  PasswordField: ({
    htmlFor,
    label,
    value,
    onChange,
    required,
    placeholder,
    ref,
    autoComplete,
    hint,
    error,
  }) => (
    <div data-testid={`password-${htmlFor}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required && ' *'}
      </label>
      <input
        ref={ref}
        type="password"
        id={htmlFor}
        name={htmlFor}
        value={value || ''}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={
          error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined
        }
        aria-invalid={error ? 'true' : undefined}
      />
      {hint && <p id={`${htmlFor}-hint`}>{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  ),
  SelectField: ({ htmlFor, label, value, onChange, required, options }) => (
    <div data-testid={`select-${htmlFor}`}>
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
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  ButtonsFields: ({ isLoading, href }) => (
    <div data-testid="buttons-fields">
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Carregando...' : 'Salvar'}
      </button>
      <a href={href}>Cancelar</a>
    </div>
  ),
}));

describe('ProfessorForm', () => {
  const mockHandleSubmit = jest.fn(e => e.preventDefault());
  const mockHandleChange = jest.fn();
  const mockHandleAlterarSenha = jest.fn();
  const mockHandleCancelarAlteracaoSenha = jest.fn();

  const defaultProps = {
    handleSubmit: mockHandleSubmit,
    handleChange: mockHandleChange,
    handleAlterarSenha: mockHandleAlterarSenha,
    handleCancelarAlteracaoSenha: mockHandleCancelarAlteracaoSenha,
    formData: {
      nome: '',
      sobrenome: '',
      email: '',
      telefone: '',
      senha: '',
      repetirSenha: '',
      idioma: IDIOMA.INGLES,
      idiomas: [IDIOMA.INGLES],
      permissao: PERMISSAO.MEMBER,
    },
    message: null,
    isSenhaError: false,
    errors: null,
    isLoading: false,
    isEdit: false,
    alterarSenhaAtivo: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
  });

  it('renders the form with all fields', () => {
    render(<ProfessorForm {...defaultProps} />);

    expect(screen.getByTestId('form')).toBeInTheDocument();
    expect(screen.getByTestId('input-nome')).toBeInTheDocument();
    expect(screen.getByTestId('input-sobrenome')).toBeInTheDocument();
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('input-telefone')).toBeInTheDocument();
    expect(screen.getByTestId('password-senha')).toBeInTheDocument();
    expect(screen.getByTestId('password-repetirSenha')).toBeInTheDocument();
    expect(screen.getByTestId('select-permissao')).toBeInTheDocument();
    expect(screen.getByTestId('select-idioma')).toBeInTheDocument();
    expect(screen.getByTestId('buttons-fields')).toBeInTheDocument();
  });

  // AC-001-001, AC-001-013
  it('renders "Informações pessoais", "Acesso" and "Segurança" sections in this order', () => {
    render(<ProfessorForm {...defaultProps} />);

    const infoSection = screen.getByRole('group', {
      name: 'Informações pessoais',
    });
    const acessoSection = screen.getByRole('group', { name: 'Acesso' });
    const segurancaSection = screen.getByRole('group', { name: 'Segurança' });

    expect(infoSection).toBeInTheDocument();
    expect(acessoSection).toBeInTheDocument();
    expect(segurancaSection).toBeInTheDocument();
    expect(
      infoSection.compareDocumentPosition(acessoSection) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      acessoSection.compareDocumentPosition(segurancaSection) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // AC-001-006
  it('renders all required fields with asterisk when not in edit mode, including senha/repetirSenha', () => {
    render(<ProfessorForm {...defaultProps} />);

    expect(screen.getByText('Nome *')).toBeInTheDocument();
    expect(screen.getByText('Sobrenome *')).toBeInTheDocument();
    expect(screen.getByText('Email *')).toBeInTheDocument();
    expect(screen.getByText('Senha *')).toBeInTheDocument();
    expect(screen.getByText('Repetir Senha *')).toBeInTheDocument();
    expect(screen.getByText('Permissão *')).toBeInTheDocument();
    expect(screen.getByText('Idioma *')).toBeInTheDocument();
  });

  it('telefone field is not required', () => {
    render(<ProfessorForm {...defaultProps} />);

    expect(screen.queryByText('Telefone *')).not.toBeInTheDocument();
    expect(screen.getByText('Telefone')).toBeInTheDocument();
  });

  // AC-001-007
  it('shows "Alterar senha" button and hides password fields in edit mode for an administrator editing another professor', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Alterar senha' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('password-senha')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('password-repetirSenha')
    ).not.toBeInTheDocument();
  });

  it('shows "Alterar senha" button in edit mode for the professor editing their own profile', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'member' },
      isAdmin: jest.fn(() => false),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: 1 }}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Alterar senha' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('password-senha')).not.toBeInTheDocument();
  });

  // AC-001-007, caso simétrico (prova da ausência, perfil next-16.md §6.3)
  it('hides the "Alterar senha" button for a non-administrator editing another professor', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'member' },
      isAdmin: jest.fn(() => false),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Alterar senha' })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('password-senha')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('password-repetirSenha')
    ).not.toBeInTheDocument();
  });

  it('calls handleAlterarSenha when the "Alterar senha" button is clicked', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect(mockHandleAlterarSenha).toHaveBeenCalled();
  });

  // AC-001-008, AC-001-011 (parte componente)
  it('reveals password fields as required and shows "Cancelar alteração de senha" once acionado', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        alterarSenhaAtivo
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    expect(screen.getByText('Senha *')).toBeInTheDocument();
    expect(screen.getByText('Repetir Senha *')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Alterar senha' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar alteração de senha' })
    ).toBeInTheDocument();
  });

  it('calls handleCancelarAlteracaoSenha when "Cancelar alteração de senha" is clicked', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        alterarSenhaAtivo
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancelar alteração de senha' })
    );
    expect(mockHandleCancelarAlteracaoSenha).toHaveBeenCalled();
  });

  // AC-001-016
  it('renders "Alterar senha" and "Cancelar alteração de senha" buttons with the tap-target class', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
    const { rerender } = render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );
    expect(screen.getByRole('button', { name: 'Alterar senha' })).toHaveClass(
      'tap-target'
    );

    rerender(
      <ProfessorForm
        {...defaultProps}
        isEdit
        alterarSenhaAtivo
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Cancelar alteração de senha' })
    ).toHaveClass('tap-target');
  });

  it('displays FormError with message when message is provided', () => {
    const props = {
      ...defaultProps,
      message: 'Professor cadastrado com sucesso!',
    };

    render(<ProfessorForm {...props} />);

    expect(screen.getByTestId('error-title')).toHaveTextContent(
      'Professor cadastrado com sucesso!'
    );
  });

  it('displays FormError with senha error when isSenhaError is true', () => {
    const props = {
      ...defaultProps,
      isSenhaError: true,
    };

    render(<ProfessorForm {...props} />);

    expect(screen.getByTestId('error-title')).toHaveTextContent(
      'As senhas não coincidem'
    );
  });

  // AC-001-010/FR-001-014, AC-001-016: a mensagem também fica associada ao
  // campo "Repetir Senha", não só no FormError do topo.
  it('marks the Repetir Senha field as invalid and describes the mismatch when isSenhaError is true', () => {
    render(<ProfessorForm {...defaultProps} isSenhaError />);

    const repetirSenhaInput = screen.getByLabelText(/repetir senha/i);
    expect(repetirSenhaInput).toHaveAttribute('aria-invalid', 'true');
    expect(repetirSenhaInput).toHaveAccessibleDescription(
      'As senhas não coincidem'
    );
  });

  it('does not mark the Repetir Senha field as invalid without a senha mismatch', () => {
    render(<ProfessorForm {...defaultProps} isSenhaError={false} />);

    const repetirSenhaInput = screen.getByLabelText(/repetir senha/i);
    expect(repetirSenhaInput).not.toHaveAttribute('aria-invalid');
  });

  it('displays FormError with errors when errors are provided', () => {
    const mockErrors = { nome: 'Nome é obrigatório', email: 'Email inválido' };
    const props = {
      ...defaultProps,
      errors: mockErrors,
    };

    render(<ProfessorForm {...props} />);

    expect(screen.getByTestId('errors')).toHaveTextContent(
      JSON.stringify(mockErrors)
    );
  });

  it('prioritizes message over isSenhaError', () => {
    const props = {
      ...defaultProps,
      message: 'Mensagem prioritária',
      isSenhaError: true,
    };

    render(<ProfessorForm {...props} />);

    expect(screen.getByTestId('error-title')).toHaveTextContent(
      'Mensagem prioritária'
    );
  });

  it('calls handleChange when input fields change', () => {
    render(<ProfessorForm {...defaultProps} />);

    const nomeInput = screen.getByPlaceholderText('Digite o nome');
    fireEvent.change(nomeInput, { target: { value: 'João' } });

    expect(mockHandleChange).toHaveBeenCalled();
  });

  it('calls handleSubmit when form is submitted', () => {
    render(<ProfessorForm {...defaultProps} />);

    const form = screen.getByTestId('form');
    fireEvent.submit(form);

    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('renders select with correct permission options', () => {
    render(<ProfessorForm {...defaultProps} />);

    const select = screen.getByLabelText(/permissão/i);

    expect(select).toBeInTheDocument();
    expect(screen.getByText('Professor')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('renders select with correct idioma options', () => {
    render(<ProfessorForm {...defaultProps} />);

    const idiomSelect = screen.getByLabelText(/idioma/i);
    expect(idiomSelect).toBeInTheDocument();
    expect(screen.getByText('Inglês')).toBeInTheDocument();
    expect(screen.getByText('Espanhol')).toBeInTheDocument();
    expect(screen.getByText('Francês')).toBeInTheDocument();
  });

  it('renders input fields with correct values from formData', () => {
    const props = {
      ...defaultProps,
      formData: {
        nome: 'João',
        sobrenome: 'Silva',
        email: 'joao@example.com',
        telefone: '11999999999',
        senha: 'senha123',
        repetirSenha: 'senha123',
        idioma: IDIOMA.ESPANHOL,
        idiomas: [IDIOMA.ESPANHOL],
        permissao: PERMISSAO.ADMIN,
      },
    };

    render(<ProfessorForm {...props} />);

    expect(screen.getByDisplayValue('João')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('joao@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11999999999')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('senha123')).toHaveLength(2);

    const idiomSelect = screen.getByLabelText(/idioma/i);
    expect(idiomSelect).toHaveValue(IDIOMA.ESPANHOL);

    const select = screen.getByLabelText(/permissão/i);
    expect(select).toHaveValue(PERMISSAO.ADMIN);
  });

  // AC-001-005 (parte, não-regressão)
  it('passes isLoading prop to ButtonsFields', () => {
    const props = {
      ...defaultProps,
      isLoading: true,
    };

    render(<ProfessorForm {...props} />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('passes href prop to ButtonsFields', () => {
    render(<ProfessorForm {...defaultProps} />);

    expect(screen.getByText('Cancelar')).toHaveAttribute(
      'href',
      '/professores'
    );
  });

  it('renders all input placeholders correctly', () => {
    render(<ProfessorForm {...defaultProps} />);

    expect(screen.getByPlaceholderText('Digite o nome')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Digite o sobrenome')
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite o email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(11) 99999-9999')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite a senha')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirme a senha')).toBeInTheDocument();
  });

  it('renders FormError component even when no errors', () => {
    render(<ProfessorForm {...defaultProps} />);

    expect(screen.getByTestId('form-error')).toBeInTheDocument();
  });

  // Foco segue a revelação/ocultação dos campos de senha (AC-001-007/
  // FR-001-011, NFR-001-002); a montagem inicial não move foco.
  describe('foco ao alternar "Alterar senha" (NFR-001-002)', () => {
    beforeEach(() => {
      useUserAuth.mockReturnValue({
        currentUser: { id: 1, permissao: 'admin' },
        isAdmin: jest.fn(() => true),
      });
    });

    it('a montagem inicial em criação não move o foco', () => {
      render(<ProfessorForm {...defaultProps} />);
      expect(document.activeElement).toBe(document.body);
    });

    it('a montagem inicial em edição não move o foco', () => {
      render(
        <StrictMode>
          <ProfessorForm
            {...defaultProps}
            isEdit
            formData={{ ...defaultProps.formData, id: 2 }}
          />
        </StrictMode>
      );
      expect(document.activeElement).toBe(document.body);
    });

    it('acionar "Alterar senha" move o foco ao campo Senha', () => {
      const { rerender } = render(
        <ProfessorForm
          {...defaultProps}
          isEdit
          formData={{ ...defaultProps.formData, id: 2 }}
        />
      );

      rerender(
        <ProfessorForm
          {...defaultProps}
          isEdit
          alterarSenhaAtivo
          formData={{ ...defaultProps.formData, id: 2 }}
        />
      );

      const senhaInput = screen
        .getByTestId('password-senha')
        .querySelector('input');
      expect(document.activeElement).toBe(senhaInput);
    });

    it('cancelar alteração de senha devolve o foco ao botão "Alterar senha"', () => {
      const { rerender } = render(
        <ProfessorForm
          {...defaultProps}
          isEdit
          alterarSenhaAtivo
          formData={{ ...defaultProps.formData, id: 2 }}
        />
      );

      rerender(
        <ProfessorForm
          {...defaultProps}
          isEdit
          formData={{ ...defaultProps.formData, id: 2 }}
        />
      );

      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Alterar senha' })
      );
    });
  });

  // `podeAlterarSenha` (FR-001-010) nega quando `currentUser?.id` é
  // nulo/indefinido — a comparação simples (`undefined === undefined`)
  // liberaria o botão indevidamente.
  it('does not show "Alterar senha" when currentUser and formData.id are both undefined and the user is not admin', () => {
    useUserAuth.mockReturnValue({
      currentUser: undefined,
      isAdmin: jest.fn(() => false),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: undefined }}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Alterar senha' })
    ).not.toBeInTheDocument();
  });

  // Os dois campos de senha usam `autoComplete="new-password"` também na
  // edição (AC-001-007) — o navegador ignora `off` e pode preencher a
  // senha do admin no campo de outro professor.
  it('renders both password fields with autoComplete="new-password" in edit mode', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        alterarSenhaAtivo
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    const senhaInput = screen
      .getByTestId('password-senha')
      .querySelector('input');
    const repetirSenhaInput = screen
      .getByTestId('password-repetirSenha')
      .querySelector('input');
    expect(senhaInput).toHaveAttribute('autocomplete', 'new-password');
    expect(repetirSenhaInput).toHaveAttribute('autocomplete', 'new-password');
  });

  // Em edição sem `podeAlterarSenha` (FR-001-009), a seção "Segurança" não
  // é renderizada (nada de seção vazia).
  it('does not render the "Segurança" section in edit mode without podeAlterarSenha', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'member' },
      isAdmin: jest.fn(() => false),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    expect(
      screen.queryByRole('group', { name: 'Segurança' })
    ).not.toBeInTheDocument();
  });

  it('renders the "Segurança" section for an admin in edit mode', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, permissao: 'admin' },
      isAdmin: jest.fn(() => true),
    });
    render(
      <ProfessorForm
        {...defaultProps}
        isEdit
        formData={{ ...defaultProps.formData, id: 2 }}
      />
    );

    expect(
      screen.getByRole('group', { name: 'Segurança' })
    ).toBeInTheDocument();
  });
});
