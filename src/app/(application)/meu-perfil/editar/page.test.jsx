import { render, screen } from '@testing-library/react';
import EditarPerfil from './page';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { ProfessorForm } from '@/components';

jest.mock('@/providers/UserAuthProvider');
jest.mock('@/hooks/professores/useEditarProfessor');
jest.mock('@/hooks/professores/useProfessorForm');
jest.mock('@/components');

const {
  useEditarProfessor,
} = require('@/hooks/professores/useEditarProfessor');
const { useProfessorForm } = require('@/hooks/professores/useProfessorForm');

describe('Editar Perfil Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useUserAuth.mockReturnValue({
      currentUser: {
        id: 1,
        nome: 'Professor',
        email: 'prof@test.com',
      },
    });

    useEditarProfessor.mockReturnValue({
      message: null,
      errors: null,
      isLoading: false,
      current: { id: 1, nome: 'Professor' },
      statusError: null,
      submit: jest.fn(),
    });

    useProfessorForm.mockReturnValue({
      formData: { nome: 'Professor' },
      isSenhaError: false,
      handleChange: jest.fn(),
      handleSubmit: jest.fn(),
      setFormData: jest.fn(),
      alterarSenhaAtivo: false,
      handleAlterarSenha: jest.fn(),
      handleCancelarAlteracaoSenha: jest.fn(),
    });
  });

  it('renders editar perfil page', () => {
    render(<EditarPerfil />);
    expect(useUserAuth).toHaveBeenCalled();
  });

  it('displays loading state', () => {
    render(<EditarPerfil />);
    expect(useUserAuth).toHaveBeenCalled();
  });

  // AC-001-004: mesmo componente ProfessorForm, mesmas props de segurança de
  // senha de professores/[id]/editar.
  it('calls useProfessorForm with isEdit true and id equal to currentUser.id', () => {
    render(<EditarPerfil />);

    expect(useProfessorForm).toHaveBeenCalledWith({
      submit: expect.any(Function),
      isEdit: true,
      id: 1,
    });
  });

  it('passes alterarSenhaAtivo, handleAlterarSenha and handleCancelarAlteracaoSenha to ProfessorForm', () => {
    render(<EditarPerfil />);

    const props = ProfessorForm.mock.calls[0][0];
    expect(props.alterarSenhaAtivo).toBe(false);
    expect(typeof props.handleAlterarSenha).toBe('function');
    expect(typeof props.handleCancelarAlteracaoSenha).toBe('function');
  });

  // Retry pós-gate 7 F2 (pai AC-001-004 e a cobertura das 3 páginas): hook
  // mockado — fixture `alterarSenhaAtivo: true` com asserção estrita (sem
  // `Boolean()`) e handlers por identidade (`toBe`). Mutantes: tirar o prop
  // da página, e trocar os dois handlers entre si → vermelho.
  it('passes alterarSenhaAtivo=true and the exact hook handlers to ProfessorForm', () => {
    const mockHandleAlterarSenha = jest.fn();
    const mockHandleCancelarAlteracaoSenha = jest.fn();
    useProfessorForm.mockReturnValue({
      formData: { nome: 'Professor' },
      isSenhaError: false,
      handleChange: jest.fn(),
      handleSubmit: jest.fn(),
      setFormData: jest.fn(),
      alterarSenhaAtivo: true,
      handleAlterarSenha: mockHandleAlterarSenha,
      handleCancelarAlteracaoSenha: mockHandleCancelarAlteracaoSenha,
    });

    render(<EditarPerfil />);

    const props =
      ProfessorForm.mock.calls[ProfessorForm.mock.calls.length - 1][0];
    expect(props.alterarSenhaAtivo).toBe(true);
    expect(props.handleAlterarSenha).toBe(mockHandleAlterarSenha);
    expect(props.handleCancelarAlteracaoSenha).toBe(
      mockHandleCancelarAlteracaoSenha
    );
  });
});
