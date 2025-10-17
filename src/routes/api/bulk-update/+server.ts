import { json } from '@sveltejs/kit';
import { updateObject } from '$lib/server/schemadb.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { objectIds, fieldKey, value } = await request.json();

    if (!objectIds || !Array.isArray(objectIds) || objectIds.length === 0) {
      return json({ success: false, error: 'No objects selected' }, { status: 400 });
    }

    if (!fieldKey) {
      return json({ success: false, error: 'No field specified' }, { status: 400 });
    }

    // Update all objects
    const updatePromises = objectIds.map(async (id: string) => {
      // Get current object data and update only the specified field
      return updateObject(id, { [fieldKey]: value });
    });

    await Promise.all(updatePromises);

    return json({ success: true, count: objectIds.length });
  } catch (error) {
    console.error('Bulk update error:', error);
    return json({ success: false, error: 'Failed to update objects' }, { status: 500 });
  }
};
