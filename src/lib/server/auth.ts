import { AUTH_USERNAME, AUTH_PASSWORD, AUTH_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';
import type { Cookies } from '@sveltejs/kit';

// Validate environment variables at module load
if (!AUTH_USERNAME || !AUTH_PASSWORD || !AUTH_SECRET) {
  throw new Error('AUTH_USERNAME, AUTH_PASSWORD, and AUTH_SECRET environment variables are required');
}

if (AUTH_SECRET.length < 32) {
  console.warn('[Auth] Warning: AUTH_SECRET should be at least 32 characters for security');
}

export interface User {
  username: string;
}

// Rate limiting configuration
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blocked: boolean;
  blockedUntil: number;
}

// In-memory store for rate limiting (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.blockedUntil < now && now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    return { allowed: true };
  }

  // If blocked, check if block has expired
  if (entry.blocked) {
    if (now >= entry.blockedUntil) {
      rateLimitStore.delete(ip);
      return { allowed: true };
    }
    return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  // Reset if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): { blocked: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  if (!entry) {
    entry = { attempts: 1, firstAttempt: now, blocked: false, blockedUntil: 0 };
    rateLimitStore.set(ip, entry);
    return { blocked: false };
  }

  // Reset if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    entry.attempts = 1;
    entry.firstAttempt = now;
    entry.blocked = false;
    entry.blockedUntil = 0;
    return { blocked: false };
  }

  entry.attempts++;

  if (entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    entry.blocked = true;
    entry.blockedUntil = now + RATE_LIMIT_WINDOW_MS;
    return { blocked: true, retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }

  return { blocked: false };
}

export function clearRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

export function validateCredentials(username: string, password: string): boolean {
  return username === AUTH_USERNAME && password === AUTH_PASSWORD;
}

export function createAuthToken(username: string): string {
  return jwt.sign({ username }, AUTH_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as User;
    return decoded;
  } catch {
    return null;
  }
}

export function setAuthCookie(cookies: Cookies, username: string): void {
  const token = createAuthToken(username);
  cookies.set('auth_token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export function clearAuthCookie(cookies: Cookies): void {
  cookies.delete('auth_token', { path: '/' });
}

export function getUserFromCookies(cookies: Cookies): User | null {
  const token = cookies.get('auth_token');
  if (!token) return null;
  
  return verifyAuthToken(token);
}