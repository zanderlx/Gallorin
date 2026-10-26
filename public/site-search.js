export const normalizeSearch = text =>
  String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
export function prepareSearch(entries) {
  return entries.map(entry => ({
    ...entry,
    searchText: normalizeSearch(`${entry.title} ${entry.text}`),
    searchTitle: normalizeSearch(entry.title)
  }));
}
export function searchEntries(index, query, limit = 60) {
  const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return index
    .filter(entry => words.every(word => entry.searchText.includes(word)))
    .map(entry => ({
      entry,
      score: words.reduce((score, word) => score + (entry.searchTitle.includes(word) ? 5 : 1), 0)
    }))
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map(result => result.entry);
}
