import { fail, redirect } from '@sveltejs/kit';
import { findPendingByKey, activateUser } from '$lib/server/userdb.js';

export async function load({ url }: { url: URL }) {
  const key = url.searchParams.get('key');
  if (!key) throw redirect(302, '/login');

  const user = await findPendingByKey(key);
  if (!user) throw redirect(302, '/login');

  // Pass key and user info to the page so the form can submit them
  return { userId: user.userId, email: user.email, key };
}

export const actions = {
  activate: async ({ request }: { request: Request }) => {
    const data = await request.formData();
    const userId = data.get('userId') as string;
    const key = data.get('key') as string;
    const password = data.get('password') as string;
    const confirm = data.get('confirm') as string;

    if (!userId || !key) return fail(400, { error: 'Nieprawidłowe dane aktywacji' });
    if (password !== confirm) return fail(400, { error: 'Hasła nie są identyczne' });
    if (password.length < 12) return fail(400, { error: 'Hasło musi mieć co najmniej 12 znaków' });

    // Re-verify the key is still valid (prevents replay if page was left open)
    const user = await findPendingByKey(key);
    if (!user || user.userId !== userId) return fail(400, { error: 'Klucz aktywacyjny wygasł lub jest nieprawidłowy' });

    await activateUser(userId, password);
    throw redirect(302, '/login?activated=1');
  }
};
