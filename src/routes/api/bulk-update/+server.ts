import { json } from '@sveltejs/kit';
import { updateObject } from '$lib/server/schemadb.js';
import { isValidFieldKey, validateObjectIds } from '$lib/server/validation.js';
import { logAudit, getClientInfo } from '$lib/server/audit.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  const tenantId = event.locals.user!.tenantId!;
  try {
    const { objectIds, fieldKey, value } = await event.request.json();

    if (!objectIds || !Array.isArray(objectIds) || objectIds.length === 0) {
      return json({ success: false, error: 'No objects selected' }, { status: 400 });
    }
    if (!validateObjectIds(objectIds)) {
      return json({ success: false, error: 'Invalid object IDs' }, { status: 400 });
    }
    if (!fieldKey || !isValidFieldKey(fieldKey)) {
      return json({ success: false, error: 'Invalid field key' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      objectIds.map((id: string) => updateObject(tenantId, id, { [fieldKey]: value }))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) console.warn(`Bulk update: ${succeeded} succeeded, ${failed} failed`);

    await logAudit({
      action: 'bulk_update', ...getClientInfo(event),
      details: { objectCount: objectIds.length, fieldKey, succeeded, failed },
      success: failed === 0
    });

    return json({ success: failed === 0, count: succeeded, failed, total: objectIds.length });
  } catch (error) {
    console.error('Bulk update error:', error);
    return json({ success: false, error: 'Failed to update objects' }, { status: 500 });
  }
};
