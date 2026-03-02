import type { Template, SavedObject, MapConfig, AuthUser } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user: AuthUser | null;
    }
    interface PageData {
      user?: AuthUser | null;
      template?: Template;
      objects?: SavedObject[];
      mapConfig?: MapConfig;
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }
}

declare module '$env/static/private' {
  export const MONGODB_URI: string;
  export const AUTH_SECRET: string;
  // AUTH_USERNAME / AUTH_PASSWORD removed — authentication is now database-driven
}

export {};
