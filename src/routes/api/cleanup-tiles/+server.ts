import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMapConfig } from '$lib/server/mapconfig';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async () => {
	try {
		// Get current map configuration
		const config = await getMapConfig();

		const uploadsDir = path.join(process.cwd(), 'static', 'uploads');
		const mapsDir = path.join(uploadsDir, 'maps');
		const tilesDir = path.join(uploadsDir, 'tiles');

		// Extract the current map ID from customImageUrl
		let currentMapId: string | null = null;
		if (config.customImageUrl) {
			const match = config.customImageUrl.match(/custom-\d+/);
			if (match) {
				currentMapId = match[0];
			}
		}

		console.log(`Current map ID in use: ${currentMapId || 'none'}`);

		// Get all map files
		let mapFiles: string[] = [];
		try {
			mapFiles = await fs.readdir(mapsDir);
		} catch (error) {
			console.log('Maps directory does not exist or is empty');
		}

		// Get all tile directories
		let tileDirs: string[] = [];
		try {
			tileDirs = await fs.readdir(tilesDir);
		} catch (error) {
			console.log('Tiles directory does not exist or is empty');
		}

		const deletedMaps: string[] = [];
		const deletedTiles: string[] = [];

		// Delete unused map files
		for (const mapFile of mapFiles) {
			const mapId = mapFile.replace('.png', '');
			if (mapId !== currentMapId) {
				const filePath = path.join(mapsDir, mapFile);
				await fs.unlink(filePath);
				deletedMaps.push(mapFile);
				console.log(`Deleted unused map file: ${mapFile}`);
			}
		}

		// Delete unused tile directories
		for (const tileDir of tileDirs) {
			if (tileDir !== currentMapId) {
				const dirPath = path.join(tilesDir, tileDir);
				await fs.rm(dirPath, { recursive: true, force: true });
				deletedTiles.push(tileDir);
				console.log(`Deleted unused tile directory: ${tileDir}`);
			}
		}

		return json({
			success: true,
			currentMapId,
			deletedMaps,
			deletedTiles,
			message: `Cleanup complete. Deleted ${deletedMaps.length} map files and ${deletedTiles.length} tile directories.`
		});
	} catch (error) {
		console.error('Error cleaning up tiles:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to cleanup tiles' },
			{ status: 500 }
		);
	}
};
