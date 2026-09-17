import {
  FILTER_STORAGE_KEYS,
  FILTER_PANEL_STORAGE_KEYS,
  RELATORIOS_PANEL_STORAGE_KEY,
} from '@/constants';

/**
 * Lê os filtros salvos no localStorage e mescla sobre os padrões.
 * SSR-safe: fora do browser (ou em caso de erro) retorna os padrões.
 */
export function loadFilters(key, defaults = {}) {
  if (typeof window === 'undefined') {
    return defaults;
  }
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return defaults;
    }
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

/**
 * Persiste os filtros usados no localStorage.
 */
export function saveFilters(key, filters) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(filters));
}

/**
 * Remove os filtros de uma página específica.
 */
export function clearFilters(key) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(key);
}

/**
 * Remove todos os filtros persistidos (usado no logout).
 */
export function clearAllFilters() {
  if (typeof window === 'undefined') {
    return;
  }
  Object.values(FILTER_STORAGE_KEYS).forEach(key =>
    localStorage.removeItem(key)
  );
  Object.values(FILTER_PANEL_STORAGE_KEYS).forEach(key =>
    localStorage.removeItem(key)
  );
  localStorage.removeItem(RELATORIOS_PANEL_STORAGE_KEY);
}

/**
 * Lê a preferência de estado (aberto/recolhido) de um painel com chave fixa.
 * SSR-safe: fora do browser (ou em caso de erro) retorna o default.
 */
export function loadPanelState(key, defaultValue) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

/**
 * Persiste a preferência de estado (aberto/recolhido) de um painel com chave fixa.
 */
export function savePanelState(key, value) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Lê a preferência de estado de um item dentro do mapa de uma chave única
 * (uso em `/relatorios`, onde os cards são dinâmicos). SSR-safe e fail-secure:
 * fora do browser, mapa ausente, item ausente ou JSON inválido retornam o default.
 */
export function loadPanelStateMap(mapKey, itemId, defaultValue) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const stored = localStorage.getItem(mapKey);
    if (!stored) {
      return defaultValue;
    }
    const map = JSON.parse(stored);
    if (!map || !Object.hasOwn(map, itemId)) {
      return defaultValue;
    }
    return map[itemId];
  } catch {
    return defaultValue;
  }
}

/**
 * Persiste a preferência de estado de um item dentro do mapa de uma chave
 * única, preservando os demais itens já presentes (merge, não substitui o
 * mapa inteiro). JSON corrompido no mapa existente é tratado como mapa vazio
 * (fail-secure), nunca propagado.
 */
export function savePanelStateMap(mapKey, itemId, value) {
  if (typeof window === 'undefined') {
    return;
  }
  let map = {};
  try {
    const stored = localStorage.getItem(mapKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        map = parsed;
      }
    }
  } catch {
    map = {};
  }
  map[itemId] = value;
  localStorage.setItem(mapKey, JSON.stringify(map));
}
