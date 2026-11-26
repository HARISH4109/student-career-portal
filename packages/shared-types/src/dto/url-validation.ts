import { z } from 'zod';

/** Returns true only for http: and https: URLs, blocking javascript:, data:, vbscript:, etc. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function httpUrlSchema(message = 'Use an HTTP or HTTPS URL') {
  return z.string().url(message).refine(isSafeHttpUrl, message);
}

export function optionalHttpUrlSchema(message = 'Use an HTTP or HTTPS URL') {
  return httpUrlSchema(message).optional().nullable().or(z.literal(''));
}

export const safePosterUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (value) => value === '' || (value.startsWith('/uploads/') && !value.startsWith('//')) || isSafeHttpUrl(value),
    'Invalid poster URL',
  )
  .nullable()
  .optional();
