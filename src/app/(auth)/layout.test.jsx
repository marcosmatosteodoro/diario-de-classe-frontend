import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SESSION_STATUS } from '@/constants/session';
import AuthLayout from './layout';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useRouter } from 'next/navigation';

jest.mock('@/providers/UserAuthProvider', () => ({ useUserAuth: jest.fn() }));
jest.mock('@/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

jest.mock('lucide-react', () => ({
  BookOpen: ({ size, strokeWidth }) => (
    <div
      data-testid="book-open-icon"
      data-size={size}
      data-stroke={strokeWidth}
    >
      BookOpen
    </div>
  ),
  GraduationCap: ({ size, strokeWidth }) => (
    <div
      data-testid="graduation-cap-icon"
      data-size={size}
      data-stroke={strokeWidth}
    >
      GraduationCap
    </div>
  ),
  Users: ({ size, strokeWidth }) => (
    <div data-testid="users-icon" data-size={size} data-stroke={strokeWidth}>
      Users
    </div>
  ),
}));

describe('AuthLayout', () => {
  let routerMock, successMock;

  // Retorno real do provider: as mesmas chaves que o teste do provider afirma.
  function sessao(sessionStatus, currentUser = null) {
    useUserAuth.mockReturnValue({
      currentUser,
      settings: {},
      sessionStatus,
      endReason: 'nunca',
      authenticate: jest.fn(),
      removeAuthenticate: jest.fn(),
      retryRestore: jest.fn(),
      isAuthenticated: jest.fn(),
      isAdmin: jest.fn(),
    });
  }

  beforeEach(() => {
    routerMock = { push: jest.fn() };
    successMock = jest.fn();
    useRouter.mockReturnValue(routerMock);
    useToast.mockReturnValue({ success: successMock });
    sessao(SESSION_STATUS.ANONYMOUS);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render children inside layout', () => {
      const { getByTestId } = render(
        <AuthLayout>
          <div data-testid="child">Conteúdo</div>
        </AuthLayout>
      );
      expect(getByTestId('child')).toBeInTheDocument();
    });

    it('renders the system footer text', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(
        screen.getByText('Sistema exclusivo para professores da instituição')
      ).toBeInTheDocument();
    });

    it('renders the main container with correct styling classes', () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass(
        'flex',
        'items-center',
        'justify-center'
      );
    });
  });

  describe('Brand and Features Section', () => {
    it('renders the main title "Diário de Classe"', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText('Diário de Classe')).toBeInTheDocument();
      const title = screen.getByRole('heading', { name: 'Diário de Classe' });
      expect(title).toHaveClass('text-4xl', 'font-bold');
    });

    it('renders the subtitle', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(
        screen.getByText('Sistema de Registro de Aulas')
      ).toBeInTheDocument();
    });

    it('renders BookOpen icon with correct size and stroke', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const bookIcon = screen.getByTestId('book-open-icon');
      expect(bookIcon).toBeInTheDocument();
      expect(bookIcon).toHaveAttribute('data-size', '64');
      expect(bookIcon).toHaveAttribute('data-stroke', '1.5');
    });

    it('renders GraduationCap icon with correct size and stroke', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const graduationIcon = screen.getByTestId('graduation-cap-icon');
      expect(graduationIcon).toBeInTheDocument();
      expect(graduationIcon).toHaveAttribute('data-size', '24');
      expect(graduationIcon).toHaveAttribute('data-stroke', '1.5');
    });

    it('renders Users icon with correct size and stroke', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const usersIcon = screen.getByTestId('users-icon');
      expect(usersIcon).toBeInTheDocument();
      expect(usersIcon).toHaveAttribute('data-size', '24');
      expect(usersIcon).toHaveAttribute('data-stroke', '1.5');
    });

    it('renders "Gerencie suas Aulas" feature with description', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText('Gerencie suas Aulas')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Registre e acompanhe o conteúdo de cada aula ministrada'
        )
      ).toBeInTheDocument();
    });

    it('renders "Controle de Alunos" feature with description', () => {
      render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      expect(screen.getByText('Controle de Alunos')).toBeInTheDocument();
      expect(
        screen.getByText('Mantenha registro completo de frequência e progresso')
      ).toBeInTheDocument();
    });
  });

  describe('Reação ao estado da sessão (AC-002-008, AC-002-009, AC-002-034)', () => {
    it('RESTORING renderiza o loading e não o formulário', () => {
      sessao(SESSION_STATUS.RESTORING);
      render(
        <AuthLayout>
          <div data-testid="child">Conteúdo</div>
        </AuthLayout>
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
      expect(successMock).not.toHaveBeenCalled();
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it.each([SESSION_STATUS.ANONYMOUS, SESSION_STATUS.UNAVAILABLE])(
      '%s renderiza o formulário, sem aviso e sem redirecionar',
      status => {
        sessao(status);
        render(
          <AuthLayout>
            <div data-testid="child">Conteúdo</div>
          </AuthLayout>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        expect(successMock).not.toHaveBeenCalled();
        expect(routerMock.push).not.toHaveBeenCalled();
      }
    );

    it('montada em RESTORING sem usuário e depois AUTHENTICATED com Ana: avisa com o nome novo, 1 vez, e vai a /', () => {
      sessao(SESSION_STATUS.RESTORING);
      const { rerender } = render(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      sessao(SESSION_STATUS.AUTHENTICATED, { nome: 'Ana' });
      rerender(
        <AuthLayout>
          <div />
        </AuthLayout>
      );

      expect(successMock).toHaveBeenCalledTimes(1);
      expect(successMock).toHaveBeenCalledWith('Bem-vindo de volta, Ana!');
      expect(routerMock.push).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });

    it('montada já AUTHENTICATED avisa e vai a / 1 vez, também sob StrictMode', () => {
      sessao(SESSION_STATUS.AUTHENTICATED, { nome: 'Marcos' });
      render(
        <StrictMode>
          <AuthLayout>
            <div />
          </AuthLayout>
        </StrictMode>
      );
      expect(successMock).toHaveBeenCalledTimes(1);
      expect(successMock).toHaveBeenCalledWith('Bem-vindo de volta, Marcos!');
      expect(routerMock.push).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });

    it('entrar explícito (ANONYMOUS -> AUTHENTICATED com a tela montada) não dispara o aviso de volta', () => {
      sessao(SESSION_STATUS.ANONYMOUS);
      const { rerender } = render(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      sessao(SESSION_STATUS.AUTHENTICATED, { nome: 'Ana' });
      rerender(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      expect(successMock).not.toHaveBeenCalled();
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it('UNAVAILABLE -> AUTHENTICATED direto (entrar explícito) não avisa nem navega', () => {
      sessao(SESSION_STATUS.UNAVAILABLE);
      const { rerender } = render(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      sessao(SESSION_STATUS.AUTHENTICATED, { nome: 'Ana' });
      rerender(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      expect(successMock).not.toHaveBeenCalled();
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it('UNAVAILABLE -> RESTORING -> AUTHENTICATED (tentar novamente) avisa 1 vez e vai a / 1 vez', () => {
      sessao(SESSION_STATUS.UNAVAILABLE);
      const { rerender } = render(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      sessao(SESSION_STATUS.RESTORING);
      rerender(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      sessao(SESSION_STATUS.AUTHENTICATED, { nome: 'Ana' });
      rerender(
        <AuthLayout>
          <div />
        </AuthLayout>
      );
      expect(successMock).toHaveBeenCalledTimes(1);
      expect(successMock).toHaveBeenCalledWith('Bem-vindo de volta, Ana!');
      expect(routerMock.push).toHaveBeenCalledTimes(1);
      expect(routerMock.push).toHaveBeenCalledWith('/');
    });
  });

  describe('Layout Structure', () => {
    it('renders two-column layout with left and right sections', () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const layoutColumns = container.querySelectorAll('.lg\\:w-1\\/2');
      expect(layoutColumns.length).toBe(2);
    });

    it('renders decorative background circles', () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const circles = container.querySelectorAll('.rounded-full');
      // 2 decorative circles + 1 main icon container
      expect(circles.length).toBeGreaterThanOrEqual(3);
    });

    it('renders left side with gradient background', () => {
      const { container } = render(
        <AuthLayout>
          <div>Content</div>
        </AuthLayout>
      );

      const leftSide = container.querySelector(
        '.bg-linear-to-br.from-blue-600.to-indigo-700'
      );
      expect(leftSide).toBeInTheDocument();
    });
  });
});
