'use client';

import { useEffect, useId, useState } from 'react';
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

  // Two-pass render (DEC-002-001, emenda 2026-09-17; lição
  // `estado-de-localstorage-tem-uma-fonte-so-antes-da-hidratacao`, segundo
  // eixo): `isOpen` chega de `useCollapsiblePanelState`, cujo `useState` lê o
  // `localStorage` sincronamente já na primeira renderização do cliente — a
  // MESMA passada que hidrata. O servidor, sem acesso a `localStorage`,
  // sempre renderiza o default `aberto` (A-001-001). ARIA/rótulo não têm
  // variante de CSS (ao contrário do chevron e da contagem, abaixo). A
  // primeira ideia — afirmar o default do servidor (`hidratado ? isOpen :
  // true`) — resolvia a DIVERGÊNCIA de hidratação, mas não a MENTIRA:
  // `aria-expanded="true"` num painel que o CSS já fechou manda o leitor de
  // tela para uma região em `display:none`. Por isso `hidratado` governa
  // AUSÊNCIA, não substituição: enquanto `false`, `aria-expanded` fica
  // omitido (`undefined`) e o `aria-label` usa o rótulo neutro (`titulo`),
  // sem afirmar nenhum dos dois estados. Ausência não diverge do servidor
  // (que também nunca escreve o atributo nesta janela) e não mente. Depois
  // de montado, os dois passam a refletir o valor real, sem flash visual — o
  // visual já deriva do atributo `data-panel-state`, não deste estado.
  const [hidratado, setHidratado] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidratado(true);
  }, []);
  const ariaExpanded = hidratado ? isOpen : undefined;

  const existeContagem = Number(appliedCount) > 0;
  const mostrarContagemNoRotuloAria = hidratado && !isOpen && existeContagem;

  // Rótulo textual acessível: "1 filtro aplicado" / "N filtros aplicados"
  // (WCAG 2.5.3 — o aria-label precisa CONTER o texto visível do botão,
  // "${titulo} (${appliedCount})", nunca só o número).
  const rotuloContagem =
    Number(appliedCount) === 1
      ? '1 filtro aplicado'
      : `${appliedCount} filtros aplicados`;

  let ariaLabel = titulo;
  if (hidratado) {
    ariaLabel = `Expandir ${titulo}`;
    if (isOpen) {
      ariaLabel = `Recolher ${titulo}`;
    } else if (mostrarContagemNoRotuloAria) {
      ariaLabel = `Expandir ${titulo} (${appliedCount}), ${rotuloContagem}`;
    }
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
          aria-expanded={ariaExpanded}
          aria-controls={contentId}
          aria-label={ariaLabel}
          onClick={onToggle}
          className="btn btn-secondary flex items-center gap-2"
          data-testid="painel-filtros-controle"
        >
          <span data-testid="painel-filtros-rotulo">
            {titulo}
            {existeContagem && (
              <span
                data-testid="painel-filtros-contagem"
                className="hidden group-data-[panel-state=recolhido]:inline"
              >
                {` (${appliedCount})`}
              </span>
            )}
          </span>
          {/* Visual derivado do atributo, por CSS (DEC-002-001): as duas
              variantes existem sempre no markup — servidor e cliente ficam
              estruturalmente idênticos, não há o que reconciliar na
              hidratação — e a visibilidade alterna pela mesma variante de
              grupo que já oculta o conteúdo (`data-panel-state` na raiz). */}
          <ChevronUp
            size={16}
            aria-hidden="true"
            data-testid="painel-filtros-chevron-recolher"
            className="group-data-[panel-state=recolhido]:hidden"
          />
          <ChevronDown
            size={16}
            aria-hidden="true"
            data-testid="painel-filtros-chevron-expandir"
            className="hidden group-data-[panel-state=recolhido]:block"
          />
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
