import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/server/database.js';
import { logAudit, getClientInfo } from '$lib/server/audit.js';

interface ImportData {
  version: string;
  template: {
    fields: unknown[];
    tags: unknown[];
    [key: string]: unknown;
  };
  objects: Array<{ _id?: string; [key: string]: unknown }>;
}

/**
 * Import database data from JSON backup
 */
export const POST: RequestHandler = async (event) => {
  try {
    const importData: ImportData = await event.request.json();

    // Validate structure
    if (!importData.version || !importData.template || !Array.isArray(importData.objects)) {
      return json({ success: false, error: 'Invalid backup format' }, { status: 400 });
    }

    // Validate template has required fields
    if (!Array.isArray(importData.template.fields) || !Array.isArray(importData.template.tags)) {
      return json({ success: false, error: 'Invalid template structure' }, { status: 400 });
    }

    const db = await connectToDatabase();

    // Replace template in settings
    await db.collection('settings').updateOne(
      { type: 'template' },
      { $set: { ...importData.template, type: 'template' } },
      { upsert: true }
    );

    // Clear and replace objects
    await db.collection('objects').deleteMany({});
    if (importData.objects.length > 0) {
      // Remove _id fields to let MongoDB generate new ones
      const objectsToInsert = importData.objects.map(({ _id, ...rest }) => rest);
      await db.collection('objects').insertMany(objectsToInsert);
    }

    // Audit log
    await logAudit({
      action: 'database_reset',
      ...getClientInfo(event),
      details: {
        type: 'import',
        objectCount: importData.objects.length,
        fieldCount: importData.template.fields.length,
        tagCount: importData.template.tags.length,
        version: importData.version
      },
      success: true
    });

    return json({
      success: true,
      imported: {
        objects: importData.objects.length,
        fields: importData.template.fields.length,
        tags: importData.template.tags.length
      }
    });
  } catch (error) {
    console.error('Import error:', error);

    // Log failed import attempt
    await logAudit({
      action: 'database_reset',
      ...getClientInfo(event),
      details: { type: 'import', error: String(error) },
      success: false
    }).catch(() => {});

    return json(
      { success: false, error: 'Failed to import database' },
      { status: 500 }
    );
  }
};
