// Lower-case letters and digits only, so "KE-012", "ke 012" and "ke012" compare equal,
// and "0712 345 678" matches "0712345678".
export const compactSearchText = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Plain substring match, or the same match with spaces, dashes and case ignored. */
export function matchesSearch(fields, searchTerm) {
  const term = String(searchTerm ?? '').trim().toLowerCase();
  if (!term) return true;
  const compactTerm = compactSearchText(term);
  return fields.some((field) => String(field ?? '').toLowerCase().includes(term)
    || (compactTerm && compactSearchText(field).includes(compactTerm)));
}

export function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : 1 + Math.min(diagonal, above, previous[j - 1]);
      diagonal = above;
    }
  }
  return previous[right.length];
}

/**
 * "Did you mean…" for a search with no results: items whose candidate strings (a name, each word
 * of it, a tag) are within a couple of typos of what was typed. Closest first.
 */
export function getSearchSuggestions(items, searchTerm, getCandidates, limit = 3) {
  const term = compactSearchText(searchTerm);
  if (term.length < 2) return [];
  const allowedTypos = Math.max(1, Math.floor(term.length / 3));

  return items
    .map((item) => {
      const candidates = getCandidates(item).flatMap((value) => [value, ...String(value ?? '').split(/\s+/)])
        .map(compactSearchText)
        .filter(Boolean);
      const distance = candidates.length ? Math.min(...candidates.map((candidate) => editDistance(term, candidate))) : Infinity;
      return { item, distance };
    })
    .filter(({ distance }) => distance <= allowedTypos)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit)
    .map(({ item }) => item);
}
