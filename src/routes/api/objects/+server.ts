import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createObject } from '$lib/server/schemadb.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { data, hasIncompleteData } = await request.json();

		if (!data) {
			return json({ success: false, error: 'No data provided' }, { status: 400 });
		}

		const savedObject = await createObject(data, hasIncompleteData);

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