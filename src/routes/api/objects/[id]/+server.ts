import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateObject, deleteObject, getObjectById } from '$lib/server/schemadb.js';

export const PUT: RequestHandler = async ({ request, params }) => {
	try {
		const { data } = await request.json();
		const { id } = params;

		if (!data || !id) {
			return json({ success: false, error: 'No data or ID provided' }, { status: 400 });
		}

		const updatedObject = await updateObject(id, data);

		if (!updatedObject) {
			return json({ success: false, error: 'Object not found' }, { status: 404 });
		}

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
		const { fieldKey, value } = await request.json();
		const { id } = params;

		if (!fieldKey || !id) {
			return json({ success: false, error: 'No fieldKey or ID provided' }, { status: 400 });
		}

		// Get the current object
		const currentObject = await getObjectById(id);

		if (!currentObject) {
			return json({ success: false, error: 'Object not found' }, { status: 404 });
		}

		// Update only the specific field
		const updatedData = {
			...currentObject.data,
			[fieldKey]: value
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

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		if (!id) {
			return json({ success: false, error: 'No ID provided' }, { status: 400 });
		}

		const success = await deleteObject(id);

		if (!success) {
			return json({ success: false, error: 'Object not found' }, { status: 404 });
		}

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