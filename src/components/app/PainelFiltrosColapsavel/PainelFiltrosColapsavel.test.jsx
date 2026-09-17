import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { PainelFiltrosColapsavel, buildAntiFlashScript } from './index';
import { PainelFiltrosColapsavel as PainelDoBarrel } from '@/components/app';

/**
 * Executa o texto de um `<script>` extraído da árvore renderizada contra um
 * documento HTML isolado (`document.implementation.createHTMLDocument`),
 * passando esse documento como o `document` local da função executada — o
 * script real, gerado pelo componente, manipula só esse documento isolado,
 * nunca o documento global do teste.
 */
function executarScriptEmDocumentoIsolado(scriptText, doc) {
  const executar = new Function('document', scriptText);
  executar(doc);
}

function montarDocumentoComScript({ isOpen = true, storageKey, filhoTestId }) {
  const markup = renderToStaticMarkup(
    <PainelFiltrosColapsavel
      titulo="Filtros"
      isOpen={isOpen}
      onToggle={() => {}}
      storageKey={storageKey}
    >
      <div data-testid={filhoTestId || 'campo-filtro'}>conteudo</div>
    </PainelFiltrosColapsavel>
  );

  const doc = document.implementation.createHTMLDocument('teste-anti-flash');
  doc.body.innerHTML = markup;

  const scriptNode = doc.querySelector('script');
  const wrapper = doc.querySelector('[data-testid="painel-filtros-conteudo"]');

  return { doc, scriptText: scriptNode.textContent, wrapper };
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
      // nenhuma outra prop é tocada pelo próprio componente: children e
      // appliedCount seguem exatamente o que foi passado no rerender.
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

      expect(screen.getByTestId('painel-filtros-conteudo')).toHaveAttribute(
        'data-panel-state',
        'recolhido'
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

      const conteudoA = within(
        screen.getByRole('button', { name: /expandir card a/i }).parentElement
          .parentElement
      ).queryByTestId('painel-filtros-conteudo');
      expect(conteudoA).toHaveAttribute('data-panel-state', 'recolhido');
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

  describe('Script anti-flash (DEC-002-001) — execução contra DOM real', () => {
    it('com a chave gravada como "recolhido", aplica data-panel-state="recolhido" antes de qualquer React rodar', () => {
      localStorage.setItem(
        'panel_teste_antiflash_ok',
        JSON.stringify('recolhido')
      );

      const { scriptText, wrapper, doc } = montarDocumentoComScript({
        isOpen: true,
        storageKey: 'panel_teste_antiflash_ok',
      });

      executarScriptEmDocumentoIsolado(scriptText, doc);

      const wrapperPos = doc.querySelector(
        '[data-testid="painel-filtros-conteudo"]'
      );
      expect(wrapperPos.getAttribute('data-panel-state')).toBe('recolhido');
      expect(wrapper).not.toBeNull();
    });

    it('cenário irmão: sem a chave gravada, o atributo não é aplicado', () => {
      const { scriptText, doc } = montarDocumentoComScript({
        isOpen: true,
        storageKey: 'panel_teste_antiflash_ausente',
      });

      executarScriptEmDocumentoIsolado(scriptText, doc);

      const wrapperPos = doc.querySelector(
        '[data-testid="painel-filtros-conteudo"]'
      );
      expect(wrapperPos.getAttribute('data-panel-state')).toBeNull();
    });

    it('variante de chave-mapa: aplica o atributo só quando o item do mapa é "recolhido"', () => {
      localStorage.setItem(
        'filters_relatorios_panel_teste',
        JSON.stringify({ 'card-1': 'recolhido', 'card-2': 'aberto' })
      );

      const { scriptText, doc } = montarDocumentoComScript({
        isOpen: true,
        storageKey: {
          mapKey: 'filters_relatorios_panel_teste',
          itemId: 'card-1',
        },
      });

      executarScriptEmDocumentoIsolado(scriptText, doc);

      const wrapperPos = doc.querySelector(
        '[data-testid="painel-filtros-conteudo"]'
      );
      expect(wrapperPos.getAttribute('data-panel-state')).toBe('recolhido');
    });

    it('valor lido do localStorage nunca é interpolado: string de ataque não insere nó nem aplica o atributo', () => {
      localStorage.setItem(
        'panel_teste_valor_ataque',
        JSON.stringify('recolhido"><img src=x onerror=alert(1)>')
      );

      const { scriptText, doc } = montarDocumentoComScript({
        isOpen: true,
        storageKey: 'panel_teste_valor_ataque',
      });

      executarScriptEmDocumentoIsolado(scriptText, doc);

      expect(doc.querySelectorAll('img').length).toBe(0);
      const wrapperPos = doc.querySelector(
        '[data-testid="painel-filtros-conteudo"]'
      );
      expect(wrapperPos.getAttribute('data-panel-state')).toBeNull();
    });
  });

  describe('Regra CSS anti-flash sobrevive ao build (achado A1)', () => {
    it('o seletor de ocultação existe no código-fonte como string literal estática', () => {
      const fonte = fs.readFileSync(path.join(__dirname, 'index.jsx'), 'utf8');

      expect(fonte).toContain('data-[panel-state=recolhido]:hidden');
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
});
