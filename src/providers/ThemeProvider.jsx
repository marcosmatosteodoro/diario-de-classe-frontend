'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { getKey, serializeThemeCookie } from '@/utils/themeCookie';

const THEME_KEY = getKey();
const DEFAULT_THEME = 'light';

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children, initialTheme = DEFAULT_THEME }) => {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    // Grava em localStorage só para não perder a preferência de quem já tinha
    // tema salvo por esse canal antes do cookie existir; não participa da
    // resolução do estado inicial (a fonte da verdade é o cookie, lido no servidor).
    localStorage.setItem(THEME_KEY, theme);
    document.cookie = serializeThemeCookie(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div data-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  );
};
