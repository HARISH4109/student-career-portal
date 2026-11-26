/** Escapes SQL LIKE/ILIKE wildcard characters (`%`, `_`, `\`) in user-supplied search terms. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
