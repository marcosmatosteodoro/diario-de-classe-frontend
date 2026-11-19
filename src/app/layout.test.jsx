import RootLayout from './layout';
import { cookies, headers } from 'next/headers';
import { NonceProvider } from '@/providers/NonceProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UserAuthProvider } from '@/providers/UserAuthProvider';
import { ServiceWorkerRegister } from '@/components/app/ServiceWorkerRegister';

jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

jest.mock('@/providers/ThemeProvider', () => ({
  ThemeProvider: jest.fn(({ children }) => children),
}));

// Percorre a árvore de elementos React (sem renderizar) até achar o primeiro
// elemento que satisfaz `predicate`, devolvendo o próprio elemento.
function findElement(element, predicate) {
  if (!element || typeof element !== 'object') return null;
  if (predicate(element)) return element;
  const { children } = element.props ?? {};
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

function findThemeProviderProps(element) {
  const found = findElement(element, el => el.type === ThemeProvider);
  return found?.props ?? null;
}

function findHeadChildren(element) {
  const head = findElement(element, el => el.type === 'head');
  if (!head) return null;
  const { children } = head.props ?? {};
  return Array.isArray(children) ? children : [children];
}

// Recarrega `./layout` com `NEXT_PUBLIC_MARCA` setada/ausente (DEC-006-002 ·
// demonstracao) e reconecta os mocks de `next/headers` na instância nova do
// módulo (jest.resetModules() cria mocks novos para toda dependência).
async function carregarLayout(valorMarca) {
  const salvo = process.env.NEXT_PUBLIC_MARCA;
  if (valorMarca === undefined) delete process.env.NEXT_PUBLIC_MARCA;
  else process.env.NEXT_PUBLIC_MARCA = valorMarca;
  jest.resetModules();
  try {
    const mod = await import('./layout');
    const nextHeaders = await import('next/headers');
    nextHeaders.cookies.mockResolvedValue({ get: () => undefined });
    nextHeaders.headers.mockResolvedValue(new Headers());
    return mod;
  } finally {
    if (salvo === undefined) delete process.env.NEXT_PUBLIC_MARCA;
    else process.env.NEXT_PUBLIC_MARCA = salvo;
  }
}

describe('RootLayout', () => {
  beforeEach(() => {
    headers.mockResolvedValue(new Headers());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves initialTheme from the theme cookie and passes it to ThemeProvider', async () => {
    cookies.mockResolvedValue({ get: () => ({ value: 'dark' }) });

    const tree = await RootLayout({ children: 'conteudo' });

    expect(findThemeProviderProps(tree)).toEqual(
      expect.objectContaining({ initialTheme: 'dark' })
    );
  });

  it('passes null (not a collapsed default) when the theme cookie is absent, so ThemeProvider can tell "no cookie" from "cookie=light"', async () => {
    cookies.mockResolvedValue({ get: () => undefined });

    const tree = await RootLayout({ children: 'conteudo' });

    expect(findThemeProviderProps(tree)).toEqual(
      expect.objectContaining({ initialTheme: null })
    );
  });

  it('monta o ServiceWorkerRegister como filho do body (COMP-002-002)', async () => {
    cookies.mockResolvedValue({ get: () => undefined });

    const tree = await RootLayout({ children: 'conteudo' });

    expect(
      findElement(tree, el => el.type === ServiceWorkerRegister)
    ).not.toBeNull();
  });

  it('entrega o nonce da requisição (x-nonce) ao NonceProvider', async () => {
    cookies.mockResolvedValue({ get: () => undefined });
    headers.mockResolvedValue(
      new Headers({ 'x-nonce': 'nonce-da-requisicao' })
    );

    const tree = await RootLayout({ children: 'conteudo' });

    expect(findElement(tree, el => el.type === NonceProvider).props.nonce).toBe(
      'nonce-da-requisicao'
    );
  });

  it('o NonceProvider envolve a página (children)', async () => {
    cookies.mockResolvedValue({ get: () => undefined });
    const pagina = <span data-testid="pagina" />;

    const tree = await RootLayout({ children: pagina });
    const provider = findElement(tree, el => el.type === NonceProvider);

    expect(findElement(provider, el => el === pagina)).toBe(pagina);
  });

  it('monta o UserAuthProvider envolvendo a página: sem ele a restauração não ocorre e a ausência passaria por "sem sessão"', async () => {
    cookies.mockResolvedValue({ get: () => undefined });
    const pagina = <span data-testid="pagina" />;

    const tree = await RootLayout({ children: pagina });
    const provider = findElement(tree, el => el.type === UserAuthProvider);

    expect(provider).not.toBeNull();
    expect(findElement(provider, el => el === pagina)).toBe(pagina);
  });
});

// (DEC-006-002 · demonstracao) AC-005-010/AC-005-001/AC-005-002: ícones do
// head lidos do registro; manifest/theme-color continuam literais (não
// variam com a marca — DEC-006-004 resolve o conteúdo pelo rewrite, nunca
// pelo endereço do `<link>`).
describe('ícone e manifest por marca', () => {
  function headTags(tree) {
    const headChildren = findHeadChildren(tree);
    const findByProps = matcher =>
      headChildren.find(
        child => child && typeof child === 'object' && matcher(child.props)
      );
    return {
      manifestLink: findByProps(p => p.rel === 'manifest'),
      themeColorMeta: findByProps(p => p.name === 'theme-color'),
      iconLink: findByProps(p => p.rel === 'icon'),
      appleTouchIconLink: findByProps(p => p.rel === 'apple-touch-icon'),
    };
  }

  // AC-005-016a: unicidade do manifesto é provada por contagem — `find`
  // aceitaria um segundo `<link rel="manifest">` no head sem reprovar.
  function countManifestLinks(tree) {
    return findHeadChildren(tree).filter(
      child =>
        child && typeof child === 'object' && child.props?.rel === 'manifest'
    );
  }

  it('marca padrão: aponta as meta tags do head para os ícones reais, nunca mais para /bls.png', async () => {
    const { default: RootLayoutPadrao } = await carregarLayout(undefined);

    const tree = await RootLayoutPadrao({ children: 'conteudo' });
    const { manifestLink, themeColorMeta, iconLink, appleTouchIconLink } =
      headTags(tree);

    expect(manifestLink.props.href).toBe('/manifest.json');
    expect(countManifestLinks(tree)).toHaveLength(1);
    expect(themeColorMeta.props.content).toBe('#1e293b');
    expect(iconLink.props.href).toBe('/icon-192.png');
    expect(appleTouchIconLink.props.href).toBe('/icon-192.png');
  });

  it('marca fictícia: ícone e atalho apontam para /marcas/exemplo/icon-192.png; manifest e theme-color não variam', async () => {
    const { default: RootLayoutFicticia } = await carregarLayout('exemplo');

    const tree = await RootLayoutFicticia({ children: 'conteudo' });
    const { manifestLink, themeColorMeta, iconLink, appleTouchIconLink } =
      headTags(tree);

    expect(iconLink.props.href).toBe('/marcas/exemplo/icon-192.png');
    expect(appleTouchIconLink.props.href).toBe('/marcas/exemplo/icon-192.png');
    expect(manifestLink.props.href).toBe('/manifest.json');
    expect(countManifestLinks(tree)).toHaveLength(1);
    expect(themeColorMeta.props.content).toBe('#1e293b');
  });
});

// (DEC-006-002 · demonstracao) AC-005-008: título da aba lido do registro.
describe('título da aba por marca', () => {
  it('marca padrão: metadata.title é "Diário de Classe" (idêntico a hoje)', async () => {
    const mod = await carregarLayout(undefined);
    expect(mod.metadata.title).toBe('Diário de Classe');
  });

  it('marca fictícia: metadata.title é "Diário de Classe - Escola Exemplo de Idiomas"', async () => {
    const mod = await carregarLayout('exemplo');
    expect(mod.metadata.title).toBe(
      'Diário de Classe - Escola Exemplo de Idiomas'
    );
  });
});
