import dns from 'node:dns/promises';
import net from 'node:net';

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'instance-data',
]);

/**
 * Checks if an IPv4 address falls within private, loopback, or link-local ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const a = parts[0];
  const b = parts[1];
  if (a === undefined || b === undefined) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private: 172.16 - 172.31)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

/**
 * Checks if an IPv6 address is loopback, unique local, or link-local.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice(7);
    if (net.isIPv4(mapped)) {
      return isPrivateIPv4(mapped);
    }
    // Block hex-encoded IPv4-mapped addresses conservatively
    return true;
  }
  // NAT64 / 64:ff9b::/96
  if (normalized.startsWith('64:ff9b:')) return true;
  // fc00::/7 (Unique Local)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // fe80::/10 (Link-Local)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  return false;
}

/**
 * Validates a target URL against SSRF threats before initiating HTTP requests or AI scraping.
 * Protects internal cloud metadata services, private networks, and unauthorized ports.
 */
export function validateUrlForFetch(urlStr: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: 'Malformed URL' };
  }

  // Only allow HTTP and HTTPS protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  // Disallow user credentials in URL (e.g. http://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'URLs with embedded credentials are not permitted.' };
  }

  // Restrict to standard web ports
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return {
      valid: false,
      reason: `Non-standard port "${parsed.port}" is not permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const unbracketedHost = hostname.replace(/^\[|\]$/g, '');

  // Block forbidden known hostnames
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAMES.has(unbracketedHost) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return {
      valid: false,
      reason: `Access to internal host "${hostname}" is prohibited.`,
    };
  }

  // Check IP addresses
  const ipType = net.isIP(unbracketedHost);
  if (ipType === 4 && isPrivateIPv4(unbracketedHost)) {
    return {
      valid: false,
      reason: `Target IP "${hostname}" is within a private or reserved network.`,
    };
  }
  if (ipType === 6 && isPrivateIPv6(unbracketedHost)) {
    return {
      valid: false,
      reason: `Target IPv6 "${hostname}" is within a private or loopback range.`,
    };
  }

  // Check for decimal/hex/octal encoded IP representations (e.g., 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname) || /^0x[0-9a-fA-F]+$/.test(hostname)) {
    return {
      valid: false,
      reason: 'Numeric/hexadecimal encoded IP addresses are not permitted.',
    };
  }

  return { valid: true };
}

/**
 * Resolves DNS for non-IP hostnames and verifies every returned address is public,
 * mitigating DNS rebinding and internal hostname aliases before outbound fetches.
 */
export async function validateUrlForFetchResolved(urlStr: string): Promise<UrlValidationResult> {
  const staticCheck = validateUrlForFetch(urlStr);
  if (!staticCheck.valid) return staticCheck;

  const parsed = new URL(urlStr);
  const unbracketedHost = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIP(unbracketedHost) !== 0) {
    return staticCheck;
  }

  try {
    const records = await dns.lookup(unbracketedHost, { all: true });
    if (records.length === 0) {
      return { valid: false, reason: `Could not resolve host "${unbracketedHost}".` };
    }
    for (const record of records) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        return { valid: false, reason: `Resolved IP "${record.address}" is within a private or reserved network.` };
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        return { valid: false, reason: `Resolved IPv6 "${record.address}" is within a private or reserved range.` };
      }
    }
  } catch {
    return { valid: false, reason: `DNS resolution failed for "${unbracketedHost}".` };
  }

  return { valid: true };
}
