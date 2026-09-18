import React from 'react';
import { render } from '@testing-library/react';
import { Table } from './index';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Mock do react-data-table-component para tornar o componente testável
jest.mock('react-data-table-component', () => {
  return function MockDataTable(props) {
    const {
      columns = [],
      data = [],
      progressPending,
      progressComponent,
      noDataComponent,
      customStyles = {},
    } = props;
    return (
      <div>
        <div data-testid="progress" data-visible={progressPending}>
          {progressPending ? 'progress' : 'no-progress'}
        </div>
        <div data-testid="columns">{columns.map(c => c.name).join('|')}</div>
        <div data-testid="rows">
          {data.map(r => r.nome || r.name || r.id).join('|')}
        </div>
        <div data-testid="no-data">
          {data.length === 0 ? noDataComponent : null}
        </div>
        <div data-testid="progress-component">
          {progressPending ? progressComponent : null}
        </div>
        <div data-testid="no-data-component">
          {data.length === 0 ? noDataComponent : null}
        </div>
        {/* Exposição do customStyles recebido pela lib — só assim o teste
            consegue provar o que é passado como prop, já que
            react-data-table-component não repassa customStyles para o DOM. */}
        <div data-testid="custom-styles">
          {JSON.stringify({
            progress: customStyles.progress ?? null,
            noData: customStyles.noData ?? null,
          })}
        </div>
      </div>
    );
  };
});

describe('Table component', () => {
  it('renders columns and rows', () => {
    const columns = [
      { name: 'Nome', selector: 'nome' },
      { name: 'Telefone', selector: 'telefone' },
    ];
    const data = [
      { id: 1, nome: 'João' },
      { id: 2, nome: 'Maria' },
    ];

    const { getByTestId } = render(
      <Table
        columns={columns}
        data={data}
        isLoading={false}
        notFoundMessage="Nenhum"
      />
    );

    expect(getByTestId('columns').textContent).toContain('Nome');
    expect(getByTestId('rows').textContent).toContain('João');
  });

  it('shows loading when isLoading is true', () => {
    const columns = [{ name: 'Col' }];
    const data = [];
    const { getByTestId } = render(
      <Table
        columns={columns}
        data={data}
        isLoading={true}
        notFoundMessage="Nada"
      />
    );

    expect(getByTestId('progress').getAttribute('data-visible')).toBe('true');
    expect(getByTestId('progress-component').textContent).toContain(
      'Carregando'
    );
  });

  it('shows noDataComponent when data empty', () => {
    const columns = [{ name: 'Col' }];
    const data = [];
    const { getByTestId } = render(
      <Table
        columns={columns}
        data={data}
        isLoading={false}
        notFoundMessage="Nada"
      />
    );

    expect(getByTestId('no-data').textContent).toContain('Nada');
  });
});

// BI-41: sem customStyles em progress/noData no tema dark, esses containers
// caem no fundo branco padrão da lib nos estados de carregando/vazio.
describe('Table component - customStyles do tema dark (BI-41)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithTheme = theme => {
    localStorage.setItem('theme', theme);
    const columns = [{ name: 'Col' }];
    return render(
      <ThemeProvider>
        <Table columns={columns} data={[]} isLoading notFoundMessage="Nada" />
      </ThemeProvider>
    );
  };

  it('aplica fundo escuro em progress e noData no tema dark (estados de carregando/vazio)', () => {
    const { getByTestId } = renderWithTheme('dark');

    const customStyles = JSON.parse(getByTestId('custom-styles').textContent);

    expect(customStyles.progress).toEqual({
      style: {
        backgroundColor: '#1f2937',
        color: 'var(--color-gray-300)',
      },
    });
    expect(customStyles.noData).toEqual({
      style: {
        backgroundColor: '#1f2937',
        color: 'var(--color-gray-300)',
      },
    });
  });

  it('não define customStyles (mantém padrão da lib) no tema claro', () => {
    const { getByTestId } = renderWithTheme('light');

    const customStyles = JSON.parse(getByTestId('custom-styles').textContent);

    expect(customStyles.progress).toBeNull();
    expect(customStyles.noData).toBeNull();
  });
});
