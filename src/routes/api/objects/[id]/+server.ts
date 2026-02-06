import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateObject, deleteObject, getObjectById, getTemplate } from '$lib/server/schemadb.js';
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

export const PUT: RequestHandler = async (event) => {
	try {
		const { data, location } = await event.request.json();
		const { id } = event.params;

		if (!data || !id) {
			return json({ success: false, error: 'No data or ID provided' }, { status: 400 });
		}

		// Sanitize richtext fields before saving
		const template = await getTemplate();
		const sanitizedData = sanitizeObjectData(data, template);

		const updatedObject = await updateObject(id, sanitizedData, location);

		if (!updatedObject) {
			return json({ success: false, error: 'Object not found' }, { status: 404 });
		}

		// Audit log
		await logAudit({
			action: 'object_update',
			...getClientInfo(event),
			resourceType: 'object',
			resourceId: id,
			success: true
		});

		return json({
			success: true,
			object: updatedObject
		});
	} catch (error) {
		console.error('Error updating object:', error);
		return json(
			{ success: false, error: 'Failed to update object' },
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ request, params }) => {
	try {
		const body = await request.json();
		const { id } = params;

		if (!id) {
			return json({ success: false, error: 'No ID provided' }, { status: 400 });
		}

		// Get the current object
		const currentObject = await getObjectById(id);

		if (!currentObject) {
			return json({ success: false, error: 'Object not found' }, { status: 404 });
		}

		// Check if this is a location update
		if (body.location) {
			const { location, clearIncomplete } = body;

			// Update location directly in the database
			const { connectToDatabase } = await import('$lib/server/database.js');
			const { ObjectId } = await import('mongodb');

			const db = await connectToDatabase();
			const collection = db.collection('objects');

			const updateFields: any = { location };

			// Clear incomplete flags if requested
			if (clearIncomplete) {
				updateFields.hasIncompleteData = false;
				updateFields.missingFields = [];
			}

			await collection.updateOne(
				{ _id: new ObjectId(id) },
				{ $set: updateFields }
			);

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

		// Regular field update
		const { fieldKey, value } = body;

		if (!fieldKey) {
			return json({ success: false, error: 'No fieldKey provided' }, { status: 400 });
		}

		// Check if this is a richtext field and sanitize if needed
		const template = await getTemplate();
		const field = template.fields.find(f => (f.key || f.fieldName) === fieldKey);
		const fieldType = field?.fieldType || field?.type;
		const sanitizedValue = (fieldType === 'richtext' && typeof value === 'string')
			? sanitizeHTML(value)
			: value;

		// Update only the specific field
		const updatedData = {
			...currentObject.data,
			[fieldKey]: sanitizedValue
		};

		const updatedObject = await updateObject(id, updatedData);

		if (!updatedObject) {
			return json({ success: false, error: 'Failed to update object' }, { status: 500 });
		}

		return json({
			success: true,
			object: updatedObject
		});
	} catch (error) {
		console.error('Error updating object field:', error);
		return json(
			{ success: false, error: 'Failed to update object field' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async (event) => {
	try {
		const { id } = event.params;

		if (!id) {
			return json({ success: false, error: 'No ID provided' }, { status: 400 });
		}

		const success = await deleteObject(id);

		if (!success) {
			return json({ success: false, error: 'Object not found' }, { status: 404 });
		}

		// Audit log
		await logAudit({
			action: 'object_delete',
			...getClientInfo(event),
			resourceType: 'object',
			resourceId: id,
			success: true
		});

		return json({
			success: true
		});
	} catch (error) {
		console.error('Error deleting object:', error);
		return json(
			{ success: false, error: 'Failed to delete object' },
			{ status: 500 }
		);
	}
};