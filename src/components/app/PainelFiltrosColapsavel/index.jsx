'use client';

import { useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
// Predicado da convenção de formato da `storageKey` (string vs.
// `{ mapKey, itemId }`) é de COMP-002-003 — endereço canônico em
// `filterStorage.js`, dono de `loadPanelStateMap`/`savePanelStateMap`. Nunca
// duplicar aqui.
import { isConfigDeMapa } from '@/utils/filterStorage';

const RECOLHIDO = 'recolhido';

/**
 * Serializa um valor para embutir com segurança dentro do texto de um
 * `<script>` inline. `JSON.stringify` sozinho não basta: o parser HTML busca
 * o literal `</script` em texto bruto, inclusive **dentro** de uma string JS
 * entre aspas — um valor contendo essa sequência fecharia a tag prematuramente
 * e o restante viraria markup solto. Por isso `<` vira a sequência de escape
 * `\u003c` (dois caracteres, `\` seguido de `u003c` — nunca o glifo
 * `<` de volta) depois de serializar, o que nunca muda o valor decodificado
 * pelo `JSON.parse`.
 */
function serializarParaScript(valor) {
  return JSON.stringify(valor).replace(/</g, '\\u003c');
}

/**
 * Gera o texto do `<script>` inline anti-flash (DEC-002-001): lido e
 * executado pelo navegador durante o parse do HTML, antes da hidratação.
 * Ele **compara** a preferência lida contra o literal `'recolhido'` e, se
 * bater, aplica o atributo `data-panel-state` com um **literal** — nunca
 * escreve em HTML/atributo o valor lido do `localStorage` (que é editável
 * pelo usuário via DevTools). Gerado só a partir da `storageKey`/
 * `{mapKey,itemId}` recebida — nunca de `formData`.
 *
 * Escreve no **ancestral já aberto** (`document.currentScript.parentElement`
 * — o root do painel, pai direto do próprio `<script>`), nunca num irmão
 * posterior: durante o parse do HTML, o `<div id={contentId}>` (que vem
 * depois do script na árvore) ainda não existe quando o script executa —
 * `getElementById` devolveria sempre `null`. O root, por ser o nó que já
 * abriu a tag antes do `<script>` filho ser parseado, sempre existe.
 */
export function buildAntiFlashScript({ storageKey }) {
  if (isConfigDeMapa(storageKey)) {
    const mapKeyJs = serializarParaScript(storageKey.mapKey);
    const itemIdJs = serializarParaScript(storageKey.itemId);
    return (
      '(function(){' +
      'try{' +
      `var mapa=JSON.parse(localStorage.getItem(${mapKeyJs})||'null');` +
      `var pref=mapa&&Object.prototype.hasOwnProperty.call(mapa,${itemIdJs})?mapa[${itemIdJs}]:null;` +
      "if(pref==='recolhido'){" +
      'var raiz=document.currentScript.parentElement;' +
      "if(raiz){raiz.setAttribute('data-panel-state','recolhido');}" +
      '}' +
      '}catch(e){}' +
      '})();'
    );
  }

  const storageKeyJs = serializarParaScript(storageKey);
  return (
    '(function(){' +
    'try{' +
    `var pref=JSON.parse(localStorage.getItem(${storageKeyJs})||'null');` +
    "if(pref==='recolhido'){" +
    'var raiz=document.currentScript.parentElement;' +
    "if(raiz){raiz.setAttribute('data-panel-state','recolhido');}" +
    '}' +
    '}catch(e){}' +
    '})();'
  );
}

/**
 * Painel de apresentação controlado (isOpen/onToggle via props) que renderiza
 * cabeçalho, controle acessível de recolher/expandir e a região de conteúdo.
 * Dono do id da instância (useId()) e, por isso, também do script anti-flash
 * de DEC-002-001. Não conhece formData de nenhum domínio (A-001-002/A-006).
 */
export const PainelFiltrosColapsavel = ({
  titulo,
  isOpen,
  onToggle,
  appliedCount = 0,
  storageKey,
  children,
}) => {
  const idBase = useId();
  const contentId = `${idBase}-conteudo`;
  const buttonId = `${idBase}-controle`;

  const mostrarContagem = !isOpen && Number(appliedCount) > 0;

  // Texto visível do controle é o verbo da ação (+ contagem quando
  // recolhido e há filtro aplicado). O `<h3>{titulo}</h3>` ao lado já
  // identifica o painel — não repetir `titulo` aqui evita duplicar o mesmo
  // texto na tela.
  const rotuloVisivel = isOpen ? 'Recolher' : 'Expandir';

  // Rótulo textual acessível: "1 filtro aplicado" / "N filtros aplicados"
  // (WCAG 2.5.3 — o aria-label precisa CONTER o texto visível do botão,
  // nunca só o número).
  const rotuloContagem =
    Number(appliedCount) === 1
      ? '1 filtro aplicado'
      : `${appliedCount} filtros aplicados`;

  let ariaLabel = `Expandir ${titulo}`;
  if (isOpen) {
    ariaLabel = `Recolher ${titulo}`;
  } else if (mostrarContagem) {
    ariaLabel = `Expandir (${appliedCount}), ${rotuloContagem}`;
  }

  return (
    <div
      data-testid="painel-filtros-colapsavel"
      data-panel-state={isOpen ? undefined : RECOLHIDO}
      className="group"
    >
      <script
        data-testid="painel-filtros-script"
        dangerouslySetInnerHTML={{
          __html: buildAntiFlashScript({ storageKey }),
        }}
      />
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3
          className="text-xl font-semibold text-main"
          data-testid="painel-filtros-titulo"
        >
          {titulo}
        </h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={contentId}
          aria-label={ariaLabel}
          onClick={onToggle}
          className="btn btn-secondary flex items-center gap-2"
          data-testid="painel-filtros-controle"
        >
          {/*
            O verbo visível depende de `isOpen`, e o servidor sempre
            renderiza aberto (sem localStorage — A-001-001), enquanto o
            cliente pode hidratar já recolhido (preferência real lida por
            useCollapsiblePanelState). Diferente do atributo data-panel-state
            (que o script anti-flash já escreve fora do controle do React e
            cuja divergência o React reconcilia silenciosamente), texto de
            nó filho divergente entre servidor e cliente é fatal na
            hidratação sem suppressHydrationWarning — o React descarta a
            subárvore e relança. A flag restringe React a não comparar o
            texto deste nó específico na hidratação; a reconciliação normal
            seguinte (clique) já converge para o valor real de `isOpen`.
          */}
          <span data-testid="painel-filtros-rotulo" suppressHydrationWarning>
            {rotuloVisivel}
            {mostrarContagem && (
              <span data-testid="painel-filtros-contagem">
                {` (${appliedCount})`}
              </span>
            )}
          </span>
          {isOpen ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        id={contentId}
        data-testid="painel-filtros-conteudo"
        className="group-data-[panel-state=recolhido]:hidden"
      >
        {children}
      </div>
    </div>
  );
};
