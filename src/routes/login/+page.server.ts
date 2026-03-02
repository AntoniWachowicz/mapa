import { redirect, fail } from '@sveltejs/kit';
import { validateUser, setAuthCookie, checkRateLimit, recordFailedAttempt, clearRateLimit } from '$lib/server/auth.js';
import { logAudit } from '$lib/server/audit.js';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: { locals: App.Locals }) {
  if (locals.user) throw redirect(302, '/admin');
  return {};
}

export const actions = {
  login: async ({ request, cookies, getClientAddress }: RequestEvent) => {
    const clientIp = getClientAddress();

    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return fail(429, { error: `Za dużo prób logowania. Spróbuj ponownie za ${rateCheck.retryAfter} sekund.` });
    }

    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return fail(400, { error: 'Email i hasło są wymagane' });
    }

    const user = await validateUser(email, password);

    if (!user) {
      const result = recordFailedAttempt(clientIp);
      await logAudit({ action: 'login_failure', ip: clientIp, details: { email }, success: false });
      if (result.blocked) {
        return fail(429, { error: `Za dużo prób logowania. Spróbuj ponownie za ${result.retryAfter} sekund.` });
      }
      return fail(400, { error: 'Nieprawidłowy email lub hasło' });
    }

    clearRateLimit(clientIp);
    await logAudit({ action: 'login_success', ip: clientIp, userId: user.userId, success: true });
    setAuthCookie(cookies, user);
    throw redirect(302, '/admin');
  }
};
