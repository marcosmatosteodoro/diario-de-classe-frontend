import { render, screen } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import Contratos from './page';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useDeletarContrato } from '@/hooks/contratos/useDeletarContrato';
import { useFormater } from '@/hooks/useFormater';
import { useContratosList } from '@/hooks/contratos/useContratosList';
import { useAlunos } from '@/hooks/alunos/useAlunos';
import { FILTER_STORAGE_KEYS, FILTER_PANEL_STORAGE_KEYS } from '@/constants';

// Prova de fiação real (AC-001-012/021 — cenário irmão de /aulas, código
// próprio deste hook): NÃO mocka '@/components' (que automocaria
// ListPage/PainelFiltrosColapsavel — a suíte `page.test.jsx` já cobre o
// comportamento superficial com esse automock, mas ele não serve a esta
// prova) nem `@/hooks/contratos/useContratos` (precisamos do cálculo real de
// `appliedCount` e da leitura real de `localStorage`). Só os colaboradores
// alheios ao painel são mockados.
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));
jest.mock('@/store/slices/contratosSlice', () => ({
  getContratos: jest.fn(() => ({ type: 'getContratos' })),
}));
jest.mock('@/providers/UserAuthProvider');
jest.mock('@/hooks/contratos/useDeletarContrato');
jest.mock('@/hooks/useFormater');
jest.mock('@/hooks/contratos/useContratosList');
jest.mock('@/hooks/alunos/useAlunos');

const mockDispatch = jest.fn();

describe('Contratos — fiação real do painel colapsável (AC-001-012/021)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    useDispatch.mockReturnValue(mockDispatch);
    useSelector.mockImplementation(cb =>
      cb({ contratos: { list: [], status: 'idle', action: null } })
    );

    useUserAuth.mockReturnValue({
      currentUser: { id: 1, nome: 'Professor' },
      isAdmin: () => true,
    });
    useDeletarContrato.mockReturnValue({ handleDeleteContrato: jest.fn() });
    useFormater.mockReturnValue({
      telefoneFormatter: v => v,
      dataFormatter: v => v,
    });
    useContratosList.mockReturnValue({ columns: [], data: [] });
    useAlunos.mockReturnValue({ alunos: [] });
  });

  it('localStorage pré-semeado (painel recolhido + 2 filtros não-default): painel já recolhido e contagem "2", sem nenhuma interação', () => {
    localStorage.setItem(
      FILTER_PANEL_STORAGE_KEYS.contratos,
      JSON.stringify('recolhido')
    );
    localStorage.setItem(
      FILTER_STORAGE_KEYS.contratos,
      JSON.stringify({ idioma: 'INGLES', idAluno: '123' })
    );

    render(<Contratos />);

    expect(screen.getByTestId('painel-filtros-colapsavel')).toHaveAttribute(
      'data-panel-state',
      'recolhido'
    );
    expect(screen.getByTestId('painel-filtros-contagem')).toHaveTextContent(
      '2'
    );
  });

  it('sem preferência salva e sem filtro aplicado: painel aberto e sem indicação de contagem', () => {
    render(<Contratos />);

    expect(screen.getByTestId('painel-filtros-colapsavel')).not.toHaveAttribute(
      'data-panel-state'
    );
    expect(
      screen.queryByTestId('painel-filtros-contagem')
    ).not.toBeInTheDocument();
  });

  it('requisito emergente (achado 7 do gate 11): existe um único heading "Filtros" na árvore renderizada — prova que o filter.jsx não reintroduziu o <h3> que o painel colapsável já é dono', () => {
    render(<Contratos />);

    expect(
      screen.getAllByRole('heading', { name: 'Filtros', level: 3 })
    ).toHaveLength(1);
  });
});
