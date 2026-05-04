import type { NextRequest } from 'next/server';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failuresByIp = new Map<string, number[]>();

function pruneAndGet(ip: string, now: number): number[] {
  const arr = (failuresByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length === 0) {
    failuresByIp.delete(ip);
  } else {
    failuresByIp.set(ip, arr);
  }
  return arr;
}

export const RATE_LIMIT_MESSAGE =
  'Too many login attempts. Please wait 15 minutes and try again.';

export function checkLoginRateLimit(ip: string): { limited: boolean } {
  const arr = pruneAndGet(ip, Date.now());
  return { limited: arr.length >= MAX_FAILURES };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const arr = pruneAndGet(ip, now);
  arr.push(now);
  failuresByIp.set(ip, arr);
}

export function clearLoginFailures(ip: string): void {
  failuresByIp.delete(ip);
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
