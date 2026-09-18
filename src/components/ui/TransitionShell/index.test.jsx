import { render, screen } from '@testing-library/react';
import { TransitionShell } from './index';

// Instala um matchMedia mockado para `(prefers-reduced-motion: reduce)` com o
// valor de `matches` pedido, e devolve o próprio mock para a asserção de que
// ele foi de fato consultado (prova de que o ambiente simulado mudou —
// lição teste-de-ambiente-simulado-inerte: sem essa consulta, a fixture não
// prova nada além de que o React ainda sabe renderizar uma div).
function mockPrefersReducedMotion(matches) {
  const matchMediaMock = jest.fn().mockImplementation(query => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  window.matchMedia = matchMediaMock;
  return matchMediaMock;
}

describe('TransitionShell', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('keeps animate-app-shell-in with prefers-reduced-motion: no-preference (matches: false)', () => {
    const matchMediaMock = mockPrefersReducedMotion(false);

    render(
      <TransitionShell>
        <span>conteúdo</span>
      </TransitionShell>
    );

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
      false
    );
    expect(matchMediaMock).toHaveBeenCalled();

    const shell = screen.getByTestId('transition-shell');
    expect(shell).toHaveClass('animate-app-shell-in');
    expect(shell).toHaveTextContent('conteúdo');
  });

  it('keeps animate-app-shell-in with prefers-reduced-motion: reduce (matches: true) — suppression lives in CSS, never in a JS branch (DEC-003-002)', () => {
    const matchMediaMock = mockPrefersReducedMotion(true);

    render(
      <TransitionShell>
        <span>conteúdo</span>
      </TransitionShell>
    );

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
      true
    );
    expect(matchMediaMock).toHaveBeenCalled();

    const shell = screen.getByTestId('transition-shell');
    expect(shell).toHaveClass('animate-app-shell-in');
    expect(shell).toHaveTextContent('conteúdo');
  });
});
