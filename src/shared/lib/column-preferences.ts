export function loadColumnPreference<ColumnId extends string>(
  key: string,
  fallback: readonly ColumnId[],
  validColumns?: readonly ColumnId[],
  requiredColumns: readonly ColumnId[] = [],
): ColumnId[] {
  if (typeof window === "undefined") return [...fallback];

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return [...fallback];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...fallback];
    const valid = validColumns ? new Set<string>(validColumns) : undefined;
    const columns = parsed.filter(
      (item): item is ColumnId => typeof item === "string" && (!valid || valid.has(item)),
    );
    const normalized = [
      ...columns,
      ...requiredColumns.filter((column) => !columns.includes(column)),
    ];
    return normalized.length ? normalized : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function saveColumnPreference<ColumnId extends string>(
  key: string,
  columns: readonly ColumnId[],
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(columns));
  } catch {
    // Tables remain usable when browser storage is unavailable.
  }
}
