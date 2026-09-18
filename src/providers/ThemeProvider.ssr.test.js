import React from 'react';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from './ThemeProvider';
import { parseThemeCookie, serializeThemeCookie } from '@/utils/themeCookie';

describe('ThemeProvider — ausência de I/O de browser em funções puras', () => {
  it('parseThemeCookie/serializeThemeCookie nunca tocam Storage.prototype', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    parseThemeCookie('dark');
    serializeThemeCookie('dark');

    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});

describe('ThemeProvider — paridade real de SSR (renderToString)', () => {
  // Fixture discriminante: se alguém reintroduzir getInitialTheme() como
  // inicializador lazy de useState, renderToString sempre produziria 'light'
  // independente de initialTheme, e este teste passaria a falhar.
  it('renderToString com initialTheme="dark" produz data-theme="dark"', () => {
    const html = renderToString(
      <ThemeProvider initialTheme="dark">
        <span>x</span>
      </ThemeProvider>
    );

    expect(html).toContain('data-theme="dark"');
  });

  it('renderToString com initialTheme="light" não produz data-theme="dark"', () => {
    const html = renderToString(
      <ThemeProvider initialTheme="light">
        <span>x</span>
      </ThemeProvider>
    );

    expect(html).not.toContain('data-theme="dark"');
  });
});
