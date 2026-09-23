import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelectField } from './SearchableSelectField';
import { SearchableSelectField as SearchableSelectFieldFromBarrel } from '@/components';

const OPTIONS = [
  { value: '1', label: 'João Silva' },
  { value: '2', label: 'Maria Souza' },
  { value: '3', label: 'José Santos' },
];

// Harness controlado: reflete `onChange` de volta em `value`, como um
// `use<Entidade>Form` real faria — necessário para provar que a seleção
// atualiza o texto exibido (AC-001-005), não só que `onChange` foi chamado.
const ControlledSearchableSelectField = ({
  initialValue = '',
  onChangeSpy,
  options = OPTIONS,
}) => {
  const [value, setValue] = useState(initialValue);
  const handleChange = e => {
    onChangeSpy?.(e);
    setValue(e.target.value);
  };
  return (
    <SearchableSelectField
      htmlFor="idAluno"
      label="Aluno"
      value={value}
      onChange={handleChange}
      options={options}
    />
  );
};

describe('SearchableSelectField', () => {
  it('AC-001-001: aparece como o novo seletor pesquisável, sem mecanismo de múltipla seleção', () => {
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value="1"
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    const input = screen.getByLabelText('Aluno');
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveValue('João Silva');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('AC-001-009: nunca renderiza mais opções do que `options` recebida', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    await user.click(screen.getByLabelText('Aluno'));
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });

  it('AC-001-002: isLoading exibe Loading; opções completas aparecem assim que `options` chega, sem digitação', () => {
    const { rerender } = render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={[]}
        isLoading
      />
    );
    fireEvent.click(screen.getByLabelText('Aluno'));
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    rerender(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
        isLoading={false}
      />
    );
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
  });

  it('AC-001-003 (i): a cada tecla, estreita a lista às opções que correspondem, sem mínimo de caracteres', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.type(input, 'jo');
    const options = screen.getAllByRole('option');
    expect(options.map(option => option.textContent)).toEqual([
      'João Silva',
      'José Santos',
    ]);
  });

  it('AC-001-003 (ii): com errorMessage, mantém a última lista válida, mostra o erro e o input continua editável', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
        errorMessage="Erro ao buscar alunos"
      />
    );
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    expect(screen.getByText('Erro ao buscar alunos')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
    expect(input).not.toBeDisabled();
    await user.type(input, 'x');
    expect(input).toHaveValue('x');
  });

  it('AC-001-004: texto sem correspondência exibe estado vazio informativo, sem ação adicional', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.type(input, 'zzz');
    expect(
      screen.getByText('Nenhum resultado encontrado.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('AC-001-005: clique numa opção fecha o seletor, atualiza o texto exibido e chama onChange com o value exato', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    render(<ControlledSearchableSelectField onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Maria Souza' }));

    expect(onChangeSpy).toHaveBeenCalledWith({
      target: { name: 'idAluno', value: '2' },
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('Maria Souza');
  });

  it('AC-001-005/AC-001-006: Enter sobre a opção destacada por teclado confirma a seleção correta', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    render(<ControlledSearchableSelectField onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}'); // João(0) -> Maria(1) -> José(2)
    await user.keyboard('{Enter}');

    expect(onChangeSpy).toHaveBeenCalledWith({
      target: { name: 'idAluno', value: '3' },
    });
    expect(input).toHaveValue('José Santos');
  });

  it('AC-001-006: Enter ou espaço abrem o seletor com o campo focado', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    const input = screen.getByLabelText('Aluno');
    input.focus();

    await user.keyboard('{Enter}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard(' ');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('AC-001-006: ArrowDown repetido no último item permanece nele, não dá a volta', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    render(<ControlledSearchableSelectField onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(onChangeSpy).toHaveBeenCalledWith({
      target: { name: 'idAluno', value: '3' },
    });
  });

  it('AC-001-006: ArrowUp repetido no primeiro item permanece nele, não dá a volta', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    render(<ControlledSearchableSelectField onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard('{Enter}');

    expect(onChangeSpy).toHaveBeenCalledWith({
      target: { name: 'idAluno', value: '1' },
    });
  });

  it('AC-001-006: Esc fecha sem chamar onChange, e um caso irmão prova que o mesmo mock dispararia com Enter (controle positivo)', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    const { unmount } = render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value="1"
        onChange={onChangeSpy}
        options={OPTIONS}
      />
    );
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.keyboard('{Escape}');

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(input).toHaveValue('João Silva');
    unmount();

    // Controle positivo: o mesmo spy, no mesmo cenário, dispara se a tecla
    // apertada for Enter em vez de Esc (per lição
    // controle-positivo-e-por-assercao-nao-por-mecanismo).
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value="1"
        onChange={onChangeSpy}
        options={OPTIONS}
      />
    );
    const secondInput = screen.getByLabelText('Aluno');
    await user.click(secondInput);
    await user.keyboard('{Enter}');
    expect(onChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('NFR-001-001: com fixture de 1.000 opções, a lista reflete cada tecla em até ~300ms', () => {
    const bigOptions = Array.from({ length: 1000 }, (_, index) => ({
      value: String(index),
      label: `Opção número ${index} João`,
    }));
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={bigOptions}
      />
    );
    const input = screen.getByLabelText('Aluno');
    fireEvent.click(input);

    const keystrokes = ['j', 'jo', 'joã', 'joão', 'joão 1', 'joão 12'];
    keystrokes.forEach(text => {
      const start = performance.now();
      fireEvent.change(input, { target: { value: text } });
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(300);
    });
  });

  it('index.js reexporta SearchableSelectField e o barrel `@/components` resolve', () => {
    render(
      <SearchableSelectFieldFromBarrel
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    expect(screen.getByLabelText('Aluno')).toBeInTheDocument();
  });
});
