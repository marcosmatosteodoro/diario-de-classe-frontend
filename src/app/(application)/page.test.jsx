import { render, screen, waitFor, within } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { act } from 'react';
import { JSDOM } from 'jsdom';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import Home from './page';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useAlunos } from '@/hooks/alunos/useAlunos';
import { useDashboard } from '@/hooks/dashboard/useDashboard';
import { useProfessores } from '@/hooks/professores/useProfessores';
import { FILTER_PANEL_STORAGE_KEYS, FILTER_STORAGE_KEYS } from '@/constants';

// Mock providers and hooks
jest.mock('@/providers/UserAuthProvider');
jest.mock('@/hooks/alunos/useAlunos');
jest.mock('@/hooks/dashboard/useDashboard');
jest.mock('@/hooks/professores/useProfessores');
jest.mock('@/utils/makeEmailLabel');
jest.mock('@/utils/makeFullNameLabel');

// Colaboradores exigidos só pela prova de fiação real abaixo (AC-001-015/018/
// 021 e invariante de cablagem): a suíte principal desta descrição mantém
// `useDashboard` inteiramente mockado (bloco acima) e nunca invoca estes
// módulos; só o describe de fiação troca `useDashboard` para
// `jest.requireActual`, e é o hook real que os importa.
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));
jest.mock('@/store/slices/dashboardSlice', () => ({
  getDashboard: jest.fn(() => ({ type: 'dashboard/getDashboard' })),
}));
jest.mock('@/store/slices/aulasSlice', () => ({
  updateAula: jest.fn(() => ({ type: 'aulas/updateAula' })),
  clearStatus: jest.fn(() => ({ type: 'aulas/clearStatus' })),
}));
jest.mock('@/providers/ToastProvider', () => ({
  useToast: jest.fn(() => ({ success: jest.fn(), error: jest.fn() })),
}));
jest.mock('@/hooks/useSweetAlert', () => ({
  __esModule: true,
  default: jest.fn(() => ({ showForm: jest.fn(), showSuccess: jest.fn() })),
}));

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

describe('Home — fiação real do painel colapsável (AC-001-015/018/021, achado B3 do qa)', () => {
  const actualUseDashboard = jest.requireActual(
    '@/hooks/dashboard/useDashboard'
  ).useDashboard;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    useUserAuth.mockReturnValue({
      currentUser: { id: 1, nome: 'Professor Test' },
      isAdmin: () => true,
    });
    useAlunos.mockReturnValue({ alunoOptions: [], isLoading: false });
    useProfessores.mockReturnValue({ professorOptions: [], isLoading: false });

    // Troca `useDashboard` (auto-mockado no describe acima) pela implementação
    // real: só assim um bug isolado no cálculo/repasse de `appliedCount` em
    // `useDashboard` reprova estes testes, como o critério exige.
    useDashboard.mockImplementation(actualUseDashboard);
    useDispatch.mockReturnValue(jest.fn());
    useSelector.mockImplementation(selector =>
      selector({
        dashboard: { data: {}, status: 'idle' },
        aulas: { status: 'idle', action: null },
      })
    );
  });

  it('localStorage pré-semeado (painel recolhido + 2 filtros não-default): painel já recolhido e contagem "2", sem nenhuma interação', () => {
    localStorage.setItem(
      FILTER_PANEL_STORAGE_KEYS.dashboard,
      JSON.stringify('recolhido')
    );
    localStorage.setItem(
      FILTER_STORAGE_KEYS.dashboard,
      JSON.stringify({ alunoId: '123', professorId: '456' })
    );

    render(<Home />);

    expect(screen.getByTestId('painel-filtros-colapsavel')).toHaveAttribute(
      'data-panel-state',
      'recolhido'
    );
    expect(screen.getByTestId('painel-filtros-contagem')).toHaveTextContent(
      '2'
    );
  });

  it('sem preferência salva e sem filtro aplicado: painel aberto e sem indicação de contagem', () => {
    render(<Home />);

    expect(screen.getByTestId('painel-filtros-colapsavel')).not.toHaveAttribute(
      'data-panel-state'
    );
    expect(
      screen.queryByTestId('painel-filtros-contagem')
    ).not.toBeInTheDocument();
  });

  it('um único "Filtros" no painel inicial (mesma regra da TASK-002-005): com o painel aberto, o heading nível 3 aparece exatamente uma vez', () => {
    render(<Home />);

    expect(
      screen.getAllByRole('heading', { name: 'Filtros', level: 3 })
    ).toHaveLength(1);
  });

  describe('INVARIANTE DE CABLAGEM (herdado do re-review da wave 2, DEC-002-001 §6): isOpen vem de useCollapsiblePanelState(a MESMA storageKey do painel)', () => {
    function montarMarkupDeServidor() {
      // Simula o servidor (A-001-001: sempre aberto lá, por não haver
      // localStorage nenhum): limpa o localStorage do próprio ambiente Jest —
      // é ele que o código de produção lê via `window`/`localStorage`
      // ambientes, inclusive durante a hidratação abaixo — antes de gerar o
      // markup estático.
      localStorage.clear();
      return renderToString(<Home />);
    }

    it('preferência salva "recolhido": o atributo aplicado pelo script anti-flash sobrevive à hidratação (isOpen inicial vem do hook, não diverge) e some ao expandir', () => {
      const markup = montarMarkupDeServidor();
      const html = `<!DOCTYPE html><html><body><div id="root">${markup}</div></body></html>`;

      // Ambiente jsdom AMBIENTE (o próprio realm do Jest): é dele que o código
      // de produção (useCollapsiblePanelState -> filterStorage.js) lê
      // `localStorage` durante a hidratação abaixo — precisa ter a MESMA
      // preferência que o script inline (que roda no realm do documento
      // isolado, criado a seguir) vai encontrar.
      localStorage.setItem(
        FILTER_PANEL_STORAGE_KEYS.dashboard,
        JSON.stringify('recolhido')
      );

      // Documento isolado, com o parser REAL (lição
      // [[prova-de-script-inline-precisa-do-parser-real]]): o script
      // anti-flash embutido no markup executa durante o parse, antes de
      // qualquer hidratação, e sua própria leitura de localStorage é a deste
      // realm isolado — semeada aqui via `beforeParse`.
      const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        url: 'https://invariante-cablagem-dashboard.teste/',
        beforeParse(janela) {
          janela.localStorage.setItem(
            FILTER_PANEL_STORAGE_KEYS.dashboard,
            JSON.stringify('recolhido')
          );
        },
      });

      const raizAntesDeHidratar = dom.window.document.querySelector(
        '[data-testid="painel-filtros-colapsavel"]'
      );
      // pré-condição: o script já aplicou o atributo, exatamente como em
      // produção, antes de qualquer código React rodar.
      expect(raizAntesDeHidratar.getAttribute('data-panel-state')).toBe(
        'recolhido'
      );

      const container = dom.window.document.getElementById('root');

      // Hidrata a árvore real. `renderToString`/`hydrateRoot` não corrigem
      // atributos divergentes entre o markup do servidor e o valor computado
      // no cliente durante a própria hidratação — por isso a asserção que de
      // fato discrimina cablagem correta de incorreta não é o estado logo
      // após hidratar, e sim a interação seguinte.
      let root;
      expect(() => {
        act(() => {
          root = hydrateRoot(container, <Home />);
        });
      }).not.toThrow();

      const raizDepoisDeHidratar = dom.window.document.querySelector(
        '[data-testid="painel-filtros-colapsavel"]'
      );
      // NFR-001-002: o atributo que oculta o conteúdo via CSS continua
      // presente logo após a hidratação — nenhum frame mostra os campos.
      expect(raizDepoisDeHidratar.getAttribute('data-panel-state')).toBe(
        'recolhido'
      );

      // Clica no controle (por `data-testid`, nunca pelo aria-label — o
      // rótulo pode estar preso ao valor do servidor logo após hidratar).
      // Se `isOpen` vier de `useCollapsiblePanelState(FILTER_PANEL_STORAGE_KEYS.dashboard)`
      // (cablagem correta), o estado interno já era `false`; o clique o
      // inverte para `true`, e a reconciliação normal que segue (fora da
      // hidratação) remove o atributo da raiz. Mutante (isOpen de um
      // `useState(true)` local, dissociado da chave): o estado interno já
      // seria `true`, e o clique o inverteria para `false` — o atributo
      // NUNCA sairia da raiz, reprovando esta asserção.
      const botao = within(dom.window.document.body).getByTestId(
        'painel-filtros-controle'
      );
      act(() => {
        botao.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
      });

      const raizDepoisDeExpandir = dom.window.document.querySelector(
        '[data-testid="painel-filtros-colapsavel"]'
      );
      expect(raizDepoisDeExpandir.getAttribute('data-panel-state')).toBeNull();

      act(() => {
        root.unmount();
      });
    });
  });
});
