const DIACRITICS_REGEX = /[̀-ͯ]/g;

function normalize(text) {
  return text.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase();
}

export function matchesSearchText(label, query) {
  const normalizedQuery = normalize(query);

  if (normalizedQuery === '') {
    return true;
  }

  return normalize(label).includes(normalizedQuery);
}
