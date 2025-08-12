import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getUserFromCookies } from '$lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
  // Get user from cookies
  event.locals.user = getUserFromCookies(event.cookies);
  
  // Protected routes - require authentication
  const protectedPaths = ['/admin', '/schema-builder', '/map'];
  const isProtectedPath = protectedPaths.some(path => event.url.pathname.startsWith(path));
  
  if (isProtectedPath && !event.locals.user) {
    // Redirect to login if not authenticated
    throw redirect(302, '/login');
  }
  
  return resolve(event);
};