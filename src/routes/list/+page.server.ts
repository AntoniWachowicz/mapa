import { getTemplate, getObjects } from '$lib/server/schemadb.js';

export async function load({ locals }: { locals: App.Locals }) {
  if (!locals.user) return { user: null, template: null, objects: [] };

  const tenantId = locals.user.tenantId!;
  try {
    const [template, objects] = await Promise.all([getTemplate(tenantId), getObjects(tenantId)]);
    return { user: locals.user, template, objects };
  } catch (error) {
    console.error('Error loading data:', error);
    return { user: locals.user, template: null, objects: [] };
  }
}
