import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateObject, deleteObject, getObjectById, getTemplate } from '$lib/server/schemadb.js';
import { sanitizeHTML } from '$lib/utils/sanitize.js';
import { logAudit, getClientInfo } from '$lib/server/audit.js';
import type { ProjectData, Template } from '$lib/types.js';

function sanitizeObjectData(data: ProjectData, template: Template): ProjectData {
  const sanitized = { ...data };
  for (const field of template.fields) {
    const fieldType = field.fieldType || field.type;
    const fieldKey = field.key || field.fieldName;
    if (fieldType === 'richtext' && typeof sanitized[fieldKey] === 'string') {
      sanitized[fieldKey] = sanitizeHTML(sanitized[fieldKey] as string);
    }
  }
  return sanitized;
}

export const PUT: RequestHandler = async (event) => {
  const tenantId = event.locals.user!.tenantId!;
  try {
    const { data, location } = await event.request.json();
    const { id } = event.params;
    if (!data || !id) return json({ success: false, error: 'No data or ID provided' }, { status: 400 });

    const template = await getTemplate(tenantId);
    const sanitizedData = sanitizeObjectData(data, template);
    const updatedObject = await updateObject(tenantId, id, sanitizedData, location);
    if (!updatedObject) return json({ success: false, error: 'Object not found' }, { status: 404 });

    await logAudit({ action: 'object_update', ...getClientInfo(event), resourceType: 'object', resourceId: id, success: true });
    return json({ success: true, object: updatedObject });
  } catch (error) {
    console.error('Error updating object:', error);
    return json({ success: false, error: 'Failed to update object' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async (event) => {
  const tenantId = event.locals.user!.tenantId!;
  try {
    const body = await event.request.json();
    const { id } = event.params;
    if (!id) return json({ success: false, error: 'No ID provided' }, { status: 400 });

    const currentObject = await getObjectById(tenantId, id);
    if (!currentObject) return json({ success: false, error: 'Object not found' }, { status: 404 });

    if (body.location) {
      const { location, clearIncomplete } = body;
      const { connectToDatabase } = await import('$lib/server/database.js');
      const { ObjectId } = await import('mongodb');
      const db = await connectToDatabase();

      const updateFields: Record<string, unknown> = { location };
      if (clearIncomplete) { updateFields.hasIncompleteData = false; updateFields.missingFields = []; }

      // tenantId in filter scopes the update to this tenant's documents only
      await db.collection('objects').updateOne({ _id: new ObjectId(id), tenantId }, { $set: updateFields });

      return json({
        success: true,
        object: {
          ...currentObject,
          location,
          hasIncompleteData: clearIncomplete ? false : currentObject.hasIncompleteData,
          missingFields: clearIncomplete ? [] : currentObject.missingFields
        }
      });
    }

    const { fieldKey, value } = body;
    if (!fieldKey) return json({ success: false, error: 'No fieldKey provided' }, { status: 400 });

    const template = await getTemplate(tenantId);
    const field = template.fields.find(f => (f.key || f.fieldName) === fieldKey);
    const fieldType = field?.fieldType || field?.type;
    const sanitizedValue = (fieldType === 'richtext' && typeof value === 'string') ? sanitizeHTML(value) : value;

    const updatedObject = await updateObject(tenantId, id, { ...currentObject.data, [fieldKey]: sanitizedValue });
    if (!updatedObject) return json({ success: false, error: 'Failed to update object' }, { status: 500 });

    return json({ success: true, object: updatedObject });
  } catch (error) {
    console.error('Error updating object field:', error);
    return json({ success: false, error: 'Failed to update object field' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  const tenantId = event.locals.user!.tenantId!;
  try {
    const { id } = event.params;
    if (!id) return json({ success: false, error: 'No ID provided' }, { status: 400 });

    const success = await deleteObject(tenantId, id);
    if (!success) return json({ success: false, error: 'Object not found' }, { status: 404 });

    await logAudit({ action: 'object_delete', ...getClientInfo(event), resourceType: 'object', resourceId: id, success: true });
    return json({ success: true });
  } catch (error) {
    console.error('Error deleting object:', error);
    return json({ success: false, error: 'Failed to delete object' }, { status: 500 });
  }
};
