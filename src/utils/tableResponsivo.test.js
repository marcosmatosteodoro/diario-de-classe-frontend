import { withStickyColumns } from './tableResponsivo';

describe('withStickyColumns', () => {
  it('acumula o left das colunas essenciais na ordem do array', () => {
    const columns = [
      { name: '#', essential: true, width: '75px' },
      { name: 'Aluno', essential: true, width: '160px' },
      { name: 'Data', essential: true, width: '110px' },
      { name: 'Professor', essential: false },
      { name: 'Ações', isAction: true, width: 'auto' },
    ];

    const result = withStickyColumns(columns);

    expect(result[0].style.left).toBe('0px');
    expect(result[1].style.left).toBe('75px');
    expect(result[2].style.left).toBe('235px');
    expect(result[3].style).toBeUndefined();
    expect(result[4].style.right).toBe('0px');
  });

  it('não lança e não atribui right quando não há coluna isAction (readOnly)', () => {
    const columns = [
      { name: '#', essential: true, width: '75px' },
      { name: 'Nome', essential: true, width: '140px' },
      { name: 'Telefone', essential: false },
    ];

    expect(() => withStickyColumns(columns)).not.toThrow();

    const result = withStickyColumns(columns);
    result.forEach(column => {
      expect(column.style?.right).toBeUndefined();
    });
  });

  it('é determinístico e não muta o array recebido', () => {
    const columns = [
      { name: '#', essential: true, width: '75px' },
      { name: 'Nome', essential: true, width: '140px' },
      { name: 'Ações', isAction: true, width: 'auto' },
    ];

    const first = withStickyColumns(columns);
    const second = withStickyColumns(columns);

    expect(first).toEqual(second);
    expect(columns[0].style).toBeUndefined();
  });

  it('não mede nada em runtime (sem ResizeObserver/getBoundingClientRect)', () => {
    const originalResizeObserver = global.ResizeObserver;
    const originalGetBoundingClientRect =
      Element.prototype.getBoundingClientRect;

    global.ResizeObserver = function () {
      throw new Error('ResizeObserver não deveria ser chamado');
    };
    Element.prototype.getBoundingClientRect = function () {
      throw new Error('getBoundingClientRect não deveria ser chamado');
    };

    const columns = [
      { name: '#', essential: true, width: '75px' },
      { name: 'Nome', essential: true, width: '140px' },
      { name: 'Ações', isAction: true, width: 'auto' },
    ];

    expect(() => withStickyColumns(columns)).not.toThrow();

    global.ResizeObserver = originalResizeObserver;
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });
});
