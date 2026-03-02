import { json } from '@sveltejs/kit';
import { getMigrationPreview, migrateFieldToSelection } from '$lib/server/schemadb.js';
import { isValidFieldKey } from '$lib/server/validation.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  const tenantId = event.locals.user!.tenantId!;
  try {
    const fieldKey = event.url.searchParams.get('fieldKey');
    if (!fieldKey || !isValidFieldKey(fieldKey)) {
      return json({ success: false, error: 'Invalid field key' }, { status: 400 });
    }
    const preview = await getMigrationPreview(tenantId, fieldKey);
    if (!preview) return json({ success: false, error: 'Field not found or not a legacy type' }, { status: 404 });
    return json({ success: true, preview });
  } catch (error) {
    console.error('Migration preview error:', error);
    return json({ success: false, error: 'Failed to get migration preview' }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  const tenantId = event.locals.user!.tenantId!;
  try {
    const { fieldKey } = await event.request.json();
    if (!fieldKey || !isValidFieldKey(fieldKey)) {
      return json({ success: false, error: 'Invalid field key' }, { status: 400 });
    }
    const result = await migrateFieldToSelection(tenantId, fieldKey);
    if (!result.success) return json({ success: false, error: result.error }, { status: 400 });
    return json({ success: true, migratedPins: result.migratedPins, removedTags: result.removedTags });
  } catch (error) {
    console.error('Migration error:', error);
    return json({ success: false, error: 'Failed to migrate field' }, { status: 500 });
  }
};
