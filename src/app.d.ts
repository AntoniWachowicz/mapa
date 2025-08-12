import type { Template, SavedObject, MapConfig } from '$lib/types';

declare global {
  namespace App {
    interface Locals {
      user: {
        username: string;
      } | null;
    }
    interface PageData {
      user?: {
        username: string;
      } | null;
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
  export const AUTH_USERNAME: string;
  export const AUTH_PASSWORD: string;
  export const AUTH_SECRET: string;
}

export {};
