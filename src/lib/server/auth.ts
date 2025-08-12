import { AUTH_USERNAME, AUTH_PASSWORD, AUTH_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';
import type { Cookies } from '@sveltejs/kit';

export interface User {
  username: string;
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