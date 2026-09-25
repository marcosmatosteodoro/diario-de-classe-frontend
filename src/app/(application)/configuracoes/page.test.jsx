import { render, screen, within } from '@testing-library/react';
import Configuracao from './page';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useConfiguracao } from '@/hooks/configuracoes/useConfiguracao';
import { useConfiguracaoForm } from '@/hooks/configuracoes/useConfiguracaoForm';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));
jest.mock('@/providers/UserAuthProvider');
jest.mock('@/hooks/configuracoes/useConfiguracao');
jest.mock('@/hooks/configuracoes/useConfiguracaoForm');
// Real Section/SectionTitle/InputField/CheckboxField: as asserções de
// agrupamento por seção e de texto de apoio (AC-001-001/002, TASK-002-004)
// precisam do DOM de verdade, não só da chamada ao componente automockado.
jest.mock('@/components', () => jest.requireActual('@/components'));

const { notFound } = require('next/navigation');

// Ordem deliberadamente embaralhada: prova que a exibição ordena por
// diaSemana (SEGUNDA → DOMINGO) independentemente da ordem recebida — o PUT
// devolve os dias sem ordenar, só o GET ordena (furo no plano, fecho wave 1).
const DIAS_DE_FUNCIONAMENTO_EMBARALHADOS = [
  {
    diaSemana: 'QUARTA',
    ativo: true,
    horaInicial: '08:00',
    horaFinal: '12:00',
  },
  { diaSemana: 'DOMINGO', ativo: false, horaInicial: '', horaFinal: '' },
  {
    diaSemana: 'SEGUNDA',
    ativo: true,
    horaInicial: '08:00',
    horaFinal: '12:00',
  },
  { diaSemana: 'SABADO', ativo: false, horaInicial: '', horaFinal: '' },
  {
    diaSemana: 'SEXTA',
    ativo: true,
    horaInicial: '08:00',
    horaFinal: '12:00',
  },
  {
    diaSemana: 'TERCA',
    ativo: true,
    horaInicial: '08:00',
    horaFinal: '12:00',
  },
  {
    diaSemana: 'QUINTA',
    ativo: true,
    horaInicial: '08:00',
    horaFinal: '12:00',
  },
];

const ORDEM_CANONICA_LABELS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

describe('Configuracao Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useUserAuth.mockReturnValue({
      currentUser: { id: 1, nome: 'Professor' },
      isAdmin: () => true,
    });

    useConfiguracao.mockReturnValue({
      configuracao: { id: 1, diasTrabalho: 5 },
      isLoading: false,
      isNotFound: false,
    });

    useConfiguracaoForm.mockReturnValue({
      formData: {
        duracaoAula: 40,
        tolerancia: 10,
        diasDeFuncionamento: DIAS_DE_FUNCIONAMENTO_EMBARALHADOS,
      },
      handleChange: jest.fn(),
      handleSubmit: jest.fn(),
      handleDiasDeFuncionamentoChange: jest.fn(),
      isLoading: false,
    });
  });

  it('renders configuracao page', () => {
    render(<Configuracao />);
    expect(useUserAuth).toHaveBeenCalled();
  });

  it('calls notFound when configuracao not found', () => {
    useUserAuth.mockReturnValue({
      currentUser: { id: 1, nome: 'Professor' },
      isAdmin: () => false,
    });

    useConfiguracao.mockReturnValue({
      configuracao: null,
      isLoading: false,
      isNotFound: true,
    });

    render(<Configuracao />);
    expect(notFound).toHaveBeenCalled();
  });

  it('displays loading state', () => {
    useConfiguracao.mockReturnValue({
      configuracao: null,
      isLoading: true,
      isNotFound: false,
    });

    render(<Configuracao />);
    expect(useConfiguracao).toHaveBeenCalled();
  });

  describe('seções nomeadas (AC-001-001)', () => {
    it('agrupa duração da aula e tolerância dentro da seção "Aulas"', () => {
      render(<Configuracao />);
      const secaoAulas = screen.getByText('Aulas').closest('section');

      expect(
        within(secaoAulas).getByLabelText(/Duração da Aula/i)
      ).toBeInTheDocument();
      expect(
        within(secaoAulas).getByLabelText(/Tolerância de Atraso/i)
      ).toBeInTheDocument();
    });

    it('agrupa os 7 dias dentro da seção "Horário de funcionamento"', () => {
      render(<Configuracao />);
      const secaoHorario = screen
        .getByText('Horário de funcionamento')
        .closest('section');

      ORDEM_CANONICA_LABELS.forEach(label => {
        expect(within(secaoHorario).getByText(label)).toBeInTheDocument();
      });
    });

    it('não inclui os campos de "Aulas" dentro da seção de horário', () => {
      render(<Configuracao />);
      const secaoHorario = screen
        .getByText('Horário de funcionamento')
        .closest('section');

      expect(
        within(secaoHorario).queryByLabelText(/Duração da Aula/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('texto de apoio honesto (AC-001-002)', () => {
    it('exibe as três afirmações do texto de duração da aula', () => {
      render(<Configuracao />);

      expect(screen.getByText(/sugerir a hora final/i)).toBeInTheDocument();
      expect(
        screen.getByText(/não muda a duração de aulas, dias de aula/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /só vale para quem entrar no sistema depois da mudança/i
        )
      ).toBeInTheDocument();
    });

    it('exibe as duas afirmações do texto de tolerância', () => {
      render(<Configuracao />);

      expect(screen.getByText(/armazenado/i)).toBeInTheDocument();
      expect(
        screen.getByText(/não é aplicado automaticamente/i)
      ).toBeInTheDocument();
    });

    it('exibe as duas afirmações do texto de horário de funcionamento', () => {
      render(<Configuracao />);

      expect(screen.getByText(/registrado/i)).toBeInTheDocument();
      expect(
        screen.getByText(/não restringe o lançamento de aulas/i)
      ).toBeInTheDocument();
    });
  });

  it('exibe os 7 dias em ordem estável por diaSemana, independente da ordem recebida', () => {
    render(<Configuracao />);

    const titulosDosDias = screen
      .getAllByRole('heading', { level: 4 })
      .map(elemento => elemento.textContent);

    expect(titulosDosDias).toEqual(ORDEM_CANONICA_LABELS);
  });
});
