import { render, screen, waitFor, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Home from './page';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useAlunos } from '@/hooks/alunos/useAlunos';
import { useDashboard } from '@/hooks/dashboard/useDashboard';
import { useProfessores } from '@/hooks/professores/useProfessores';
import { makeEmailLabel } from '@/utils/makeEmailLabel';
import { makeFullNameLabel } from '@/utils/makeFullNameLabel';

// Mock providers and hooks
jest.mock('@/providers/UserAuthProvider');
jest.mock('@/hooks/alunos/useAlunos');
jest.mock('@/hooks/dashboard/useDashboard');
jest.mock('@/hooks/professores/useProfessores');
jest.mock('@/utils/makeEmailLabel');
jest.mock('@/utils/makeFullNameLabel');

describe('Home Page - Dashboard', () => {
  const defaultMocks = {
    currentUser: { id: 1, nome: 'Professor Test', email: 'test@example.com' },
    isAdmin: () => true,
  };

  const defaultDashboardData = {
    alunosCount: 25,
    aulasCount: 12,
    contratosCount: 5,
    aulas: [],
    isLoading: false,
    homeCardValues: [
      { title: 'Alunos', value: 25, color: 'blue' },
      { title: 'Aulas', value: 12, color: 'green' },
      { title: 'Contratos', value: 5, color: 'purple' },
    ],
    formData: {
      dataInicio: '',
      dataTermino: '',
      tipo: '',
      alunoId: '',
      professorId: '',
    },
    handleSubmit: jest.fn(),
    handleChange: jest.fn(),
    handleClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useUserAuth.mockReturnValue(defaultMocks);
    useAlunos.mockReturnValue({
      alunos: [],
      isLoading: false,
      searchParams: {},
    });
    useDashboard.mockReturnValue(defaultDashboardData);
    useProfessores.mockReturnValue({
      professores: [],
      isLoading: false,
    });
  });

  it('renders dashboard without errors', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders page with form if user is admin', async () => {
    render(<Home />);
    await waitFor(() => {
      expect(useUserAuth).toHaveBeenCalled();
    });
  });

  it('displays loading state when dashboard is loading', () => {
    useDashboard.mockReturnValue({
      ...defaultDashboardData,
      isLoading: true,
    });

    render(<Home />);
    expect(useUserAuth).toHaveBeenCalled();
  });

  it('renders with dashboard data', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(useDashboard).toHaveBeenCalled();
    });
  });
});

describe('HomeInfoCard — tempo relativo estável até montar (AC-001-004)', () => {
  const defaultMocks = {
    currentUser: { id: 1, nome: 'Professor Test', email: 'test@example.com' },
    isAdmin: () => true,
  };

  // Aula a poucos minutos de começar em relação ao instante fixado no teste de
  // preenchimento (2026-06-15T13:00:00.000Z) — produz texto não-vazio via getTimeText.
  const aulaFixture = {
    id: 99,
    tipo: 'PADRAO',
    status: 'AGENDADA',
    dataAula: '2026-06-15T12:00:00.000Z',
    horaInicial: '2026-06-15T13:05:00.000Z',
    horaFinal: '2026-06-15T14:00:00.000Z',
    aluno: { nome: 'Aluno Teste' },
    professor: { email: 'prof@example.com' },
  };

  const dashboardDataComAula = {
    alunosCount: 1,
    aulasCount: 1,
    contratosCount: 0,
    aulas: [aulaFixture],
    isLoading: false,
    homeCardValues: [],
    formData: {
      dataInicio: '',
      dataTermino: '',
      tipo: '',
      alunoId: '',
      professorId: '',
    },
    handleSubmit: jest.fn(),
    handleChange: jest.fn(),
    handleClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useUserAuth.mockReturnValue(defaultMocks);
    useAlunos.mockReturnValue({
      alunos: [],
      isLoading: false,
      searchParams: {},
    });
    useDashboard.mockReturnValue(dashboardDataComAula);
    useProfessores.mockReturnValue({
      professores: [],
      isLoading: false,
    });
    makeFullNameLabel.mockReturnValue('Aluno Teste');
    makeEmailLabel.mockReturnValue('prof@example.com');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('paridade SSR: renderToString produz o mesmo placeholder independente do horário do sistema', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T09:00:00.000Z'));
    const htmlAntes = renderToString(<Home />);

    jest.setSystemTime(new Date('2026-12-25T23:59:00.000Z'));
    const htmlDepois = renderToString(<Home />);

    expect(htmlAntes).toBe(htmlDepois);
    expect(htmlAntes).not.toMatch(/minuto\(s\)|hora\(s\)|Amanhã|Em andamento/);
  });

  it('preenchimento pós-montagem: o texto nasce vazio e passa a refletir getTimeText calculado no instante T', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T13:00:00.000Z'));

    // RTL `render()` embrulha o mount em `act()`, que assenta os efeitos
    // passivos sincronamente antes de retornar — tornaria o estado
    // pré-efeito inobservável. `flushSync` força o commit inicial de forma
    // síncrona e verificável (o placeholder já visível no DOM) sem também
    // assentar o efeito passivo, que só roda no próximo flush de efeitos
    // (`act(async () => {...})` abaixo).
    const container = document.createElement('div');
    document.body.appendChild(container);
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const root = createRoot(container);

    flushSync(() => {
      root.render(<Home />);
    });

    expect(container.textContent).not.toMatch(/minuto\(s\)/);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toMatch('Em 5 minuto(s)');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    consoleErrorSpy.mockRestore();
  });
});
