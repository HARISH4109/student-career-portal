export const AI_MAX_INPUT_LENGTH = 50_000;

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|directions|prompts|rules|guidelines)/i,
  /disregard\s+(?:all\s+)?(?:safety|system|previous|prior)\s+(?:policies|instructions|rules|guidelines)/i,
  /disregard\s+(?:previous|prior)\s+(?:safety|system)\s+(?:policies|instructions|rules|guidelines)/i,
  /you\s+are\s+now\s+(?:an?\s+)?(?:unrestricted|jailbroken|dan|evil|godmode)/i,
  /(?:system\s*prompt|system\s*instruction)\s*override/i,
  /<\|(?:im_start|im_end|system|user|assistant)\|>/i,
  /\[\/?(?:INST|SYS)\]/i,
  /new\s+role:\s*act\s+as/i,
];

/**
 * Sanitizes untrusted user input before feeding it into downstream AI pipelines.
 * Truncates oversized input, eliminates null bytes, and strips dangerous control chars.
 */
export function sanitizeAiInput(text: string, maxLength: number = AI_MAX_INPUT_LENGTH): string {
  if (!text) return '';

  // Strip null bytes and non-printable control characters (keep \r, \n, \t)
  const cleaned = text
    .replace(/\0/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned.slice(0, maxLength);
}

/**
 * Heuristic check for common adversarial prompt injection indicators.
 * Used for logging warnings or flagging suspicious AI inputs during ingestion.
 */
export function containsPromptInjectionPatterns(text: string): boolean {
  if (!text) return false;
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
