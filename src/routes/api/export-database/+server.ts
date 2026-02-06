import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getObjects, getTemplate } from '$lib/server/schemadb.js';
import { logAudit, getClientInfo } from '$lib/server/audit.js';

/**
 * Export all database data as JSON for backup/migration
 */
export const GET: RequestHandler = async (event) => {
  try {
    const [objects, template] = await Promise.all([
      getObjects(),
      getTemplate()
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      template,
      objects,
      stats: {
        objectCount: objects.length,
        fieldCount: template.fields.length,
        tagCount: template.tags.length
      }
    };

    // Audit log
    await logAudit({
      action: 'database_reset', // Using existing action type for export
      ...getClientInfo(event),
      details: { type: 'export', objectCount: objects.length },
      success: true
    });

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mapa-backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return json(
      { success: false, error: 'Failed to export database' },
      { status: 500 }
    );
  }
};
