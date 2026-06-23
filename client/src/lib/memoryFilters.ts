export type Memory = {
  id: string;
  text: string;
  kind: string;
  source: string;
  createdAt: string;
};

/**
 * Builds a query string for the memories API endpoint.
 * Includes `kind` param only if non-empty, `source` param only if non-empty.
 */
export function buildQueryParams(kind: string, source: string): string {
  const params = new URLSearchParams();
  if (kind) params.set('kind', kind);
  if (source) params.set('source', source);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Filters a list of memories by a case-insensitive substring match on `text`.
 * Returns the full list if query is empty.
 */
export function filterMemories(memories: Memory[], query: string): Memory[] {
  if (!query.trim()) return memories;
  const lower = query.trim().toLowerCase();
  return memories.filter((m) => m.text.toLowerCase().includes(lower));
}
