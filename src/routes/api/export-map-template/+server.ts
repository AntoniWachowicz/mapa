import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMapConfig, getBreakpointZoom } from '$lib/server/mapconfig';
import sharp from 'sharp';

// OpenStreetMap tile server URL
const OSM_TILE_URL = 'https://tile.openstreetmap.org';

// Convert lat/lng to tile coordinates at a given zoom
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
	const n = Math.pow(2, zoom);
	const xTile = Math.floor(((lng + 180) / 360) * n);
	const latRad = (lat * Math.PI) / 180;
	const yTile = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
	return { x: xTile, y: yTile };
}

// Convert lat/lng to pixel coordinates at a given zoom level
function latLngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
	const n = Math.pow(2, zoom);
	const latRad = (lat * Math.PI) / 180;

	const x = ((lng + 180) / 360) * n * 256;
	const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;

	return { x, y };
}

// Function to download a tile from OSM
async function downloadTile(x: number, y: number, z: number): Promise<Buffer> {
	const url = `${OSM_TILE_URL}/${z}/${x}/${y}.png`;

	const response = await fetch(url, {
		headers: {
			'User-Agent': 'CustomMapApplication/1.0'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to download tile ${z}/${x}/${y}: ${response.statusText}`);
	}

	return Buffer.from(await response.arrayBuffer());
}

// Function to stitch tiles together into a single image
async function stitchTiles(
	tiles: { x: number; y: number; buffer: Buffer }[],
	minX: number,
	minY: number,
	maxX: number,
	maxY: number
): Promise<Buffer> {
	const tileSize = 256;
	const width = (maxX - minX + 1) * tileSize;
	const height = (maxY - minY + 1) * tileSize;

	// Create a blank canvas
	const canvas = sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 255, g: 255, b: 255, alpha: 1 }
		}
	});

	// Prepare composite operations for all tiles
	const compositeOperations = tiles.map((tile) => ({
		input: tile.buffer,
		left: (tile.x - minX) * tileSize,
		top: (tile.y - minY) * tileSize
	}));

	// Composite all tiles onto the canvas
	return await canvas.composite(compositeOperations).png().toBuffer();
}

export const POST: RequestHandler = async () => {
	try {
		// Note: Template export works on Vercel because it only downloads/processes in memory
		// Get current map configuration
		const config = await getMapConfig();

		// Calculate breakpoint zoom
		const breakpointZoom = getBreakpointZoom(config);

		// Export at higher resolution (breakpoint + 1) for better quality
		const exportZoom = Math.min(breakpointZoom + 1, 18); // Max zoom 18

		// Add 5% margin on all sides
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

		// Get exact pixel bounds at export zoom with margin
		const swPixel = latLngToPixel(expandedBounds.swLat, expandedBounds.swLng, exportZoom);
		const nePixel = latLngToPixel(expandedBounds.neLat, expandedBounds.neLng, exportZoom);

		const imageWidthPx = Math.abs(nePixel.x - swPixel.x);
		const imageHeightPx = Math.abs(nePixel.y - swPixel.y);

		console.log(`Exporting at zoom ${exportZoom} (breakpoint: ${breakpointZoom}) with 5% margin`);
		console.log(`Exact image dimensions: ${imageWidthPx}x${imageHeightPx} pixels at zoom ${exportZoom}`);

		// Get tile coordinates for the expanded boundary at export zoom
		const sw = latLngToTile(expandedBounds.swLat, expandedBounds.swLng, exportZoom);
		const ne = latLngToTile(expandedBounds.neLat, expandedBounds.neLng, exportZoom);

		// Determine tile range (inclusive)
		const minX = Math.min(sw.x, ne.x);
		const maxX = Math.max(sw.x, ne.x);
		const minY = Math.min(sw.y, ne.y);
		const maxY = Math.max(sw.y, ne.y);

		console.log(
			`Downloading tiles for zoom ${exportZoom}: X[${minX}-${maxX}], Y[${minY}-${maxY}]`
		);

		// Download all tiles
		const tiles: { x: number; y: number; buffer: Buffer }[] = [];
		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				try {
					const buffer = await downloadTile(x, y, exportZoom);
					tiles.push({ x, y, buffer });
				} catch (error) {
					console.error(`Failed to download tile ${x},${y}:`, error);
					// Continue with other tiles
				}
			}
		}

		if (tiles.length === 0) {
			return json({ error: 'Failed to download any tiles' }, { status: 500 });
		}

		// Stitch tiles together
		const stitchedImage = await stitchTiles(tiles, minX, minY, maxX, maxY);

		// Calculate crop region to get exact bounds
		// Pixel position of SW corner within the tile grid
		const tileGridPixelX = minX * 256;
		const tileGridPixelY = minY * 256;

		// Offset of our bounds within the tile grid
		const cropLeft = Math.round(Math.min(swPixel.x, nePixel.x) - tileGridPixelX);
		const cropTop = Math.round(Math.min(swPixel.y, nePixel.y) - tileGridPixelY);

		console.log(`Cropping to exact bounds: left=${cropLeft}, top=${cropTop}, width=${Math.round(imageWidthPx)}, height=${Math.round(imageHeightPx)}`);

		// Crop to exact bounds
		const croppedImage = await sharp(stitchedImage)
			.extract({
				left: cropLeft,
				top: cropTop,
				width: Math.round(imageWidthPx),
				height: Math.round(imageHeightPx)
			})
			.png()
			.toBuffer();

		// Return the image
		return new Response(croppedImage, {
			headers: {
				'Content-Type': 'image/png',
				'Content-Disposition': `attachment; filename="map-template-zoom${exportZoom}.png"`
			}
		});
	} catch (error) {
		console.error('Error exporting map template:', error);
		return json({ error: 'Failed to export map template' }, { status: 500 });
	}
};
