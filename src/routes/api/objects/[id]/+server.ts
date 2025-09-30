import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateObject, deleteObject } from '$lib/server/schemadb.js';

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