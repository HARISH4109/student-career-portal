/**
 * Validates href values before rendering into DOM anchors or exported HTML documents.
 * Permits only http:, https:, mailto:, and safe relative `/` paths.
 */
export function safeHref(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return trimmed;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
