import fs from 'node:fs';
import path from 'node:path';

// BI-40: ícone nativo do seletor de data/hora ilegível no tema dark.
// jsdom não processa o pipeline do Tailwind (@layer/@apply/nesting nativo),
// então a prova combina duas pernas independentes:
// 1) inspeção textual do fonte real, com contagem de chaves, para garantir
//    que a regra existe, está escopada exatamente sob `[data-theme='dark']`
//    (nunca solta, o que vazaria pro tema light) e mira só
//    `input[type='date']`/`input[type='time']` com `.input-field` (nunca
//    `.input-field` isolado, o que afetaria os outros inputs);
// 2) verificação de estilo computado via jsdom, injetando no documento a
//    MESMA regra extraída do arquivo real (seletor e corpo vêm do fonte,
//    não de uma cópia manual) — prova que essa regra, tal como escrita em
//    produção, resolve `color-scheme: dark` no motor de CSS. Isso não prova
//    o ícone renderizado pelo user-agent (fora do alcance de jsdom); essa
//    ponta é papel do `screenVerify`/QA.

const cssPath = path.join(__dirname, 'globals.css');
const cssSource = fs.readFileSync(cssPath, 'utf8');

/**
 * Extrai o corpo (conteúdo entre chaves) do bloco cuja chave de abertura é
 * a primeira `{` a partir de `startIndex`, via contagem de chaves (não
 * regex ingênua, que quebraria em blocos aninhados).
 */
function extractBlockBodyAt(source, startIndex) {
  if (startIndex < 0) return null;
  const openBrace = source.indexOf('{', startIndex);
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
    start: startIndex,
    end: i,
  };
}

/**
 * Extrai o corpo do bloco cujo texto de abertura é `openerLiteral` (deve
 * terminar em `{`), procurando a partir de `fromIndex`.
 */
function extractBlockBody(source, openerLiteral, fromIndex = 0) {
  const startOfOpener = source.indexOf(openerLiteral, fromIndex);
  return extractBlockBodyAt(source, startOfOpener);
}

/**
 * Extrai uma regra ancorada por `selectorAnchor` (início literal do seletor,
 * sem o `{`), devolvendo o texto completo do seletor (pode ser lista
 * separada por vírgula) e o corpo.
 */
function extractRuleBySelectorAnchor(source, selectorAnchor, fromIndex = 0) {
  const start = source.indexOf(selectorAnchor, fromIndex);
  if (start === -1) return null;
  const openBrace = source.indexOf('{', start);
  if (openBrace === -1) return null;
  const selectorText = source.slice(start, openBrace).trim();

  let depth = 1;
  let i = openBrace + 1;
  for (; i < source.length && depth > 0; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
  }
  if (depth !== 0) return null;

  return {
    selectorText,
    body: source.slice(openBrace + 1, i - 1),
    start,
    end: i,
  };
}

/**
 * Índice da regra `.input-field { ... }` SOLTA (não composta, ex.:
 * `input[type='date'].input-field`). Ancorado por lookbehind negativo: o
 * caractere antes de `.input-field` não pode ser `]`/letra/dígito — o que
 * excluiria compostos como `...'].input-field` sem depender da ordem em que
 * as regras aparecem no arquivo.
 */
function findBareInputFieldRuleStart(source, fromIndex = 0) {
  const regex = /(?<![\w\]])\.input-field\s*\{/g;
  regex.lastIndex = fromIndex;
  const match = regex.exec(source);
  return match ? match.index : -1;
}

describe('globals.css — ícone do seletor de data/hora no tema dark (BI-40)', () => {
  it("escopa color-scheme: dark somente dentro de [data-theme='dark'], mirando input[type='date']/input[type='time'] com .input-field", () => {
    const darkBlock = extractBlockBody(cssSource, "[data-theme='dark'] {");
    expect(darkBlock).not.toBeNull();

    const dateTimeIconRule = extractRuleBySelectorAnchor(
      darkBlock.body,
      "input[type='date'].input-field"
    );
    expect(dateTimeIconRule).not.toBeNull();
    expect(dateTimeIconRule.selectorText.replace(/\s+/g, ' ').trim()).toBe(
      "input[type='date'].input-field, input[type='time'].input-field"
    );
    expect(dateTimeIconRule.body.replace(/\s+/g, ' ').trim()).toBe(
      'color-scheme: dark;'
    );
  });

  it('não aplica color-scheme em .input-field fora do escopo de data/hora (não regressiona texto/select nem o tema light)', () => {
    const darkBlock = extractBlockBody(cssSource, "[data-theme='dark'] {");
    const bareStart = findBareInputFieldRuleStart(darkBlock.body);
    expect(bareStart).toBeGreaterThanOrEqual(0);

    const bareInputFieldRule = extractBlockBodyAt(darkBlock.body, bareStart);
    expect(bareInputFieldRule).not.toBeNull();
    expect(bareInputFieldRule.body).not.toMatch(/color-scheme/);

    // Fora do bloco [data-theme='dark'] (tema light) não há color-scheme
    // algum associado a input de data/hora.
    const outsideDarkBlock =
      cssSource.slice(0, darkBlock.start) + cssSource.slice(darkBlock.end);
    expect(outsideDarkBlock).not.toMatch(/color-scheme/);
  });

  it('resolve color-scheme: dark, com a regra extraída do fonte real, no input de data/hora quando o tema dark está ativo — e nada no tema light nem em outros tipos de input', () => {
    const darkBlock = extractBlockBody(cssSource, "[data-theme='dark'] {");
    const dateTimeIconRule = extractRuleBySelectorAnchor(
      darkBlock.body,
      "input[type='date'].input-field"
    );

    // Escopa CADA seletor da lista sob [data-theme='dark'] individualmente
    // (equivalente ao que o nesting do Tailwind produziria ao compilar:
    // `[data-theme='dark'] A, [data-theme='dark'] B`, nunca
    // `[data-theme='dark'] A, B` — a segunda forma vazaria B para fora do
    // escopo do tema).
    const scopedSelectors = dateTimeIconRule.selectorText
      .split(',')
      .map(part => `[data-theme='dark'] ${part.trim()}`)
      .join(', ');

    const style = document.createElement('style');
    style.textContent = `${scopedSelectors} { ${dateTimeIconRule.body.trim()} }`;
    document.head.appendChild(style);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'input-field';
    document.body.appendChild(dateInput);

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'input-field';
    document.body.appendChild(timeInput);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'input-field';
    document.body.appendChild(textInput);

    document.documentElement.setAttribute('data-theme', 'light');
    expect(getComputedStyle(dateInput).colorScheme).toBe('');
    expect(getComputedStyle(timeInput).colorScheme).toBe('');

    document.documentElement.setAttribute('data-theme', 'dark');
    expect(getComputedStyle(dateInput).colorScheme).toBe('dark');
    expect(getComputedStyle(timeInput).colorScheme).toBe('dark');
    expect(getComputedStyle(textInput).colorScheme).toBe('');

    document.head.removeChild(style);
    document.body.removeChild(dateInput);
    document.body.removeChild(timeInput);
    document.body.removeChild(textInput);
    document.documentElement.removeAttribute('data-theme');
  });
});
