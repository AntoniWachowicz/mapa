import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMapConfig, updateMapConfig, getBreakpointZoom } from '$lib/server/mapconfig';
import { generateTiles } from '$lib/server/tile-generator';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('customMap') as File;

		if (!file) {
			return json({ error: 'No file uploaded' }, { status: 400 });
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			return json({ error: 'File must be an image' }, { status: 400 });
		}

		// Get current map configuration
		const config = await getMapConfig();
		const breakpointZoom = getBreakpointZoom(config);

		// Add 5% margin on all sides to match template export
		const latRange = config.neLat - config.swLat;
		const lngRange = config.neLng - config.swLng;
		const marginLat = latRange * 0.05;
		const marginLng = lngRange * 0.05;

		const expandedBounds = {
			swLat: config.swLat - marginLat,
			swLng: config.swLng - marginLng,
			neLat: config.neLat + marginLat,
			neLng: config.neLng + marginLng
		};

		// Generate unique ID for this custom map
		const mapId = `custom-${Date.now()}`;
		const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'maps');
		const tilesDir = path.join(process.cwd(), 'static', 'uploads', 'tiles', mapId);

		// Ensure directories exist
		await fs.mkdir(uploadDir, { recursive: true });
		await fs.mkdir(tilesDir, { recursive: true });

		// Save original uploaded file
		const originalPath = path.join(uploadDir, `${mapId}.png`);
		const buffer = Buffer.from(await file.arrayBuffer());
		await fs.writeFile(originalPath, buffer);

		// Generate tile pyramid (from zoom 8 to breakpoint) with 5% margin
		console.log(`Generating tiles for zoom levels 8-${breakpointZoom} with 5% margin...`);
		await generateTiles({
			imagePath: originalPath,
			outputDir: tilesDir,
			bounds: expandedBounds,
			minZoom: 8,
			maxZoom: breakpointZoom
		});

		// Update map config with custom tiles path
		const updatedConfig = {
			...config,
			customImageUrl: `/uploads/tiles/${mapId}/{z}/{x}/{y}.png`,
			maxCustomZoom: breakpointZoom
		};

		await updateMapConfig(updatedConfig);

		return json({
			success: true,
			mapId,
			tilesPath: `/uploads/tiles/${mapId}`,
			breakpointZoom
		});
	} catch (error) {
		console.error('Error uploading custom map:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to upload custom map' },
			{ status: 500 }
		);
	}
};
