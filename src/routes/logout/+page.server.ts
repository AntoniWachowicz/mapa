import { redirect } from '@sveltejs/kit';
import { clearAuthCookie } from '$lib/server/auth.js';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ cookies }: { cookies: RequestEvent['cookies'] }) {
  clearAuthCookie(cookies);
  throw redirect(302, '/login');
}