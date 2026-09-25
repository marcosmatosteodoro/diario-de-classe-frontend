import { render, screen, within } from '@testing-library/react';
import Configuracao from './page';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useUnsavedChangesGuard } from '@/providers/UnsavedChangesGuardProvider';
import { useConfiguracao } from '@/hooks/configuracoes/useConfiguracao';
import { useConfiguracaoForm } from '@/hooks/configuracoes/useConfiguracaoForm';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));
jest.mock('@/providers/UserAuthProvider');
jest.mock('@/providers/UnsavedChangesGuardProvider');
jest.mock('@/hooks/configuracoes/useConfiguracao');
jest.mock('@/hooks/configuracoes/useConfiguracaoForm');

const { notFound } = require('next/navigation');

// Ordem deliberadamente embaralhada: prova que a exibição ordena por
// diaSemana (SEGUNDA → DOMINGO) independentemente da ordem recebida — o PUT
// devolve os dias sem ordenar, só o GET ordena.
// Valores distintos por dia (nenhum par de horaInicial/horaFinal repetido
// entre os dias preenchidos): prova que cada dia exibe o próprio estado, não
// o de outro dia por índice. QUARTA é inativa com hora preenchida — estado
// residual plausível (dia foi desativado sem limpar o horário).
const DIAS_DE_FUNCIONAMENTO_EMBARALHADOS = [
  {
    diaSemana: 'QUARTA',
    ativo: false,
    horaInicial: '09:30',
    horaFinal: '13:30',
  },
  { diaSemana: 'DOMINGO', ativo: false, horaInicial: '', horaFinal: '' },
  {
    diaSemana: 'SEGUNDA',
    ativo: true,
    horaInicial: '07:00',
    horaFinal: '11:00',
  },
  { diaSemana: 'SABADO', ativo: false, horaInicial: '', horaFinal: '' },
  {
    diaSemana: 'SEXTA',
    ativo: true,
    horaInicial: '11:15',
    horaFinal: '15:15',
  },
  {
    diaSemana: 'TERCA',
    ativo: true,
    horaInicial: '08:15',
    horaFinal: '12:15',
  },
  {
    diaSemana: 'QUINTA',
    ativo: true,
    horaInicial: '10:45',
    horaFinal: '14:45',
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
  let setGuard;
  let clearGuard;

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
      isDirty: false,
      handleChange: jest.fn(),
      handleSubmit: jest.fn(),
      handleDiasDeFuncionamentoChange: jest.fn(),
      isLoading: false,
    });

    setGuard = jest.fn();
    clearGuard = jest.fn();
    useUnsavedChangesGuard.mockReturnValue({
      setGuard,
      clearGuard,
      confirmNavigation: () => true,
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

    it('rotula os campos de minutos com a unidade visível no label', () => {
      render(<Configuracao />);

      expect(
        screen.getByLabelText('Duração da Aula (minutos) *')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Tolerância de Atraso (minutos) *')
      ).toBeInTheDocument();
    });

    it('tem 7 checkboxes "Ativo" e 7 campos de "Hora inicial"/"Hora final" dentro da seção de horário', () => {
      render(<Configuracao />);
      const secaoHorario = screen
        .getByText('Horário de funcionamento')
        .closest('section');

      expect(within(secaoHorario).getAllByLabelText('Ativo')).toHaveLength(7);
      expect(
        within(secaoHorario).getAllByLabelText('Hora inicial')
      ).toHaveLength(7);
      expect(within(secaoHorario).getAllByLabelText('Hora final')).toHaveLength(
        7
      );
    });
  });

  describe('texto de apoio honesto (AC-001-002)', () => {
    it('a duração da aula tem as três afirmações como descrição acessível do próprio campo, dentro da seção "Aulas"', () => {
      render(<Configuracao />);
      const secaoAulas = screen.getByText('Aulas').closest('section');
      const campoDuracao =
        within(secaoAulas).getByLabelText(/Duração da Aula/i);

      expect(campoDuracao).toHaveAccessibleDescription(/sugerir a hora final/i);
      expect(campoDuracao).toHaveAccessibleDescription(
        /não muda a duração de aulas, dias de aula/i
      );
      expect(campoDuracao).toHaveAccessibleDescription(
        /só vale para quem entrar no sistema depois da mudança/i
      );
    });

    it('a tolerância tem as duas afirmações como descrição acessível do próprio campo, dentro da seção "Aulas"', () => {
      render(<Configuracao />);
      const secaoAulas = screen.getByText('Aulas').closest('section');
      const campoTolerancia =
        within(secaoAulas).getByLabelText(/Tolerância de Atraso/i);

      expect(campoTolerancia).toHaveAccessibleDescription(/armazenado/i);
      expect(campoTolerancia).toHaveAccessibleDescription(
        /não é aplicado automaticamente/i
      );
    });

    it('o horário de funcionamento tem as duas afirmações dentro da própria seção', () => {
      render(<Configuracao />);
      const secaoHorario = screen
        .getByText('Horário de funcionamento')
        .closest('section');

      expect(within(secaoHorario).getByText(/registrado/i)).toBeInTheDocument();
      expect(
        within(secaoHorario).getByText(/não restringe o lançamento de aulas/i)
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

  it('o cabeçalho de cada dia usa text-base (menor que o text-lg do SectionTitle da seção)', () => {
    render(<Configuracao />);

    screen.getAllByRole('heading', { level: 4 }).forEach(titulo => {
      expect(titulo).toHaveClass(
        'text-base',
        'font-semibold',
        'text-main',
        'mb-2'
      );
      expect(titulo).not.toHaveClass('text-xl');
    });
  });

  describe('valores por dia não vazam entre dias (AC-001-008)', () => {
    it('cada um dos 7 dias exibe o próprio ativo/horaInicial/horaFinal, nunca o de outro dia', () => {
      const { container } = render(<Configuracao />);

      DIAS_DE_FUNCIONAMENTO_EMBARALHADOS.forEach(
        ({ diaSemana, ativo, horaInicial, horaFinal }) => {
          const inputAtivo = container.querySelector(
            `input[name="${diaSemana}.ativo"]`
          );
          const inputHoraInicial = container.querySelector(
            `input[name="${diaSemana}.horaInicial"]`
          );
          const inputHoraFinal = container.querySelector(
            `input[name="${diaSemana}.horaFinal"]`
          );

          expect(inputAtivo.checked).toBe(ativo);
          expect(inputHoraInicial.disabled).toBe(!ativo);
          expect(inputHoraFinal.disabled).toBe(!ativo);
          expect(inputHoraInicial.value).toBe(horaInicial);
          expect(inputHoraFinal.value).toBe(horaFinal);
        }
      );
    });
  });

  describe('AC-001-005: guard de navegação registrado a partir de isDirty', () => {
    const mockUseConfiguracaoForm = isDirty => ({
      formData: {
        duracaoAula: 40,
        tolerancia: 10,
        diasDeFuncionamento: DIAS_DE_FUNCIONAMENTO_EMBARALHADOS,
      },
      isDirty,
      handleChange: jest.fn(),
      handleSubmit: jest.fn(),
      handleDiasDeFuncionamentoChange: jest.fn(),
      isLoading: false,
    });

    it('registra o guard refletindo isDirty a cada mudança, e limpa no cleanup do efeito e no unmount', () => {
      useConfiguracaoForm.mockReturnValue(mockUseConfiguracaoForm(false));

      const { rerender, unmount } = render(<Configuracao />);

      expect(setGuard).toHaveBeenCalledTimes(1);
      expect(setGuard.mock.calls[0][0]()).toBe(false);
      expect(clearGuard).not.toHaveBeenCalled();

      useConfiguracaoForm.mockReturnValue(mockUseConfiguracaoForm(true));
      rerender(<Configuracao />);

      expect(clearGuard).toHaveBeenCalledTimes(1);
      expect(setGuard).toHaveBeenCalledTimes(2);
      expect(setGuard.mock.calls[1][0]()).toBe(true);
      // Prova a ordem (não só a contagem): o cleanup do efeito anterior roda
      // antes do novo `setGuard` — nunca deixa o guard antigo (isDirty
      // obsoleto) apontado.
      expect(clearGuard.mock.invocationCallOrder[0]).toBeLessThan(
        setGuard.mock.invocationCallOrder[1]
      );

      unmount();
      expect(clearGuard).toHaveBeenCalledTimes(2);
    });
  });
});
