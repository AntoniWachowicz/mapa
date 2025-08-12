import { redirect, fail } from '@sveltejs/kit';
import { validateCredentials, setAuthCookie } from '$lib/server/auth.js';
import type { RequestEvent } from '@sveltejs/kit';

export async function load({ locals }: { locals: App.Locals }) {
  // If already logged in, redirect to admin
  if (locals.user) {
    throw redirect(302, '/admin');
  }
  
  return {};
}

export const actions = {
  login: async ({ request, cookies }: RequestEvent) => {
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
      return fail(400, { error: 'Invalid username or password' });
    }
    
    // Set authentication cookie
    setAuthCookie(cookies, username);
    
    throw redirect(302, '/admin');
  }
};
