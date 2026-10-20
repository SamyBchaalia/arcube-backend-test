import { Request } from 'express';

/**
 * Real client IP behind the reverse proxy.
 * Prefers the first address in X-Forwarded-For, then X-Real-IP, then Express's
 * own req.ip (which honours `trust proxy` when it is enabled in main.ts).
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedValue) {
    const first = forwardedValue.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const realIp = request.headers['x-real-ip'];
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;
  if (realIpValue?.trim()) return normalizeIp(realIpValue.trim());

  return request.ip ? normalizeIp(request.ip) : undefined;
}

/** Strip the IPv4-mapped IPv6 prefix Node reports for IPv4 clients (::ffff:1.2.3.4). */
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.substring(7) : ip;
}
