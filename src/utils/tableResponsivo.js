/**
 * Fixa colunas essenciais (à esquerda) e a coluna de ações (à direita) de uma
 * tabela durante o scroll horizontal contido ao container (DEC-002-001/005).
 *
 * Determinístico e sem medição em runtime (`ResizeObserver`/
 * `getBoundingClientRect`, DEC-002-005): o `left` de cada coluna `essential`
 * é a soma acumulada das larguras (`width`, string `'NNpx'`) das colunas
 * `essential` anteriores, na ordem do array. Coluna `essential` sem `width`
 * definido (hoje o caso de todo nome/data que não seja `#`) recebe uma
 * largura fixa padrão para o cálculo continuar determinístico — sem essa
 * largura o acúmulo de `left` das colunas seguintes seria `NaN`.
 *
 * Não muta o array/objetos recebidos — devolve um array novo.
 *
 * @param {Array<{
 *   essential?: boolean,
 *   isAction?: boolean,
 *   width?: string,
 * }>} columns
 * @returns {Array<object>} mesmo formato de `columns`, com `style`
 *   (`position: 'sticky'`) nas colunas `essential`/`isAction`
 */
const ESSENTIAL_DEFAULT_WIDTH_PX = 140;
const STICKY_Z_INDEX = 1;
const STICKY_BACKGROUND_COLOR = 'var(--color-table-sticky-bg)';

export function withStickyColumns(columns) {
  let accumulatedLeftPx = 0;

  return columns.map(column => {
    if (column.essential) {
      const widthPx = column.width
        ? parseInt(column.width, 10)
        : ESSENTIAL_DEFAULT_WIDTH_PX;
      const left = `${accumulatedLeftPx}px`;
      accumulatedLeftPx += widthPx;

      return {
        ...column,
        width: column.width || `${widthPx}px`,
        style: {
          position: 'sticky',
          left,
          zIndex: STICKY_Z_INDEX,
          backgroundColor: STICKY_BACKGROUND_COLOR,
        },
      };
    }

    if (column.isAction) {
      return {
        ...column,
        style: {
          position: 'sticky',
          right: '0px',
          zIndex: STICKY_Z_INDEX,
          backgroundColor: STICKY_BACKGROUND_COLOR,
        },
      };
    }

    return column;
  });
}
