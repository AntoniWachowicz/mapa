import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';
import { getUserFromCookies } from '$lib/server/auth.js';
import { createLogger } from '$lib/server/logger.js';

const log = createLogger('hooks');

export const handleError: HandleServerError = ({ error: err, event, status, message }) => {
  // Log the error server-side
  log.error(`Request failed: ${event.url.pathname}`, err instanceof Error ? err : undefined, { status, path: event.url.pathname });

  // Return user-friendly error message
  // In production, hide internal error details
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    message: isDev && err instanceof Error ? err.message : message
  };
};

// Public API endpoints that don't require authentication
const PUBLIC_API_ENDPOINTS = [
  '/api/geocode',  // Read-only geocoding
  '/api/embed',    // Read-only embed metadata
  '/api/health'    // Health check endpoint
];

export const handle: Handle = async ({ event, resolve }) => {
  // HTTPS enforcement (production only)
  if (process.env.NODE_ENV === 'production') {
    const proto = event.request.headers.get('x-forwarded-proto') || event.url.protocol.replace(':', '');
    if (proto === 'http') {
      const httpsUrl = event.url.href.replace('http://', 'https://');
      throw redirect(301, httpsUrl);
    }
  }

  // Get user from cookies
  event.locals.user = getUserFromCookies(event.cookies);

  const pathname = event.url.pathname;

  // Protected page routes - require authentication, redirect to login
  const protectedPagePaths = ['/admin', '/schema-builder', '/map', '/addPin'];
  const isProtectedPage = protectedPagePaths.some(path => pathname.startsWith(path));

  if (isProtectedPage && !event.locals.user) {
    throw redirect(302, '/login');
  }

  // Protected API routes - require authentication, return 401
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicApi = PUBLIC_API_ENDPOINTS.some(path => pathname.startsWith(path));

  if (isApiRoute && !isPublicApi && !event.locals.user) {
    throw error(401, 'Unauthorized');
  }

  // Resolve the request
  const response = await resolve(event);

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // X-XSS-Protection is deprecated but still useful for older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",  // Svelte needs inline scripts
    "style-src 'self' 'unsafe-inline'",   // Svelte needs inline styles
    "img-src 'self' data: https://*.tile.openstreetmap.org https://*.openstreetmap.org blob:",
    "font-src 'self'",
    "connect-src 'self' https://nominatim.openstreetmap.org",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));

  // HSTS - force HTTPS for 1 year (production only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
};