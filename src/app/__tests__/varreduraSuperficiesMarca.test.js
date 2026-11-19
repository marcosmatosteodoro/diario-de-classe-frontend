import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// (DEC-006-009 · demonstracao) Prova agregada (AC-005-012, fechamento de
// TRISK-006-003): Header, Footer e o `<head>` de RootLayout renderizados
// juntos sob a marca fictícia não produzem o texto "BLS" nem referenciam
// uma imagem da marca padrão — garantia já provada isoladamente por cada
// uma.

jest.mock('@/hooks/auth/useLogout', () => ({ useLogout: jest.fn() }));
jest.mock('@/providers/UnsavedChangesGuardProvider', () => ({
  useUnsavedChangesGuard: jest.fn(),
}));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

const reactReal = require('react');

// Percorre a árvore de elementos React (produzida por `RootLayout`, sem
// renderizar — é um Server Component) coletando todo valor dos atributos
// pedidos em qualquer nó, não só o primeiro match (molde de `findElement`
// em `src/app/layout.test.jsx`, estendido para coletar todos).
function coletarAtributos(elemento, nomesAtributos, acumulador = []) {
  if (!elemento || typeof elemento !== 'object') return acumulador;
  const props = elemento.props ?? {};
  for (const nome of nomesAtributos) {
    if (typeof props[nome] === 'string') acumulador.push(props[nome]);
  }
  const filhos = Array.isArray(props.children)
    ? props.children
    : [props.children];
  for (const filho of filhos)
    coletarAtributos(filho, nomesAtributos, acumulador);
  return acumulador;
}

// Recarrega Header/Footer/RootLayout com `NEXT_PUBLIC_MARCA` setada/ausente
// e renderiza Header+Footer juntos (molde `jest.isolateModules` +
// `jest.doMock('react', instância real)` de `Header.test.jsx` — resetar
// módulos sem realiasar `react` duplica o pacote e quebra hooks com
// "Invalid hook call"); `RootLayout` é chamado como função simples (não
// usa hook, só `cookies()`/`headers()`), no molde de `layout.test.jsx`.
async function renderizarSuperficies(valorMarca) {
  const marcaOriginal = process.env.NEXT_PUBLIC_MARCA;
  if (valorMarca === undefined) delete process.env.NEXT_PUBLIC_MARCA;
  else process.env.NEXT_PUBLIC_MARCA = valorMarca;

  let container;
  let promessaLayout;
  let metadataCapturada;
  try {
    jest.isolateModules(() => {
      jest.doMock('react', () => reactReal);
      const { Header } = require('@/components/ui/Header');
      const { Footer } = require('@/components/ui/Footer');
      const { ThemeProvider } = require('@/providers/ThemeProvider');
      const layoutModule = require('@/app/layout');
      const RootLayout = layoutModule.default;
      metadataCapturada = layoutModule.metadata;
      const nextHeaders = require('next/headers');
      nextHeaders.cookies.mockResolvedValue({ get: () => undefined });
      nextHeaders.headers.mockResolvedValue(new Headers());
      require('@/hooks/auth/useLogout').useLogout.mockReturnValue({
        logoutUser: jest.fn(),
        isLoggingOut: false,
      });
      require('@/providers/UnsavedChangesGuardProvider').useUnsavedChangesGuard.mockReturnValue(
        { confirmNavigation: () => true }
      );

      ({ container } = render(
        <ThemeProvider>
          <Header />
          <Footer />
        </ThemeProvider>
      ));
      promessaLayout = RootLayout({ children: 'conteudo' });
    });

    const arvoreLayout = await promessaLayout;
    return { container, arvoreLayout, metadata: metadataCapturada };
  } finally {
    if (marcaOriginal === undefined) delete process.env.NEXT_PUBLIC_MARCA;
    else process.env.NEXT_PUBLIC_MARCA = marcaOriginal;
  }
}

// `metadata` (title/description exportados pelo módulo do RootLayout) entra
// no texto agregado: uma regressão que trocasse o título pela marca padrão
// não deixaria rastro em `container`/`arvoreLayout` (não é DOM renderizado
// nem nó do `<head>`) e passaria batida sem isto.
function textoCompletoDe({ container, arvoreLayout, metadata }) {
  const atributosDom = ['src', 'href', 'alt'];
  const valoresDom = Array.from(container.querySelectorAll('*'))
    .flatMap(el => atributosDom.map(nome => el.getAttribute(nome)))
    .filter(Boolean);
  const atributosLayout = coletarAtributos(arvoreLayout, [
    'href',
    'content',
    'alt',
  ]);
  const textoMetadata = [metadata?.title, metadata?.description].filter(
    Boolean
  );
  return [
    container.textContent,
    ...valoresDom,
    ...atributosLayout,
    ...textoMetadata,
  ].join(' ');
}

function imagensDe({ container, arvoreLayout }) {
  const srcsDom = Array.from(container.querySelectorAll('img'))
    .map(el => el.getAttribute('src'))
    .filter(Boolean);
  const hrefsLayout = coletarAtributos(arvoreLayout, ['href']);
  return [...srcsDom, ...hrefsLayout];
}

describe('varredura agregada das superfícies de marca (AC-005-012)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('marca fictícia (exemplo): Header+Footer+head juntos não produzem o texto "bls"', async () => {
    const superficies = await renderizarSuperficies('exemplo');

    expect(textoCompletoDe(superficies)).not.toMatch(/bls/i);
  });

  it('controle positivo: a mesma varredura com a marca padrão (sem a variável) casa "bls"', async () => {
    const superficies = await renderizarSuperficies(undefined);

    expect(textoCompletoDe(superficies)).toMatch(/bls/i);
  });

  it('marca fictícia: nenhuma imagem de Header/head aponta para um arquivo da marca padrão — todo src/href de imagem casa /marcas/exemplo/', async () => {
    const superficies = await renderizarSuperficies('exemplo');

    const IMAGEM_DE_MARCA_PADRAO =
      /(?:^|\/)(bls\.png|bls-dark\.png|icon-192\.png|icon-512\.png|icon-maskable\.png)$/;
    for (const valor of imagensDe(superficies)) {
      if (!IMAGEM_DE_MARCA_PADRAO.test(valor)) continue;
      expect(valor).toMatch(/^\/marcas\/exemplo\//);
    }
    // Controle de que a varredura de fato encontrou imagens de marca para
    // avaliar — lista vazia aprovaria por vacuidade, não por garantia.
    expect(
      imagensDe(superficies).filter(valor => IMAGEM_DE_MARCA_PADRAO.test(valor))
    ).not.toHaveLength(0);
  });
});
