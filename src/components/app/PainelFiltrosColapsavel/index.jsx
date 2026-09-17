'use client';

import { useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const RECOLHIDO = 'recolhido';

function isConfigDeMapa(storageKey) {
  return (
    storageKey !== null &&
    typeof storageKey === 'object' &&
    Object.hasOwn(storageKey, 'mapKey')
  );
}

/**
 * Serializa um valor para embutir com segurança dentro do texto de um
 * `<script>` inline. `JSON.stringify` sozinho não basta: o parser HTML busca
 * o literal `</script` em texto bruto, inclusive **dentro** de uma string JS
 * entre aspas — um valor contendo essa sequência fecharia a tag prematuramente
 * e o restante viraria markup solto. Por isso `<` vira `<` depois de
 * serializar, o que nunca muda o valor decodificado pelo `JSON.parse`.
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
 * pelo usuário via DevTools). Gerado só a partir de `contentId` e da
 * `storageKey`/`{mapKey,itemId}` recebida — nunca de `formData`.
 */
export function buildAntiFlashScript({ contentId, storageKey }) {
  const contentIdJs = serializarParaScript(contentId);

  if (isConfigDeMapa(storageKey)) {
    const mapKeyJs = serializarParaScript(storageKey.mapKey);
    const itemIdJs = serializarParaScript(storageKey.itemId);
    return (
      '(function(){' +
      'try{' +
      `var mapa=JSON.parse(localStorage.getItem(${mapKeyJs})||'null');` +
      `var pref=mapa&&Object.prototype.hasOwnProperty.call(mapa,${itemIdJs})?mapa[${itemIdJs}]:null;` +
      "if(pref==='recolhido'){" +
      `var el=document.getElementById(${contentIdJs});` +
      "if(el){el.setAttribute('data-panel-state','recolhido');}" +
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
    `var el=document.getElementById(${contentIdJs});` +
    "if(el){el.setAttribute('data-panel-state','recolhido');}" +
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

  const ariaLabel = isOpen
    ? `Recolher ${titulo}`
    : mostrarContagem
      ? `Expandir ${titulo}, ${appliedCount} aplicados`
      : `Expandir ${titulo}`;

  return (
    <div data-testid="painel-filtros-colapsavel">
      <script
        data-testid="painel-filtros-script"
        dangerouslySetInnerHTML={{
          __html: buildAntiFlashScript({ contentId, storageKey }),
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <h3 className="page-title" data-testid="painel-filtros-titulo">
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
          {mostrarContagem && (
            <span data-testid="painel-filtros-contagem">{appliedCount}</span>
          )}
          {isOpen ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        id={contentId}
        data-panel-state={isOpen ? undefined : RECOLHIDO}
        data-testid="painel-filtros-conteudo"
        className="data-[panel-state=recolhido]:hidden"
      >
        {children}
      </div>
    </div>
  );
};
