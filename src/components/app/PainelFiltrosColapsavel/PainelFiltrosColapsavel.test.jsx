import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { PainelFiltrosColapsavel, buildAntiFlashScript } from './index';
import { PainelFiltrosColapsavel as PainelDoBarrel } from '@/components/app';
import { useCollapsiblePanelState } from '@/hooks/useCollapsiblePanelState';

const MARCADOR_FIM_SCRIPT = '</script>';

/**
 * Monta o markup real do componente e o executa com o parser HTML real do
 * jsdom (`runScripts: 'dangerously'`), truncado exatamente no fechamento do
 * `<script>` anti-flash — nada do que viria depois dele (o
 * `<div id={contentId}>`) chega a ser parseado. Prova, sem ambiguidade, que
 * o mecanismo não depende de um nó que só existe depois no documento: se
 * dependesse, este teste não teria como encontrá-lo.
 *
 * `seedLocalStorage` roda em `beforeParse` — antes do HTML ser processado —
 * porque o `localStorage` de cada instância do `JSDOM` é isolado da suíte e
 * o script anti-flash executa durante a própria construção do documento.
 *
 * Uma sentinela é anexada logo após o script anti-flash: se ele quebrasse o
 * parser (por exemplo, um breakout de tag), a sentinela nunca executaria.
 */
function montarDocumentoTruncadoNoScript({
  isOpen = true,
  storageKey,
  seedLocalStorage,
}) {
  const markupCompleto = renderToStaticMarkup(
    <PainelFiltrosColapsavel
      titulo="Filtros"
      isOpen={isOpen}
      onToggle={() => {}}
      storageKey={storageKey}
    >
      <div data-testid="campo-filtro">conteudo</div>
    </PainelFiltrosColapsavel>
  );

  const fimDoScript =
    markupCompleto.indexOf(MARCADOR_FIM_SCRIPT) + MARCADOR_FIM_SCRIPT.length;
  const ateOFechamentoDoScript = markupCompleto.slice(0, fimDoScript);

  const html =
    '<!DOCTYPE html><html><body>' +
    ateOFechamentoDoScript +
    '<script data-testid="sentinela">window.__sentinelaExecutou = true;</script>';

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://painel-filtros.teste/',
    beforeParse(janela) {
      if (seedLocalStorage) {
        seedLocalStorage(janela.localStorage);
      }
    },
  });

  return { document: dom.window.document, window: dom.window };
}

/**
 * Composição mínima com o hook REAL (`useCollapsiblePanelState`) — a mesma
 * cablagem que `ListPage`/painel inicial usam (COMP-002-005/006). Necessária
 * para reproduzir o defeito da TASK-002-008: `PainelFiltrosColapsavel` é
 * controlado (não tem `isOpen` próprio) e o defeito nasce especificamente da
 * inicialização síncrona do hook — que já lê `localStorage` na própria
 * primeira renderização cliente — divergindo do servidor, que nunca lê.
 */
function PainelComHookReal({ appliedCount = 0, storageKey }) {
  const { isOpen, toggle } = useCollapsiblePanelState(storageKey);
  return (
    <PainelFiltrosColapsavel
      titulo="Filtros"
      isOpen={isOpen}
      onToggle={toggle}
      appliedCount={appliedCount}
      storageKey={storageKey}
    >
      <div data-testid="campo-filtro-real">conteudo</div>
    </PainelFiltrosColapsavel>
  );
}

/**
 * Monta o par servidor+navegador reais para a prova de hidratação da
 * TASK-002-008 (mesmo padrão de `page.test.jsx`, "INVARIANTE DE CABLAGEM"):
 * `renderToString` roda no realm AMBIENTE do Jest (onde o hook também vai
 * rodar durante a hidratação abaixo) sem nenhuma preferência salva — simula
 * o servidor, que nunca tem acesso a `localStorage` (A-001-001: painel
 * sempre aberto lá). A preferência-alvo é então semeada em DOIS realms:
 * o isolado (`JSDOM` novo, para o script anti-flash, que roda durante o
 * parse REAL do HTML) e o ambiente (para o hook, que lê `localStorage`
 * global durante a própria hidratação, no realm do Jest).
 */
function montarParaHidratacaoReal({
  preferenciaRecolhida,
  appliedCount,
  storageKey,
}) {
  localStorage.clear();
  const markup = renderToString(
    <PainelComHookReal appliedCount={appliedCount} storageKey={storageKey} />
  );
  const html = `<!DOCTYPE html><html><body><div id="root">${markup}</div></body></html>`;

  if (preferenciaRecolhida) {
    localStorage.setItem(storageKey, JSON.stringify('recolhido'));
  }

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://painel-filtros-task-008.teste/',
    beforeParse(janela) {
      if (preferenciaRecolhida) {
        janela.localStorage.setItem(storageKey, JSON.stringify('recolhido'));
      }
    },
  });

  return { dom, container: dom.window.document.getElementById('root') };
}

describe('PainelFiltrosColapsavel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('AC-001-002/AC-001-015: alternância por teclado', () => {
    it('gesto Enter: foco + Enter dispara onToggle e aria-expanded reflete o novo estado após rerender', async () => {
      const user = userEvent.setup();
      const handleToggle = jest.fn();
      const filhos = <div data-testid="filho-enter">valor</div>;

      const { rerender } = render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={true}
          onToggle={handleToggle}
          appliedCount={3}
          storageKey="panel_teste_enter"
        >
          {filhos}
        </PainelFiltrosColapsavel>
      );

      const botao = screen.getByRole('button', { name: /recolher filtros/i });
      await user.tab();
      expect(botao).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(handleToggle).toHaveBeenCalledTimes(1);

      rerender(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={false}
          onToggle={handleToggle}
          appliedCount={3}
          storageKey="panel_teste_enter"
        >
          {filhos}
        </PainelFiltrosColapsavel>
      );

      expect(
        screen.getByRole('button', { name: /expandir filtros/i })
      ).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByTestId('filho-enter')).toHaveTextContent('valor');
      expect(screen.getByTestId('painel-filtros-contagem')).toHaveTextContent(
        '3'
      );
    });

    it('gesto Espaço: foco + Espaço dispara onToggle', async () => {
      const user = userEvent.setup();
      const handleToggle = jest.fn();

      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={true}
          onToggle={handleToggle}
          storageKey="panel_teste_espaco"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      await user.tab();
      await user.keyboard(' ');

      expect(handleToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC-001-005/AC-001-018: indicação de contagem é o único alvo que expande', () => {
    it('com isOpen=false e appliedCount=2, existe um único botão com "2" no nome acessível, e clicar nele dispara onToggle', async () => {
      const user = userEvent.setup();
      const handleToggle = jest.fn();

      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={false}
          onToggle={handleToggle}
          appliedCount={2}
          storageKey="panel_teste_contagem"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      const botoes = screen.getAllByRole('button', { name: /2/ });
      expect(botoes).toHaveLength(1);

      await user.click(botoes[0]);
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC-001-012/AC-001-021: montagem direta já recolhida e já contada', () => {
    it('isOpen=false e appliedCount=2 como props iniciais: conteúdo já oculto e contagem já presente, sem interação prévia', () => {
      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={false}
          onToggle={() => {}}
          appliedCount={2}
          storageKey="panel_teste_inicial"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      // data-panel-state fica na raiz (`group`), não mais no conteúdo — é o
      // ancestral que o script anti-flash marca (achado A).
      expect(screen.getByTestId('painel-filtros-colapsavel')).toHaveAttribute(
        'data-panel-state',
        'recolhido'
      );
      expect(screen.getByTestId('painel-filtros-conteudo')).not.toHaveAttribute(
        'data-panel-state'
      );
      expect(screen.getByTestId('painel-filtros-contagem')).toHaveTextContent(
        '2'
      );
    });
  });

  describe('AC-001-013/AC-001-022: appliedCount=0 não exibe indicação', () => {
    it('com appliedCount=0 e isOpen=false, nenhuma indicação numérica é exibida', () => {
      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={false}
          onToggle={() => {}}
          appliedCount={0}
          storageKey="panel_teste_zero"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      expect(
        screen.queryByTestId('painel-filtros-contagem')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('AC-001-013: singular do nome acessível com appliedCount=1', () => {
    it('com appliedCount=1 e isOpen=false, o alvo do botão lê "Filtros (1)" e o aria-label usa o singular "1 filtro aplicado"', () => {
      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={false}
          onToggle={() => {}}
          appliedCount={1}
          storageKey="panel_teste_singular"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      expect(screen.getByTestId('painel-filtros-rotulo')).toHaveTextContent(
        'Filtros (1)'
      );
      expect(
        screen.getByRole('button', {
          name: 'Expandir Filtros (1), 1 filtro aplicado',
        })
      ).toBeInTheDocument();
    });
  });

  describe('AC-001-007/AC-001-019: controle sempre visível junto ao título, sem hover', () => {
    it.each([true, false])(
      'com isOpen=%s, o controle é encontrado por role, sem simular hover',
      isOpen => {
        render(
          <PainelFiltrosColapsavel
            titulo="Filtros"
            isOpen={isOpen}
            onToggle={() => {}}
            storageKey="panel_teste_hover"
          >
            <div>conteudo</div>
          </PainelFiltrosColapsavel>
        );

        expect(screen.getByTestId('painel-filtros-titulo')).toHaveTextContent(
          'Filtros'
        );
        expect(
          screen.getByRole('button', { name: /filtros/i })
        ).toBeInTheDocument();
      }
    );
  });

  describe('AC-001-024/AC-001-027: independência entre instâncias e preservação de children', () => {
    it('duas instâncias lado a lado: alternar uma não afeta a outra, e o nó dos children da colapsada permanece montado', async () => {
      const user = userEvent.setup();
      const handleToggleA = jest.fn();
      const handleToggleB = jest.fn();

      const { rerender, container } = render(
        <>
          <PainelFiltrosColapsavel
            titulo="Card A"
            isOpen={true}
            onToggle={handleToggleA}
            storageKey="panel_teste_card_a"
          >
            <input data-testid="input-card-a" defaultValue="valor-a" />
          </PainelFiltrosColapsavel>
          <PainelFiltrosColapsavel
            titulo="Card B"
            isOpen={true}
            onToggle={handleToggleB}
            storageKey="panel_teste_card_b"
          >
            <input data-testid="input-card-b" defaultValue="valor-b" />
          </PainelFiltrosColapsavel>
        </>
      );

      const botaoA = screen.getByRole('button', { name: /recolher card a/i });
      await user.click(botaoA);

      expect(handleToggleA).toHaveBeenCalledTimes(1);
      expect(handleToggleB).not.toHaveBeenCalled();

      // simula a resposta do consumidor: só o card A recolhe
      rerender(
        <>
          <PainelFiltrosColapsavel
            titulo="Card A"
            isOpen={false}
            onToggle={handleToggleA}
            storageKey="panel_teste_card_a"
          >
            <input data-testid="input-card-a" defaultValue="valor-a" />
          </PainelFiltrosColapsavel>
          <PainelFiltrosColapsavel
            titulo="Card B"
            isOpen={true}
            onToggle={handleToggleB}
            storageKey="panel_teste_card_b"
          >
            <input data-testid="input-card-b" defaultValue="valor-b" />
          </PainelFiltrosColapsavel>
        </>
      );

      expect(
        screen.getByRole('button', { name: /expandir card a/i })
      ).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.getByRole('button', { name: /recolher card b/i })
      ).toHaveAttribute('aria-expanded', 'true');

      // o nó do input do card colapsado continua no DOM (ocultação por
      // atributo/CSS, nunca por deixar de renderizar) e preserva o valor.
      const inputA = container.querySelector('[data-testid="input-card-a"]');
      expect(inputA).not.toBeNull();
      expect(inputA.value).toBe('valor-a');

      // data-panel-state fica na raiz do painel (`group`), não no conteúdo.
      // `closest` em vez de contar hops de `parentElement`: o botão agora
      // vive dentro do heading (BRIEF-002, fusão título+seta), então a
      // distância até a raiz não é mais fixa em dois níveis.
      const raizA = screen
        .getByRole('button', { name: /expandir card a/i })
        .closest('[data-testid="painel-filtros-colapsavel"]');
      expect(raizA).toHaveAttribute('data-testid', 'painel-filtros-colapsavel');
      expect(raizA).toHaveAttribute('data-panel-state', 'recolhido');
      expect(
        within(raizA).getByTestId('painel-filtros-conteudo')
      ).not.toHaveAttribute('data-panel-state');
    });
  });

  describe('NFR-001-001: alternância síncrona, sem rede', () => {
    it('onToggle não chama window.fetch, e aria-expanded muda na mesma passada síncrona do rerender', () => {
      // jest-environment-jsdom não define `window.fetch` por padrão — a
      // propriedade precisa existir antes de instalar o duplo.
      const fetchOriginal = window.fetch;
      window.fetch = jest.fn(() => {
        throw new Error('não deveria ser chamado');
      });
      const fetchSpy = window.fetch;
      const handleToggle = jest.fn();

      const { rerender } = render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={true}
          onToggle={handleToggle}
          storageKey="panel_teste_nfr1"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      screen.getByRole('button', { name: /recolher filtros/i }).click();
      expect(handleToggle).toHaveBeenCalledTimes(1);

      rerender(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={false}
          onToggle={handleToggle}
          storageKey="panel_teste_nfr1"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      // síncrono: sem await/waitFor entre o rerender e a asserção
      expect(
        screen.getByRole('button', { name: /expandir filtros/i })
      ).toHaveAttribute('aria-expanded', 'false');

      expect(fetchSpy).not.toHaveBeenCalled();
      window.fetch = fetchOriginal;
    });
  });

  describe('Script anti-flash (DEC-002-001) — geração segura', () => {
    it('nunca interpola a storageKey crua: serializa via JSON.stringify e escapa "<" para não fechar a tag', () => {
      const ataque = '</script><script>alert(1)</script>';
      const texto = buildAntiFlashScript({
        contentId: 'id-qualquer',
        storageKey: ataque,
      });

      expect(texto).not.toContain(ataque);
      expect(texto).not.toMatch(/<\/script/i);
      expect(texto).toContain(JSON.stringify(ataque).replace(/</g, '\\u003c'));
    });

    it('gera a partir só de contentId/storageKey — variante de chave-mapa também nunca interpola cru', () => {
      const ataque = '</script><script>alert(2)</script>';
      const texto = buildAntiFlashScript({
        contentId: 'id-qualquer',
        storageKey: { mapKey: 'filters_relatorios_panel', itemId: ataque },
      });

      expect(texto).not.toContain(ataque);
      expect(texto).not.toMatch(/<\/script/i);
    });
  });

  describe('Script anti-flash (DEC-002-001) — execução contra DOM real, ordem de parse', () => {
    it('com a chave gravada como "recolhido", marca a raiz (ancestral já aberto) com data-panel-state="recolhido", mesmo com o documento truncado logo após o script', () => {
      const { document: doc, window: janela } = montarDocumentoTruncadoNoScript(
        {
          isOpen: true,
          storageKey: 'panel_teste_antiflash_ok',
          seedLocalStorage: storage =>
            storage.setItem(
              'panel_teste_antiflash_ok',
              JSON.stringify('recolhido')
            ),
        }
      );

      const raiz = doc.querySelector(
        '[data-testid="painel-filtros-colapsavel"]'
      );
      expect(raiz.getAttribute('data-panel-state')).toBe('recolhido');
      // sentinela: o parser seguiu vivo depois do script anti-flash
      expect(janela.__sentinelaExecutou).toBe(true);
      // documento propositalmente truncado: o conteúdo real do painel
      // (que viria depois do script, na árvore) nunca chegou a ser
      // parseado neste teste — prova de que o mecanismo não depende dele.
      expect(
        doc.querySelector('[data-testid="painel-filtros-conteudo"]')
      ).toBeNull();
    });

    it('cenário irmão: sem a chave gravada, o atributo não é aplicado na raiz', () => {
      const { document: doc, window: janela } = montarDocumentoTruncadoNoScript(
        { isOpen: true, storageKey: 'panel_teste_antiflash_ausente' }
      );

      const raiz = doc.querySelector(
        '[data-testid="painel-filtros-colapsavel"]'
      );
      expect(raiz.getAttribute('data-panel-state')).toBeNull();
      expect(janela.__sentinelaExecutou).toBe(true);
    });

    it('variante de chave-mapa: aplica o atributo na raiz só quando o item do mapa é "recolhido"', () => {
      const { document: doc, window: janela } = montarDocumentoTruncadoNoScript(
        {
          isOpen: true,
          storageKey: {
            mapKey: 'filters_relatorios_panel_teste',
            itemId: 'card-1',
          },
          seedLocalStorage: storage =>
            storage.setItem(
              'filters_relatorios_panel_teste',
              JSON.stringify({ 'card-1': 'recolhido', 'card-2': 'aberto' })
            ),
        }
      );

      const raiz = doc.querySelector(
        '[data-testid="painel-filtros-colapsavel"]'
      );
      expect(raiz.getAttribute('data-panel-state')).toBe('recolhido');
      expect(janela.__sentinelaExecutou).toBe(true);
    });

    it('valor lido do localStorage nunca é interpolado: string de ataque não insere nó nem aplica o atributo, e o parser segue vivo', () => {
      const { document: doc, window: janela } = montarDocumentoTruncadoNoScript(
        {
          isOpen: true,
          storageKey: 'panel_teste_valor_ataque',
          seedLocalStorage: storage =>
            storage.setItem(
              'panel_teste_valor_ataque',
              JSON.stringify('recolhido"><img src=x onerror=alert(1)>')
            ),
        }
      );

      expect(doc.querySelectorAll('img').length).toBe(0);
      const raiz = doc.querySelector(
        '[data-testid="painel-filtros-colapsavel"]'
      );
      expect(raiz.getAttribute('data-panel-state')).toBeNull();
      // sentinela: mesmo com a tentativa de breakout, o parser continuou e
      // executou o script seguinte — não houve fechamento prematuro de tag.
      expect(janela.__sentinelaExecutou).toBe(true);
    });
  });

  describe('Regra CSS anti-flash sobrevive ao build (achado A1)', () => {
    it('o seletor de ocultação (variante de descendente, group-data) existe no código-fonte como string literal estática', () => {
      const fonte = fs.readFileSync(path.join(__dirname, 'index.jsx'), 'utf8');

      expect(fonte).toContain('group-data-[panel-state=recolhido]:hidden');
      // não pode ser montado dinamicamente (o scanner do Tailwind exige literal)
      expect(fonte).not.toMatch(/data-\[panel-state=\$\{/);
    });
  });

  describe('Registro no barrel (achado A2)', () => {
    it('import a partir de @/components/app não é undefined', () => {
      expect(PainelDoBarrel).toBeDefined();
      expect(PainelDoBarrel).toBe(PainelFiltrosColapsavel);
    });
  });

  describe('TASK-002-008: controle coerente antes da hidratação (SSR + hidratação real)', () => {
    describe('AC-001-004/AC-001-005: o controle nunca afirma o oposto do painel', () => {
      it('recolhido + 0 filtros: aria-expanded="false" e o chevron efetivamente visível é o de expandir, nunca o de recolher', () => {
        const storageKey = 'panel_teste_task008_aria';
        const { dom, container } = montarParaHidratacaoReal({
          preferenciaRecolhida: true,
          appliedCount: 0,
          storageKey,
        });

        let root;
        act(() => {
          root = hydrateRoot(
            container,
            <PainelComHookReal appliedCount={0} storageKey={storageKey} />
          );
        });

        const doc = dom.window.document;
        const raiz = doc.querySelector(
          '[data-testid="painel-filtros-colapsavel"]'
        );
        const botao = doc.querySelector(
          '[data-testid="painel-filtros-controle"]'
        );
        const chevronRecolher = doc.querySelector(
          '[data-testid="painel-filtros-chevron-recolher"]'
        );
        const chevronExpandir = doc.querySelector(
          '[data-testid="painel-filtros-chevron-expandir"]'
        );

        expect(raiz.getAttribute('data-panel-state')).toBe('recolhido');
        expect(botao.getAttribute('aria-expanded')).toBe('false');
        expect(botao.getAttribute('aria-label')).not.toMatch(/recolher/i);

        // Âncora do seletor: a variante de grupo só governa visibilidade se
        // a RAIZ carregar a classe `group` — sem ela, o seletor gerado
        // (`&:is(:where(.group)[data-panel-state="recolhido"] *)`) nunca
        // casa com nada, e as duas classes abaixo (`toContain`) continuam
        // presentes como STRING sem nenhum efeito real. Mutante (remover
        // `className="group"` da raiz): esta asserção falha; sem ela, a
        // suíte inteira ficava verde apagando de uma vez ocultação, chevron
        // e contagem.
        expect(raiz.classList.contains('group')).toBe(true);

        // Presença das DUAS variantes no markup — string de classe, não
        // visibilidade efetiva (essa depende do CSS compilado + do
        // `classList.contains('group')` acima). As duas existem sempre no
        // DOM (risco declarado da TASK). A variante "recolher" carrega a
        // classe que a apaga sob o mesmo group-data que já oculta o
        // conteúdo; a "expandir" nasce com `hidden` e só a substitui pela
        // classe que a reexibe sob o mesmo estado. Mutante (reverter para
        // `isOpen ? <ChevronUp/> : <ChevronDown/>}`): só UM dos dois testids
        // existiria no DOM, e o `querySelector` do que faltasse devolveria
        // `null` — os `.getAttribute` abaixo lançariam.
        expect(chevronRecolher).not.toBeNull();
        expect(chevronExpandir).not.toBeNull();
        expect(chevronRecolher.getAttribute('class')).toContain(
          'group-data-[panel-state=recolhido]:hidden'
        );
        expect(chevronExpandir.classList.contains('hidden')).toBe(true);
        expect(chevronExpandir.getAttribute('class')).toContain(
          'group-data-[panel-state=recolhido]:block'
        );

        act(() => {
          root.unmount();
        });
      });
    });

    describe('AC-001-004/AC-001-005, segundo eixo (emenda 2026-09-17): ausência em vez de mentira', () => {
      it('recolhido + 0 filtros: sem aria-expanded e com rótulo neutro no servidor e antes do flush; valor real + verbo só depois do efeito', async () => {
        const storageKey = 'panel_teste_task008_segundo_eixo';
        const { dom, container } = montarParaHidratacaoReal({
          preferenciaRecolhida: true,
          appliedCount: 0,
          storageKey,
        });

        // Markup do servidor (renderToString, dentro de
        // montarParaHidratacaoReal): o servidor nunca lê localStorage
        // (A-001-001), então a fonte que ele afirmaria seria sempre
        // "aberto" — exatamente o valor que a emenda proíbe de afirmar.
        const botaoServidor = dom.window.document.querySelector(
          '[data-testid="painel-filtros-controle"]'
        );
        expect(botaoServidor.hasAttribute('aria-expanded')).toBe(false);
        expect(botaoServidor.getAttribute('aria-label')).toBe('Filtros');

        // Hidrata SEM act() (mesmo padrão do teste AC-001-009 acima). O
        // primeiro commit de hidratação em si não é observável neste
        // harness — `hydrateRoot` sem `act()` não produz render nem commit
        // adicional antes do `await act(async () => {})` abaixo (o nó lido
        // logo após esta chamada é o mesmo `botaoServidor` de cima, sem
        // nenhuma mutação no meio). A ausência de `aria-expanded`/rótulo
        // real nesse ponto é garantida por construção: `hidratado` nasce
        // `useState(false)` e só vira `true` dentro do `useEffect`, que o
        // React nunca roda antes do commit — não há mutante que abra essa
        // janela para inspeção aqui.
        const root = hydrateRoot(
          container,
          <PainelComHookReal appliedCount={0} storageKey={storageKey} />
        );

        // Flush do efeito: `hidratado` vira `true` e o hook já leu a
        // preferência real ("recolhido") — agora o controle passa a
        // AFIRMAR o estado real, com o verbo coerente ("Expandir").
        await act(async () => {});
        const botaoPosFlush = dom.window.document.querySelector(
          '[data-testid="painel-filtros-controle"]'
        );
        expect(botaoPosFlush.getAttribute('aria-expanded')).toBe('false');
        expect(botaoPosFlush.getAttribute('aria-label')).toMatch(/expandir/i);

        act(() => {
          root.unmount();
        });
      });
    });

    describe('NFR-001-002: zero divergência de hidratação nos quatro cenários {aberto,recolhido} x {0,2 filtros}', () => {
      it.each([
        ['aberto + 0 filtros', false, 0],
        ['aberto + 2 filtros', false, 2],
        ['recolhido + 0 filtros', true, 0],
        ['recolhido + 2 filtros', true, 2],
      ])(
        '%s: hydrateRoot real não emite nenhum console.error',
        (_descricao, preferenciaRecolhida, appliedCount) => {
          const storageKey = `panel_teste_task008_nfr_${preferenciaRecolhida}_${appliedCount}`;
          const { dom, container } = montarParaHidratacaoReal({
            preferenciaRecolhida,
            appliedCount,
            storageKey,
          });

          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

          let root;
          act(() => {
            root = hydrateRoot(
              container,
              <PainelComHookReal
                appliedCount={appliedCount}
                storageKey={storageKey}
              />
            );
          });

          // Mutante (restaurar o `<span>` da contagem condicionado a
          // `!isOpen`): no cenário recolhido+2, o servidor (sempre aberto)
          // não renderiza o `<span>`, mas a hidratação — com `isOpen` já
          // `false` via hook — o renderizaria: divergência ESTRUTURAL,
          // "Hydration failed", e esta asserção reprova.
          expect(consoleErrorSpy).toHaveBeenCalledTimes(0);

          act(() => {
            root.unmount();
          });
          consoleErrorSpy.mockRestore();
        }
      );

      it('nunca usa suppressHydrationWarning — a flag desligaria a própria checagem que estes testes fazem', () => {
        const fonte = fs.readFileSync(
          path.join(__dirname, 'index.jsx'),
          'utf8'
        );
        expect(fonte).not.toContain('suppressHydrationWarning');
      });
    });

    describe('AC-001-009: a contagem aparece ao terminar de carregar, não após o primeiro clique', () => {
      it('recolhido + 2 filtros: "(2)" já está no markup do servidor, antes de qualquer render/commit de hidratação', async () => {
        const storageKey = 'panel_teste_task008_ac009';
        const { dom, container } = montarParaHidratacaoReal({
          preferenciaRecolhida: true,
          appliedCount: 2,
          storageKey,
        });

        // Propositalmente FORA de `act()`: medido com ref-callback + contador
        // de render que, logo após este `hydrateRoot` sem `act()`, a lista de
        // eventos está vazia — ZERO render, ZERO commit aconteceram. A
        // leitura abaixo é 100% o markup produzido por `renderToString`
        // (dentro de `montarParaHidratacaoReal`), não "o primeiro commit de
        // hidratação" — não há commit nenhum ainda neste ponto. Um `act()`
        // síncrono envolvendo `hydrateRoot`, por sua vez, já flusharia na
        // mesma passada o `useEffect` que corrige `hidratado` (verificado:
        // aria-expanded já sairia corrigido dali), mascarando a distinção
        // entre "nada commitado" e "commitado e corrigido". Chamar direto
        // captura o markup do servidor, antes de qualquer render do cliente:
        // é ali que a contagem — que nunca depende de `hidratado` — precisa
        // já estar. Mutante (condicionar o `<span>` a `hidratado`): ausente
        // neste ponto, presente só depois.
        const root = hydrateRoot(
          container,
          <PainelComHookReal appliedCount={2} storageKey={storageKey} />
        );

        const contagem = dom.window.document.querySelector(
          '[data-testid="painel-filtros-contagem"]'
        );
        expect(contagem).not.toBeNull();
        expect(contagem.textContent).toContain('2');

        // Flusha o efeito pendente antes de desmontar, para não vazar aviso
        // de "not wrapped in act" para o teste seguinte.
        await act(async () => {});
        act(() => {
          root.unmount();
        });
      });
    });
  });

  describe('BRIEF-002: título e seta viram um único controle clicável', () => {
    it('clicar no TEXTO do título (não só na seta) dispara onToggle', async () => {
      const user = userEvent.setup();
      const handleToggle = jest.fn();

      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={true}
          onToggle={handleToggle}
          storageKey="panel_teste_brief002_texto_clicavel"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      await user.click(screen.getByTestId('painel-filtros-rotulo'));

      expect(handleToggle).toHaveBeenCalledTimes(1);
    });

    it('existe um único texto "Filtros" na árvore — o heading não duplica o rótulo do botão', () => {
      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={true}
          onToggle={() => {}}
          storageKey="panel_teste_brief002_texto_unico"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      expect(screen.getAllByText('Filtros')).toHaveLength(1);
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    });

    it('o controle não usa mais o chrome de botão sólido (.btn/.btn-secondary)', () => {
      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={true}
          onToggle={() => {}}
          storageKey="panel_teste_brief002_sem_chrome"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      const classes = screen
        .getByTestId('painel-filtros-controle')
        .className.split(/\s+/)
        .filter(Boolean);

      expect(classes).not.toContain('btn');
      expect(classes).not.toContain('btn-secondary');
      // Mutante (readicionar `text-*`/`font-*` na classe do botão): as duas
      // asserções abaixo, do bloco seguinte, reprovariam — aqui só a
      // ausência do chrome sólido.
    });

    it('o heading (TagTitulo) ENVOLVE o botão — h3/h4 aceita <button> no seu modelo de conteúdo, o inverso não é HTML válido', () => {
      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={true}
          onToggle={() => {}}
          storageKey="panel_teste_brief002_wrapping"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      const titulo = screen.getByTestId('painel-filtros-titulo');
      const controle = screen.getByTestId('painel-filtros-controle');

      expect(titulo.tagName).toBe('H3');
      expect(controle.tagName).toBe('BUTTON');
      expect(titulo.contains(controle)).toBe(true);
    });

    it('o nome acessível do heading continua "Filtros" mesmo com o aria-label do botão aninhado variando por estado', () => {
      render(
        <PainelFiltrosColapsavel
          titulo="Filtros"
          isOpen={false}
          onToggle={() => {}}
          appliedCount={2}
          storageKey="panel_teste_brief002_nome_heading"
        >
          <div>conteudo</div>
        </PainelFiltrosColapsavel>
      );

      // o botão aninhado afirma o estado ("Expandir Filtros (2), ...") —
      // accname 2B (aria-label do próprio nó) responde por ele, sem
      // descer a name-from-content.
      expect(
        screen.getByRole('button', { name: /expandir filtros/i })
      ).toBeInTheDocument();
      // Mutante (remover `aria-label={titulo}` do TagTitulo): a computação
      // de nome do heading passaria a usar a subárvore (2F, name-from-
      // content) e herdaria QUALQUER TEXTO VISÍVEL dentro do botão — não
      // o aria-label do botão (isso nunca acontece, medido com
      // computeAccessibleName). O texto que vaza é o do <span
      // data-testid="painel-filtros-contagem">, oculto só por classe
      // Tailwind (CSS real, que o jsdom não processa) e não por atributo
      // HTML — esta asserção reprovaria, lendo "Filtros (2)" em vez de
      // "Filtros" (ocorre em qualquer isOpen, não só recolhido).
      expect(
        screen.getByRole('heading', { name: 'Filtros', level: 3 })
      ).toBeInTheDocument();
    });

    describe('tipografia do botão herda do heading (Tailwind v4 preflight)', () => {
      it('o preflight instalado normaliza button{font,color:inherit} — mecanismo real, lido do pacote instalado, não assumido', () => {
        // Caminho direto (não `require.resolve`): o `moduleNameMapper` de
        // `next/jest` intercepta resolução de `.css` para um mock — leitura
        // via `fs` no caminho real do pacote instalado escapa do mock e lê
        // o arquivo que o build de fato usa.
        const preflight = fs.readFileSync(
          path.join(
            __dirname,
            '..',
            '..',
            '..',
            '..',
            'node_modules',
            'tailwindcss',
            'preflight.css'
          ),
          'utf8'
        );

        const inicioRegra = preflight.indexOf('button,\ninput');
        expect(inicioRegra).toBeGreaterThan(-1);
        const fimRegra = preflight.indexOf('}', inicioRegra);
        const regra = preflight.slice(inicioRegra, fimRegra);

        expect(regra).toMatch(/font:\s*inherit/);
        expect(regra).toMatch(/color:\s*inherit/);
      });

      it('a classe do botão não sobrescreve font-size/font-weight/cor — nada bloqueia a herança do heading via preflight', () => {
        render(
          <PainelFiltrosColapsavel
            titulo="Filtros"
            isOpen={true}
            onToggle={() => {}}
            storageKey="panel_teste_brief002_sem_override_tipografia"
          >
            <div>conteudo</div>
          </PainelFiltrosColapsavel>
        );

        const classes = screen
          .getByTestId('painel-filtros-controle')
          .className.split(/\s+/)
          .filter(Boolean);

        // Mutante (acrescentar `text-sm`/`font-bold`/`text-gray-500` na
        // classe do botão): qualquer uma destas asserções reprovaria — é
        // exatamente o tipo de classe que quebraria a herança medida acima.
        expect(classes.some(classe => classe.startsWith('text-'))).toBe(false);
        expect(classes.some(classe => classe.startsWith('font-'))).toBe(false);
      });
    });
  });
});
