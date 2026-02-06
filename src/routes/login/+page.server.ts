import { redirect, fail } from '@sveltejs/kit';
import { validateCredentials, setAuthCookie, checkRateLimit, recordFailedAttempt, clearRateLimit } from '$lib/server/auth.js';
import { logAudit } from '$lib/server/audit.js';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: { locals: App.Locals }) {
  // If already logged in, redirect to admin
  if (locals.user) {
    throw redirect(302, '/admin');
  }

  return {};
}

export const actions = {
  login: async ({ request, cookies, getClientAddress }: RequestEvent) => {
    const clientIp = getClientAddress();

    // Check rate limit before processing
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return fail(429, {
        error: `Too many login attempts. Please try again in ${rateCheck.retryAfter} seconds.`
      });
    }

    const data = await request.formData();
    const username = data.get('username');
    const password = data.get('password');

    if (typeof username !== 'string' || typeof password !== 'string') {
      return fail(400, { error: 'Username and password are required' });
    }

    if (!username || !password) {
      return fail(400, { error: 'Username and password are required' });
    }

    if (!validateCredentials(username, password)) {
      // Record failed attempt and check if now blocked
      const result = recordFailedAttempt(clientIp);

      // Log failed login attempt
      await logAudit({
        action: 'login_failure',
        ip: clientIp,
        details: { username },
        success: false
      });

      if (result.blocked) {
        return fail(429, {
          error: `Too many login attempts. Please try again in ${result.retryAfter} seconds.`
        });
      }
      return fail(400, { error: 'Invalid username or password' });
    }

    // Clear rate limit on successful login
    clearRateLimit(clientIp);

    // Log successful login
    await logAudit({
      action: 'login_success',
      ip: clientIp,
      userId: username,
      success: true
    });

    // Set authentication cookie
    setAuthCookie(cookies, username);

    throw redirect(302, '/admin');
  }
};
