/** @jest-environment node */
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// (DEC-006-009 · demonstracao) Sentinela adaptada do precedente do backend
// (`__tests__/integrations/sentinelaDemoMode.test.js`, DEC-002-006 de
// PLAN-002): enumera os fatos reais (aqui, ocorrências de "bls" em
// src/+public/) e classifica contra uma allowlist fechada — qualquer
// ocorrência fora dela reprova nomeando `arquivo:linha`, nunca passa por
// ausência de match.
const DIRETORIOS_VARRIDOS = ['src', 'public'];
const DIRETORIOS_IGNORADOS = new Set(['node_modules', '.next', 'coverage']);

// Binários conhecidos (lista abaixo) são ignorados por extensão, nunca por
// conteúdo: bytes ASCII soltos de um PNG/ICO podem formar "bls" por acaso.
// Todo arquivo fora desta lista é lido como texto.
const EXTENSOES_BINARIAS = new Set([
  '.png',
  '.ico',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
]);

const ARQUIVOS_PERMITIDOS_INTEIROS = new Set([
  'src/utils/marcas.mjs',
  'src/proxy.js',
  'public/manifest.json',
]);

const REGEX_ARQUIVO_DE_TESTE = /\.test\.[jt]sx?$/;

const CHAVES_INTERNAS_PERMITIDAS = new Set([
  'bls-saida-pendente',
  'bls-sessao',
  'bls-sessao-evento',
  'bls-diario-static-',
]);

function listarArquivos(diretorio) {
  const entradas = readdirSync(diretorio, { withFileTypes: true });
  const arquivos = [];
  for (const entrada of entradas) {
    if (entrada.isDirectory()) {
      if (DIRETORIOS_IGNORADOS.has(entrada.name)) continue;
      arquivos.push(...listarArquivos(path.join(diretorio, entrada.name)));
    } else if (entrada.isFile()) {
      arquivos.push(path.join(diretorio, entrada.name));
    }
  }
  return arquivos;
}

// Estende o match de `/bls/i` ao maior trecho contíguo de `[\w-]` ao redor —
// "bls-sessao-x" nunca casa a chave "bls-sessao" (nunca prefixo).
function trechoContiguo(linha, indiceInicio, indiceFimExclusivo) {
  const ehTokenChar = c => /[\w-]/.test(c);
  let inicio = indiceInicio;
  while (inicio > 0 && ehTokenChar(linha[inicio - 1])) inicio -= 1;
  let fim = indiceFimExclusivo;
  while (fim < linha.length && ehTokenChar(linha[fim])) fim += 1;
  return linha.slice(inicio, fim);
}

/**
 * Varre `raiz`/src e `raiz`/public por `/bls/i` e devolve as ocorrências que
 * não se encaixam na allowlist fechada (arquivo inteiro, nome de teste, ou
 * chave interna exata). `raiz` nunca é hardcoded — quem chama decide a base
 * (repositório real ou um diretório isolado de teste).
 *
 * @param {string} raiz
 * @returns {{ arquivo: string, linha: number, trecho: string }[]}
 */
export function encontrarOcorrenciasForaDaAllowlist(raiz) {
  const violacoes = [];
  for (const nomeDiretorio of DIRETORIOS_VARRIDOS) {
    const diretorio = path.join(raiz, nomeDiretorio);
    let existe = true;
    try {
      statSync(diretorio);
    } catch {
      existe = false;
    }
    if (!existe) continue;

    for (const arquivoAbsoluto of listarArquivos(diretorio)) {
      const relativo = path
        .relative(raiz, arquivoAbsoluto)
        .split(path.sep)
        .join('/');
      if (ARQUIVOS_PERMITIDOS_INTEIROS.has(relativo)) continue;
      if (REGEX_ARQUIVO_DE_TESTE.test(path.basename(arquivoAbsoluto))) continue;
      if (EXTENSOES_BINARIAS.has(path.extname(arquivoAbsoluto).toLowerCase()))
        continue;

      const conteudo = readFileSync(arquivoAbsoluto, 'utf8');
      const linhas = conteudo.split('\n');
      linhas.forEach((linha, indice) => {
        const regex = /bls/gi;
        let resultado;
        while ((resultado = regex.exec(linha)) !== null) {
          const trecho = trechoContiguo(
            linha,
            resultado.index,
            resultado.index + resultado[0].length
          );
          if (!CHAVES_INTERNAS_PERMITIDAS.has(trecho.toLowerCase())) {
            violacoes.push({ arquivo: relativo, linha: indice + 1, trecho });
          }
        }
      });
    }
  }
  return violacoes;
}

describe('encontrarOcorrenciasForaDaAllowlist — isolada (controles)', () => {
  let raizTmp;

  beforeEach(() => {
    raizTmp = mkdtempSync(path.join(tmpdir(), 'sentinela-marca-'));
  });

  afterEach(() => {
    rmSync(raizTmp, { recursive: true, force: true });
  });

  it('controle positivo: literal fora da allowlist em src/foo.js é reportado com arquivo:linha', () => {
    mkdirSync(path.join(raizTmp, 'src'), { recursive: true });
    writeFileSync(
      path.join(raizTmp, 'src', 'foo.js'),
      "export const NOME = 'BLS Idiomas';\n"
    );

    const violacoes = encontrarOcorrenciasForaDaAllowlist(raizTmp);

    expect(violacoes).toEqual([
      { arquivo: 'src/foo.js', linha: 1, trecho: 'BLS' },
    ]);
  });

  it('controle negativo: src/utils/marcas.mjs (copiado) não é reportado', () => {
    mkdirSync(path.join(raizTmp, 'src', 'utils'), { recursive: true });
    cpSync(
      path.join(process.cwd(), 'src', 'utils', 'marcas.mjs'),
      path.join(raizTmp, 'src', 'utils', 'marcas.mjs')
    );

    expect(encontrarOcorrenciasForaDaAllowlist(raizTmp)).toEqual([]);
  });

  it('não casa chave interna por prefixo: "bls-sessao-x" fora da allowlist nunca é tratado como "bls-sessao"', () => {
    mkdirSync(path.join(raizTmp, 'src'), { recursive: true });
    writeFileSync(
      path.join(raizTmp, 'src', 'foo.js'),
      "const CHAVE = 'bls-sessao-x';\n"
    );

    const violacoes = encontrarOcorrenciasForaDaAllowlist(raizTmp);

    expect(violacoes).toEqual([
      { arquivo: 'src/foo.js', linha: 1, trecho: 'bls-sessao-x' },
    ]);
  });
});

describe('encontrarOcorrenciasForaDaAllowlist — repositório real (AC-005-015)', () => {
  it('a varredura sobre src/+public/ não reporta nenhuma ocorrência fora da allowlist', () => {
    const violacoes = encontrarOcorrenciasForaDaAllowlist(process.cwd());

    expect(violacoes).toEqual([]);
  });

  it('régua mecânica: Header/index.jsx e Footer/index.jsx (TASK-006-003) não contêm mais o literal BLS/bls fora de comentário', () => {
    const arquivos = [
      path.join(
        process.cwd(),
        'src',
        'components',
        'ui',
        'Header',
        'index.jsx'
      ),
      path.join(
        process.cwd(),
        'src',
        'components',
        'ui',
        'Footer',
        'index.jsx'
      ),
    ];
    const linhasComBls = arquivos.flatMap(arquivo =>
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .filter(linha => /bls/i.test(linha))
        .filter(linha => !/^\s*(\/\/|\*|\/\*)/.test(linha))
    );

    expect(linhasComBls).toEqual([]);
  });
});
