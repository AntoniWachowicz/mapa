import { getTemplate, getObjects } from '$lib/server/schemadb.js';

export async function load({ locals }: { locals: App.Locals }) {
  if (!locals.user) {
    return {
      user: null,
      template: null,
      objects: []
    };
  }

  try {
    const template = await getTemplate();
    const objects = await getObjects();

    return {
      user: locals.user,
      template,
      objects
    };
  } catch (error) {
    console.error('Error loading data:', error);
    return {
      user: locals.user,
      template: null,
      objects: []
    };
  }
}