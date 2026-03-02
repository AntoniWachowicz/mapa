import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
  getAllTenants,
  createTenantUser,
  setUserStatus,
  updateTenantMetadata,
  getTenantPinCounts
} from '$lib/server/userdb.js';

export const load: PageServerLoad = async () => {
  const [tenants, pinCounts] = await Promise.all([getAllTenants(), getTenantPinCounts()]);
  return { tenants, pinCounts };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const email = (data.get('email') as string)?.trim().toLowerCase();
    const companyName = (data.get('companyName') as string)?.trim();

    if (!email || !companyName) return fail(400, { error: 'Email i nazwa firmy są wymagane.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { error: 'Nieprawidłowy adres email.' });

    try {
      const { activationKey, tenantId } = await createTenantUser(email, companyName);
      return { created: true, email, companyName, tenantId, activationKey };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Błąd serwera';
      if (msg.includes('duplicate') || msg.includes('E11000')) return fail(409, { error: 'Konto z tym emailem już istnieje.' });
      return fail(500, { error: msg });
    }
  },

  setStatus: async ({ request }) => {
    const data = await request.formData();
    const userId = data.get('userId') as string;
    const status = data.get('status') as 'active' | 'suspended';

    if (!userId || !['active', 'suspended'].includes(status)) return fail(400, { error: 'Nieprawidłowe parametry.' });

    await setUserStatus(userId, status);
    return { updated: true };
  },

  updateMeta: async ({ request }) => {
    const data = await request.formData();
    const userId = data.get('userId') as string;
    const companyName = (data.get('companyName') as string)?.trim();
    const plan = (data.get('plan') as string)?.trim();
    const paidUntilRaw = data.get('paidUntil') as string;

    if (!userId) return fail(400, { error: 'Brak userId.' });

    const paidUntil = paidUntilRaw ? new Date(paidUntilRaw) : null;
    await updateTenantMetadata(userId, { companyName, plan, paidUntil });
    return { updated: true };
  }
};
