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

// jsdom não implementa scrollIntoView — stub local, não mock de módulo.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  Element.prototype.scrollIntoView.mockClear();
});

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
  it('AC-001-001: aparece como o novo seletor pesquisável, sem mecanismo de múltipla seleção, seleção provada por contagem', async () => {
    const user = userEvent.setup();
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

    // Prova por contagem: marcar aria-selected em todas as opções, ou
    // aria-multiselectable no listbox, teria que derrubar esta asserção.
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    const listbox = screen.getByRole('listbox');
    expect(listbox).not.toHaveAttribute('aria-multiselectable');
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1);
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

  it('FR-001-003: digitar diretamente, sem clique prévio, também abre e filtra o seletor', () => {
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
    fireEvent.change(input, { target: { value: 'maria' } });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'Maria Souza',
    ]);
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

  it('AC-001-003 (i), caso de 1 único caractere: um mutante que exige 2+ caracteres não passa despercebido', async () => {
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
    await user.type(input, 'j');
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

  it('AC-001-004: erro presente com options=[] mostra só o erro, sem o vazio (não carregou nada ainda)', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={[]}
        errorMessage="Erro ao buscar alunos"
      />
    );
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    expect(screen.getByText('Erro ao buscar alunos')).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum resultado encontrado.')
    ).not.toBeInTheDocument();
  });

  it('AC-001-004: erro presente com options preenchida e busca sem match mostra os dois (erro e vazio)', async () => {
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
    await user.type(input, 'zzz');
    expect(screen.getByText('Erro ao buscar alunos')).toBeInTheDocument();
    expect(
      screen.getByText('Nenhum resultado encontrado.')
    ).toBeInTheDocument();
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
    // Sem destaque por padrão ao abrir: a primeira seta estabelece o
    // destaque em João(0); as duas seguintes avançam para Maria(1) e José(2).
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
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

  it('espaço abre o seletor por um caminho que só o espaço produz (não vira texto digitado)', async () => {
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

    await user.keyboard(' ');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    // Distinto de digitar literalmente um espaço como busca: o espaço de
    // abertura não vira texto.
    expect(input).toHaveValue('');
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
    // Estabelece o destaque no primeiro item (João, index 0) antes de testar
    // o clamp — não há destaque por padrão ao abrir.
    await user.keyboard('{ArrowDown}');
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
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('sem item destacado por padrão ao abrir ou ao filtrar (nenhuma opção com destaque até a primeira seta)', async () => {
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
    expect(
      screen.queryByRole('option', { selected: true })
    ).not.toBeInTheDocument();

    await user.type(input, 'a');
    expect(
      screen.queryByRole('option', { selected: true })
    ).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'João Silva' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('ArrowDown a partir de "nenhum destaque" vai para o primeiro item filtrado', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    render(<ControlledSearchableSelectField onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChangeSpy).toHaveBeenCalledWith({
      target: { name: 'idAluno', value: '1' },
    });
  });

  it('ArrowUp a partir de "nenhum destaque" vai para o último item filtrado', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    render(<ControlledSearchableSelectField onChangeSpy={onChangeSpy} />);
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    await user.keyboard('{ArrowUp}{Enter}');

    expect(onChangeSpy).toHaveBeenCalledWith({
      target: { name: 'idAluno', value: '3' },
    });
  });

  it('hover do mouse escreve no mesmo estado de destaque do teclado (única fonte de "ativo" por vez)', async () => {
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
    await user.keyboard('{ArrowDown}'); // destaque do teclado em João (index 0)
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.hover(options[1]); // mouse parado sobre Maria (index 1)
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    // Só uma fonte de "ativo" por vez — nunca dois destacados ao mesmo tempo.
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1);
  });

  it('mudar o índice destacado (seta) aciona scrollIntoView sobre o item correspondente', async () => {
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
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    await user.keyboard('{ArrowDown}');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
    });
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

  it('AC required: passado como true, o BaseField sufixa o rótulo com *', () => {
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        required
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    expect(screen.getByText('Aluno *')).toBeInTheDocument();
  });

  it('AC required: omitido ou false, sem sufixo no rótulo', () => {
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    expect(screen.getByText('Aluno')).toBeInTheDocument();
    expect(screen.queryByText('Aluno *')).not.toBeInTheDocument();
  });

  it('default de `options` é [] — renderiza sem lançar erro e abre em estado vazio', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Aluno');
    await user.click(input);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(
      screen.getByText('Nenhum resultado encontrado.')
    ).toBeInTheDocument();
  });

  it('`placeholder` aparece como atributo quando passado; omitido, não aparece com valor fixo', () => {
    const { rerender } = render(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
        placeholder="Buscar aluno"
      />
    );
    expect(screen.getByLabelText('Aluno')).toHaveAttribute(
      'placeholder',
      'Buscar aluno'
    );

    rerender(
      <SearchableSelectField
        htmlFor="idAluno"
        label="Aluno"
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );
    expect(screen.getByLabelText('Aluno')).not.toHaveAttribute('placeholder');
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
