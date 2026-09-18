import React from 'react';
import { render, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';

function TestComponent() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>
        Toggle
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    // jsdom acumula `document.cookie` entre `set`s — expira explicitamente
    // para isolar cada teste do que o anterior gravou via `toggleTheme`.
    document.cookie = 'theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('should use light as default if nothing is set', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(getByTestId('theme').textContent).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('migrates a legacy localStorage theme into state when there is no cookie-resolved initialTheme (DEC-002-001)', () => {
    localStorage.setItem('theme', 'dark');
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(getByTestId('theme').textContent).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('does not write cookie/localStorage while migrating — read-only correction (AC-001-012)', () => {
    localStorage.setItem('theme', 'dark');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('theme=dark');

    setItemSpy.mockRestore();
  });

  it('does not migrate from localStorage when initialTheme (cookie) is already resolved', () => {
    localStorage.setItem('theme', 'dark');
    const { getByTestId } = render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>
    );
    expect(getByTestId('theme').textContent).toBe('light');
  });

  it('should toggle theme and persist in localStorage', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const button = getByTestId('toggle');
    act(() => {
      button.click();
    });
    expect(getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('writes the new value to document.cookie on toggle (ACH-02)', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const button = getByTestId('toggle');

    act(() => {
      button.click();
    });
    expect(document.cookie).toContain('theme=dark');

    act(() => {
      button.click();
    });
    expect(document.cookie).toContain('theme=light');
  });
});
