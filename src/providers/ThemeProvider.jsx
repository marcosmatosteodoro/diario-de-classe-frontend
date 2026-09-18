'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from 'react';
import {
  getKey,
  serializeThemeCookie,
  DEFAULT_THEME,
} from '@/utils/themeCookie';

const THEME_KEY = getKey();

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children, initialTheme = null }) => {
  const [theme, setTheme] = useState(initialTheme ?? DEFAULT_THEME);

  // Migração de preferência salva antes do cookie existir (DEC-002-001,
  // emenda de mecanismo): só executa quando não há cookie
  // (`initialTheme === null`) — nesse caso não há nada a perder, então o
  // efeito lê `localStorage` uma única vez e corrige o estado em memória,
  // sem gravar nada (nem cookie, nem `localStorage`) aqui — a gravação em
  // ambos os canais é só responsabilidade de `toggleTheme` (ação explícita
  // do usuário). `localStorage` (escolha explícita anterior) tem prioridade
  // sobre a preferência do sistema operacional; ponto de extensão da wave 2
  // (TASK-002-006, ainda não implementada): plugar aqui um
  // `else if (matchMedia('(prefers-color-scheme: dark)').matches)`, no
  // mesmo efeito, nunca um segundo efeito concorrente.
  useLayoutEffect(() => {
    if (initialTheme !== null) return;

    const legacy = localStorage.getItem(THEME_KEY);
    if (legacy && legacy !== theme) {
      setTheme(legacy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    document.cookie = serializeThemeCookie(next);
    setTheme(next);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div data-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  );
};
