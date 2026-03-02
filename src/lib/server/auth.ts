import { AUTH_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';
import type { Cookies } from '@sveltejs/kit';
import type { AuthUser } from '../types.js';
import { validateUser } from './userdb.js';

if (!AUTH_SECRET) throw new Error('AUTH_SECRET environment variable is required');
if (AUTH_SECRET.length < 32) console.warn('[Auth] AUTH_SECRET should be at least 32 characters');

// Re-export validateUser so callers only need to import from auth.ts
export { validateUser };

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory store; resets on server restart. Sufficient for single-instance deployments.

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry { attempts: number; firstAttempt: number; blocked: boolean; blockedUntil: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of rateLimitStore) {
    if (e.blockedUntil < now && now - e.firstAttempt > RATE_LIMIT_WINDOW) rateLimitStore.delete(ip);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const e = rateLimitStore.get(ip);
  if (!e) return { allowed: true };
  if (e.blocked) {
    if (now >= e.blockedUntil) { rateLimitStore.delete(ip); return { allowed: true }; }
    return { allowed: false, retryAfter: Math.ceil((e.blockedUntil - now) / 1000) };
  }
  if (now - e.firstAttempt > RATE_LIMIT_WINDOW) { rateLimitStore.delete(ip); return { allowed: true }; }
  return { allowed: true };
}

export function recordFailedAttempt(ip: string): { blocked: boolean; retryAfter?: number } {
  const now = Date.now();
  let e = rateLimitStore.get(ip);
  if (!e) { e = { attempts: 1, firstAttempt: now, blocked: false, blockedUntil: 0 }; rateLimitStore.set(ip, e); return { blocked: false }; }
  if (now - e.firstAttempt > RATE_LIMIT_WINDOW) { e.attempts = 1; e.firstAttempt = now; e.blocked = false; e.blockedUntil = 0; return { blocked: false }; }
  e.attempts++;
  if (e.attempts >= RATE_LIMIT_MAX) {
    e.blocked = true; e.blockedUntil = now + RATE_LIMIT_WINDOW;
    return { blocked: true, retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) };
  }
  return { blocked: false };
}

export function clearRateLimit(ip: string): void { rateLimitStore.delete(ip); }

// ─── JWT ──────────────────────────────────────────────────────────────────────
// Payload carries userId, tenantId, role, email so every request has full
// identity without a DB lookup on every page load.

export function createAuthToken(user: AuthUser): string {
  return jwt.sign(user, AUTH_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, AUTH_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthCookie(cookies: Cookies, user: AuthUser): void {
  cookies.set('auth_token', createAuthToken(user), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAuthCookie(cookies: Cookies): void {
  cookies.delete('auth_token', { path: '/' });
}

export function getUserFromCookies(cookies: Cookies): AuthUser | null {
  const token = cookies.get('auth_token');
  if (!token) return null;
  return verifyAuthToken(token);
}
