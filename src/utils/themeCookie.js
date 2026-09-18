const THEME_COOKIE_KEY = 'theme';
const THEME_VALUES = ['light', 'dark'];
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 ano

export const getKey = () => THEME_COOKIE_KEY;

export const parseThemeCookie = rawValue => {
  if (THEME_VALUES.includes(rawValue)) return rawValue;
  return null;
};

export const serializeThemeCookie = theme => {
  return `${getKey()}=${theme}; Path=/; SameSite=Lax; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}`;
};
