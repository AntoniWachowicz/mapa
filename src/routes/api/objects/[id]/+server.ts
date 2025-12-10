import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateObject, deleteObject, getObjectById } from '$lib/server/schemadb.js';

export const PUT: RequestHandler = async ({ request, params }) => {
	try {
		const { data, location } = await request.json();
		const { id } = params;

		if (!data || !id) {
			return json({ success: false, error: 'No data or ID provided' }, { status: 400 });
		}

		const updatedObject = await updateObject(id, data, location);

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