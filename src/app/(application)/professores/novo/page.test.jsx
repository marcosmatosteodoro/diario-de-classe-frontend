import { render } from '@testing-library/react';
import NovoProfessor from './page';
import { useNovoProfessor } from '@/hooks/professores/useNovoProfessor';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { ProfessorForm } from '@/components';

jest.mock('@/hooks/professores/useNovoProfessor');
jest.mock('@/providers/UserAuthProvider');
// Mock explícito (não automock): `FormPage` precisa renderizar `children`
// para que `ProfessorForm` (jest.fn(), abaixo) seja de fato chamado — o
// automock puro de `@/components` devolve `undefined` para `FormPage` sem
// invocar os filhos, e a chamada a `ProfessorForm` nunca acontece.
jest.mock('@/components', () => ({
  FormPage: ({ children }) => <div data-testid="form-page">{children}</div>,
  ProfessorForm: jest.fn(() => null),
}));

describe('Novo Professor Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useUserAuth.mockReturnValue({
      currentUser: { id: 1, nome: 'Admin' },
      isAdmin: true,
    });

    useNovoProfessor.mockReturnValue({
      formData: {},
      handleChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      errors: [],
    });
  });

  it('renders novo professor form page', () => {
    render(<NovoProfessor />);
    expect(useNovoProfessor).toHaveBeenCalled();
  });

  it('displays loading state', () => {
    useNovoProfessor.mockReturnValue({
      formData: {},
      handleChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: true,
      errors: [],
    });

    render(<NovoProfessor />);
    expect(useNovoProfessor).toHaveBeenCalled();
  });

  // Cobertura reversa (TASK-002-004): ProfessorForm recebe o retorno novo do
  // hook useProfessorForm (real, não mockado nesta página).
  it('passes alterarSenhaAtivo, handleAlterarSenha and handleCancelarAlteracaoSenha to ProfessorForm', () => {
    render(<NovoProfessor />);

    const props = ProfessorForm.mock.calls[0][0];
    expect(props.alterarSenhaAtivo).toBe(false);
    expect(typeof props.handleAlterarSenha).toBe('function');
    expect(typeof props.handleCancelarAlteracaoSenha).toBe('function');
  });
});
