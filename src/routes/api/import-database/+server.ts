import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/server/database.js';
import { logAudit, getClientInfo } from '$lib/server/audit.js';

interface ImportData {
  version: string;
  template: { fields: unknown[]; tags: unknown[]; [key: string]: unknown };
  objects: Array<{ _id?: string; [key: string]: unknown }>;
}

// Import a JSON backup into the current tenant's data. Replaces all existing
// objects and template for this tenant only — other tenants are unaffected.
export const POST: RequestHandler = async (event) => {
  const tenantId = event.locals.user!.tenantId!;
  try {
    const importData: ImportData = await event.request.json();

    if (!importData.version || !importData.template || !Array.isArray(importData.objects)) {
      return json({ success: false, error: 'Invalid backup format' }, { status: 400 });
    }
    if (!Array.isArray(importData.template.fields) || !Array.isArray(importData.template.tags)) {
      return json({ success: false, error: 'Invalid template structure' }, { status: 400 });
    }

    const db = await connectToDatabase();

    await db.collection('settings').updateOne(
      { type: 'template', tenantId },
      { $set: { ...importData.template, type: 'template', tenantId } },
      { upsert: true }
    );

    // Delete only this tenant's objects, then re-insert with tenantId stamped on each
    await db.collection('objects').deleteMany({ tenantId });
    if (importData.objects.length > 0) {
      const toInsert = importData.objects.map(({ _id, ...rest }) => ({ ...rest, tenantId }));
      await db.collection('objects').insertMany(toInsert);
    }

    await logAudit({
      action: 'database_reset', ...getClientInfo(event),
      details: { type: 'import', objectCount: importData.objects.length, fieldCount: importData.template.fields.length, tagCount: importData.template.tags.length, version: importData.version },
      success: true
    });

    return json({ success: true, imported: { objects: importData.objects.length, fields: importData.template.fields.length, tags: importData.template.tags.length } });
  } catch (error) {
    console.error('Import error:', error);
    await logAudit({ action: 'database_reset', ...getClientInfo(event), details: { type: 'import', error: String(error) }, success: false }).catch(() => {});
    return json({ success: false, error: 'Failed to import database' }, { status: 500 });
  }
};
