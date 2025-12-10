import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createObject } from '$lib/server/schemadb.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { location, data, hasIncompleteData, missingFields } = await request.json();

		// Data is required, but location can be null for incomplete imports
		if (!data) {
			return json({ success: false, error: 'Data is required' }, { status: 400 });
		}

		const savedObject = await createObject(location || null, data, hasIncompleteData, missingFields);

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