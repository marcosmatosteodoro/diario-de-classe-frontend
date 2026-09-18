import RootLayout from './layout';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/providers/ThemeProvider';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

jest.mock('@/providers/ThemeProvider', () => ({
  ThemeProvider: jest.fn(({ children }) => children),
}));

// Percorre a árvore de elementos React (sem renderizar) até achar o elemento
// cujo `type` é o mock de ThemeProvider, e devolve as props recebidas por ele.
function findThemeProviderProps(element) {
  if (!element || typeof element !== 'object') return null;
  if (element.type === ThemeProvider) return element.props;
  const { children } = element.props ?? {};
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const found = findThemeProviderProps(child);
    if (found) return found;
  }
  return null;
}

describe('RootLayout', () => {
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
});
