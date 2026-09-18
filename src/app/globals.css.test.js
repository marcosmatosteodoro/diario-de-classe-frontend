import fs from 'node:fs';
import path from 'node:path';

// BI-40: ícone nativo do seletor de data ilegível no tema dark.
// jsdom não processa o pipeline do Tailwind (@layer/@apply/nesting nativo),
// então a prova combina duas pernas independentes:
// 1) inspeção textual do fonte real, com contagem de chaves, para garantir
//    que a regra existe e está escopada exatamente sob `[data-theme='dark']`
//    (nunca solta, o que vazaria pro tema light) e mira só
//    `input[type='date'].input-field` (nunca `.input-field` isolado, o que
//    afetaria os outros inputs);
// 2) verificação de estilo computado via jsdom, com uma folha de estilo
//    mínima e plana (sem nesting) que espelha a regra esperada, provando o
//    efeito real: color-scheme resolve para 'dark' só na combinação
//    tema-dark + input de data.

const cssPath = path.join(__dirname, 'globals.css');
const cssSource = fs.readFileSync(cssPath, 'utf8');

/**
 * Extrai o corpo (conteúdo entre chaves) do primeiro bloco cujo seletor é
 * `selector`, procurando dentro de `source` a partir de `fromIndex`, via
 * contagem de chaves (não regex ingênua, que quebraria em blocos aninhados).
 */
function extractBlockBody(source, selector, fromIndex = 0) {
  const startOfSelector = source.indexOf(selector, fromIndex);
  if (startOfSelector === -1) return null;
  const openBrace = source.indexOf('{', startOfSelector);
  if (openBrace === -1) return null;

  let depth = 1;
  let i = openBrace + 1;
  for (; i < source.length && depth > 0; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
  }
  if (depth !== 0) return null;

  return {
    body: source.slice(openBrace + 1, i - 1),
    start: startOfSelector,
    end: i,
  };
}

describe('globals.css — ícone do seletor de data no tema dark (BI-40)', () => {
  it("escopa color-scheme: dark somente dentro de [data-theme='dark'], mirando input[type='date'].input-field", () => {
    const darkBlock = extractBlockBody(cssSource, "[data-theme='dark'] {");
    expect(darkBlock).not.toBeNull();

    const dateIconRule = extractBlockBody(
      darkBlock.body,
      "input[type='date'].input-field"
    );
    expect(dateIconRule).not.toBeNull();
    expect(dateIconRule.body.replace(/\s+/g, ' ').trim()).toBe(
      'color-scheme: dark;'
    );
  });

  it('não aplica color-scheme em .input-field fora do escopo do input de data (não regressiona texto/select nem o tema light)', () => {
    const darkBlock = extractBlockBody(cssSource, "[data-theme='dark'] {");
    const bareInputFieldRule = extractBlockBody(
      darkBlock.body,
      '.input-field {'
    );
    expect(bareInputFieldRule).not.toBeNull();
    expect(bareInputFieldRule.body).not.toMatch(/color-scheme/);

    // Fora do bloco [data-theme='dark'] (tema light) não há color-scheme
    // algum associado a input de data.
    const outsideDarkBlock =
      cssSource.slice(0, darkBlock.start) + cssSource.slice(darkBlock.end);
    expect(outsideDarkBlock).not.toMatch(/color-scheme/);
  });

  it('resolve color-scheme: dark no input de data quando o tema dark está ativo, e nada no tema light nem em outros tipos de input', () => {
    const style = document.createElement('style');
    // Folha mínima e plana (sem nesting/@layer) que espelha a regra provada
    // no teste anterior — jsdom não processa a build real do Tailwind.
    style.textContent = `
      [data-theme='dark'] input[type='date'].input-field {
        color-scheme: dark;
      }
    `;
    document.head.appendChild(style);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'input-field';
    document.body.appendChild(dateInput);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'input-field';
    document.body.appendChild(textInput);

    document.documentElement.setAttribute('data-theme', 'light');
    expect(getComputedStyle(dateInput).colorScheme).toBe('');

    document.documentElement.setAttribute('data-theme', 'dark');
    expect(getComputedStyle(dateInput).colorScheme).toBe('dark');
    expect(getComputedStyle(textInput).colorScheme).toBe('');

    document.head.removeChild(style);
    document.body.removeChild(dateInput);
    document.body.removeChild(textInput);
    document.documentElement.removeAttribute('data-theme');
  });
});
