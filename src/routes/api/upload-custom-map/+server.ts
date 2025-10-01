import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMapConfig, updateMapConfig, getBreakpointZoom } from '$lib/server/mapconfig';
import { generateTiles } from '$lib/server/tile-generator';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		console.log('[Upload] Starting custom map upload process...');

		const formData = await request.formData();
		const file = formData.get('customMap') as File;

		if (!file) {
			console.error('[Upload] No file in form data');
			return json({ error: 'No file uploaded' }, { status: 400 });
		}

		console.log(`[Upload] Received file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

		// Validate file type
		if (!file.type.startsWith('image/')) {
			console.error(`[Upload] Invalid file type: ${file.type}`);
			return json({ error: 'File must be an image' }, { status: 400 });
		}

		// Check if running on Vercel (read-only filesystem)
		if (process.env.VERCEL) {
			console.log('[Upload] Running on Vercel - uploads not supported');
			return json({
				error: 'Custom map uploads are not supported on Vercel due to read-only filesystem. Please use a server with persistent storage or configure external storage (S3, etc).'
			}, { status: 501 });
		}

		// Get current map configuration
		console.log('[Upload] Fetching map configuration...');
		const config = await getMapConfig();
		const breakpointZoom = getBreakpointZoom(config);
		console.log(`[Upload] Breakpoint zoom: ${breakpointZoom}`);

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

		console.log(`[Upload] Creating directories: ${uploadDir}, ${tilesDir}`);

		// Ensure directories exist
		await fs.mkdir(uploadDir, { recursive: true });
		await fs.mkdir(tilesDir, { recursive: true });

		// Save original uploaded file
		const originalPath = path.join(uploadDir, `${mapId}.png`);
		console.log(`[Upload] Saving original file to: ${originalPath}`);
		const buffer = Buffer.from(await file.arrayBuffer());
		await fs.writeFile(originalPath, buffer);
		console.log(`[Upload] File saved successfully, size: ${buffer.length} bytes`);

		// Generate tile pyramid (from zoom 8 to breakpoint) with 5% margin
		console.log(`[Upload] Generating tiles for zoom levels 8-${breakpointZoom} with 5% margin...`);
		await generateTiles({
			imagePath: originalPath,
			outputDir: tilesDir,
			bounds: expandedBounds,
			minZoom: 8,
			maxZoom: breakpointZoom
		});
		console.log('[Upload] Tile generation completed successfully');

		// Update map config with custom tiles path
		const updatedConfig = {
			...config,
			customImageUrl: `/uploads/tiles/${mapId}/{z}/{x}/{y}.png`,
			maxCustomZoom: breakpointZoom
		};

		console.log('[Upload] Updating map configuration...');
		await updateMapConfig(updatedConfig);
		console.log('[Upload] Map configuration updated successfully');

		console.log('[Upload] Upload process completed successfully');
		return json({
			success: true,
			mapId,
			tilesPath: `/uploads/tiles/${mapId}`,
			breakpointZoom
		});
	} catch (error) {
		console.error('[Upload] ERROR during upload process:', error);
		console.error('[Upload] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to upload custom map' },
			{ status: 500 }
		);
	}
};
