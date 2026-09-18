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
  // emenda de mecanismo) + preferência de sistema operacional na primeira
  // visita (AC-001-003, cenário 2): só executa quando não há cookie
  // (`initialTheme === null`) — nesse caso não há nada a perder, então o
  // efeito lê `localStorage` uma única vez e corrige o estado em memória,
  // sem gravar nada (nem cookie, nem `localStorage`) aqui — a gravação em
  // ambos os canais é só responsabilidade de `toggleTheme` (ação explícita
  // do usuário). `localStorage` (escolha explícita anterior) tem prioridade
  // sobre a preferência do sistema operacional: só cai em `matchMedia`
  // quando não há cookie **e** não há legado em `localStorage`.
  useLayoutEffect(() => {
    if (initialTheme !== null) return;

    const legacy = localStorage.getItem(THEME_KEY);
    if (legacy && legacy !== theme) {
      setTheme(legacy);
    } else if (
      !legacy &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ) {
      setTheme('dark');
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
