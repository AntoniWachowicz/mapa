import type { PageServerLoad } from './$types';
import { getTenantById } from '$lib/server/userdb.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user!;
  const tenant = await getTenantById(user.userId);
  if (!tenant) throw error(500, 'Nie znaleziono konta.');
  return { tenant };
};
