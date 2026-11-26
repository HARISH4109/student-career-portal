/** Escapes SQL LIKE/ILIKE wildcard characters (`%`, `_`, `\`) in user search inputs. */
export function escapeLikePattern(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}
