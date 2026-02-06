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
    // Load template and objects in parallel for faster page loads
    const [template, objects] = await Promise.all([
      getTemplate(),
      getObjects()
    ]);

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