import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createObject, getObjects, getTemplate } from '$lib/server/schemadb.js';
import { sanitizeHTML } from '$lib/utils/sanitize.js';
import { logAudit, getClientInfo } from '$lib/server/audit.js';
import type { ProjectData, Template } from '$lib/types.js';

/**
 * Sanitize richtext fields in object data before saving
 */
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

export const GET: RequestHandler = async () => {
	try {
		const objects = await getObjects();
		return json({ objects });
	} catch (error) {
		console.error('Error fetching objects:', error);
		return json({ objects: [], error: 'Failed to fetch objects' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		const { location, data, hasIncompleteData, missingFields } = await event.request.json();

		// Data is required, but location can be null for incomplete imports
		if (!data) {
			return json({ success: false, error: 'Data is required' }, { status: 400 });
		}

		// Sanitize richtext fields before saving
		const template = await getTemplate();
		const sanitizedData = sanitizeObjectData(data, template);

		const savedObject = await createObject(location || null, sanitizedData, hasIncompleteData, missingFields);

		// Audit log
		await logAudit({
			action: 'object_create',
			...getClientInfo(event),
			resourceType: 'object',
			resourceId: savedObject.id,
			success: true
		});

		return json({
			success: true,
			object: savedObject
		});
	} catch (error) {
		console.error('Error creating object:', error);
		return json(
			{ success: false, error: 'Failed to create object' },
			{ status: 500 }
		);
	}
};