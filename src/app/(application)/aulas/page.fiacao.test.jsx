import { render, screen } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import Aulas from './page';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useDeletarAula } from '@/hooks/aulas/useDeletarAula';
import { useFormater } from '@/hooks/useFormater';
import { useAulasList } from '@/hooks/aulas/useAulasList';
import { useAlunos } from '@/hooks/alunos/useAlunos';
import { useEditarAndamentoAula } from '@/hooks/aulas/useEditarAndamentoAula';
import { useProfessores } from '@/hooks/professores/useProfessores';
import { FILTER_STORAGE_KEYS, FILTER_PANEL_STORAGE_KEYS } from '@/constants';

// Prova de fiação real (AC-001-012/021): NÃO mocka '@/components' (que
// automocaria ListPage/PainelFiltrosColapsavel — a suíte `page.test.jsx` já
// cobre o comportamento superficial com esse automock, mas ele não serve a
// esta prova) nem `@/hooks/aulas/useAulas` (precisamos do cálculo real de
// `appliedCount` e da leitura real de `localStorage`). Só os colaboradores
// alheios ao painel são mockados.
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));
jest.mock('@/store/slices/aulasSlice', () => ({
  getAulas: jest.fn(() => ({ type: 'getAulas' })),
}));
jest.mock('@/providers/UserAuthProvider');
jest.mock('@/hooks/aulas/useDeletarAula');
jest.mock('@/hooks/useFormater');
jest.mock('@/hooks/aulas/useAulasList');
jest.mock('@/hooks/alunos/useAlunos');
jest.mock('@/hooks/aulas/useEditarAndamentoAula');
jest.mock('@/hooks/professores/useProfessores');

const mockDispatch = jest.fn();

describe('Aulas — fiação real do painel colapsável (AC-001-012/021)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    useDispatch.mockReturnValue(mockDispatch);
    useSelector.mockImplementation(cb =>
      cb({ aulas: { list: [], status: 'idle', action: null } })
    );

    useUserAuth.mockReturnValue({ currentUser: { id: 1, nome: 'Professor' } });
    useDeletarAula.mockReturnValue({ handleDeleteAula: jest.fn() });
    useFormater.mockReturnValue({
      telefoneFormatter: v => v,
      dataFormatter: v => v,
    });
    useAulasList.mockReturnValue({ columns: [], data: [] });
    useAlunos.mockReturnValue({ alunos: [] });
    useEditarAndamentoAula.mockReturnValue({
      submit: jest.fn(),
      isLoading: false,
    });
    useProfessores.mockReturnValue({ professores: [] });
  });

  it('localStorage pré-semeado (painel recolhido + 2 filtros não-default): painel já recolhido e contagem "2", sem nenhuma interação', () => {
    localStorage.setItem(
      FILTER_PANEL_STORAGE_KEYS.aulas,
      JSON.stringify('recolhido')
    );
    localStorage.setItem(
      FILTER_STORAGE_KEYS.aulas,
      JSON.stringify({ tipo: 'PADRAO', idAluno: '123' })
    );

    render(<Aulas />);

    expect(screen.getByTestId('painel-filtros-colapsavel')).toHaveAttribute(
      'data-panel-state',
      'recolhido'
    );
    expect(screen.getByTestId('painel-filtros-contagem')).toHaveTextContent(
      '2'
    );
  });

  it('sem preferência salva e sem filtro aplicado: painel aberto e sem indicação de contagem', () => {
    render(<Aulas />);

    expect(screen.getByTestId('painel-filtros-colapsavel')).not.toHaveAttribute(
      'data-panel-state'
    );
    expect(
      screen.queryByTestId('painel-filtros-contagem')
    ).not.toBeInTheDocument();
  });
});
