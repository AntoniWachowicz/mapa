import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

interface TileGenerationOptions {
	imagePath: string;
	outputDir: string;
	bounds: {
		swLat: number;
		swLng: number;
		neLat: number;
		neLng: number;
	};
	minZoom: number;
	maxZoom: number;
}

// Convert lat/lng to tile coordinates at a given zoom level
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
	const n = Math.pow(2, zoom);
	const xTile = Math.floor(((lng + 180) / 360) * n);
	const latRad = (lat * Math.PI) / 180;
	const yTile = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
	return { x: xTile, y: yTile };
}

// Convert tile coordinates to lat/lng (NW corner of tile)
function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
	const n = Math.pow(2, zoom);
	const lng = (x / n) * 360 - 180;
	const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
	const lat = (latRad * 180) / Math.PI;
	return { lat, lng };
}

// Convert lat/lng to pixel coordinates within a tile at a given zoom level
function latLngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
	const n = Math.pow(2, zoom);
	const latRad = (lat * Math.PI) / 180;

	const x = ((lng + 180) / 360) * n * 256;
	const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;

	return { x, y };
}

// Generate tiles for all zoom levels
export async function generateTiles(options: TileGenerationOptions): Promise<void> {
	const { imagePath, outputDir, bounds, minZoom, maxZoom } = options;

	console.log(`Loading source image: ${imagePath}`);
	const sourceImage = sharp(imagePath);
	const metadata = await sourceImage.metadata();

	if (!metadata.width || !metadata.height) {
		throw new Error('Could not determine image dimensions');
	}

	console.log(`Source image: ${metadata.width}x${metadata.height}`);

	// Calculate image bounds in pixels at max zoom
	const swPixel = latLngToPixel(bounds.swLat, bounds.swLng, maxZoom);
	const nePixel = latLngToPixel(bounds.neLat, bounds.neLng, maxZoom);

	const imageWidthPx = Math.abs(nePixel.x - swPixel.x);
	const imageHeightPx = Math.abs(nePixel.y - swPixel.y);

	console.log(`Image should cover ${imageWidthPx}x${imageHeightPx} pixels at zoom ${maxZoom}`);

	// Resize source image to exact pixel dimensions at max zoom for best quality
	console.log(`Resizing source to ${Math.round(imageWidthPx)}x${Math.round(imageHeightPx)}`);
	const maxZoomImage = await sourceImage
		.resize(Math.round(imageWidthPx), Math.round(imageHeightPx), {
			fit: 'fill',
			kernel: 'lanczos3' // Best quality resampling
		})
		.toBuffer();

	// Get tile bounds at max zoom
	const swTile = latLngToTile(bounds.swLat, bounds.swLng, maxZoom);
	const neTile = latLngToTile(bounds.neLat, bounds.neLng, maxZoom);

	const minTileX = Math.min(swTile.x, neTile.x);
	const maxTileX = Math.max(swTile.x, neTile.x);
	const minTileY = Math.min(swTile.y, neTile.y);
	const maxTileY = Math.max(swTile.y, neTile.y);

	console.log(`Tile range at zoom ${maxZoom}: X[${minTileX}-${maxTileX}], Y[${minTileY}-${maxTileY}]`);

	// Generate tiles for each zoom level from max down to min
	for (let zoom = maxZoom; zoom >= minZoom; zoom--) {
		console.log(`\nGenerating tiles for zoom level ${zoom}...`);

		const zoomFactor = Math.pow(2, maxZoom - zoom);

		// Calculate scaled image size for this zoom level
		const scaledWidth = Math.round(imageWidthPx / zoomFactor);
		const scaledHeight = Math.round(imageHeightPx / zoomFactor);

		// Resize image for this zoom level
		const zoomImage = await sharp(maxZoomImage)
			.resize(scaledWidth, scaledHeight, {
				fit: 'fill',
				kernel: 'lanczos3'
			})
			.toBuffer();

		// Get tile coordinates at this zoom level
		const swTileZoom = latLngToTile(bounds.swLat, bounds.swLng, zoom);
		const neTileZoom = latLngToTile(bounds.neLat, bounds.neLng, zoom);

		const minTileXZoom = Math.min(swTileZoom.x, neTileZoom.x);
		const maxTileXZoom = Math.max(swTileZoom.x, neTileZoom.x);
		const minTileYZoom = Math.min(swTileZoom.y, neTileZoom.y);
		const maxTileYZoom = Math.max(swTileZoom.y, neTileZoom.y);

		// Get pixel coordinates of bounds at this zoom
		const swPx = latLngToPixel(bounds.swLat, bounds.swLng, zoom);
		const nePx = latLngToPixel(bounds.neLat, bounds.neLng, zoom);

		let tilesGenerated = 0;

		// Generate each tile
		for (let tileX = minTileXZoom; tileX <= maxTileXZoom; tileX++) {
			for (let tileY = minTileYZoom; tileY <= maxTileYZoom; tileY++) {
				try {
					// Get pixel coordinates of this tile's corners
					const tileNW = latLngToPixel(
						tileToLatLng(tileX, tileY, zoom).lat,
						tileToLatLng(tileX, tileY, zoom).lng,
						zoom
					);
					const tileSE = latLngToPixel(
						tileToLatLng(tileX + 1, tileY + 1, zoom).lat,
						tileToLatLng(tileX + 1, tileY + 1, zoom).lng,
						zoom
					);

					// Calculate overlap between tile and our image bounds
					const overlapLeft = Math.max(tileNW.x, Math.min(swPx.x, nePx.x));
					const overlapTop = Math.max(tileNW.y, Math.min(swPx.y, nePx.y));
					const overlapRight = Math.min(tileSE.x, Math.max(swPx.x, nePx.x));
					const overlapBottom = Math.min(tileSE.y, Math.max(swPx.y, nePx.y));

					// Skip if no overlap
					if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
						continue;
					}

					// Calculate position within the tile (0-256)
					const tileOffsetX = Math.round(overlapLeft - tileNW.x);
					const tileOffsetY = Math.round(overlapTop - tileNW.y);

					// Calculate position within our source image
					const imageOffsetX = Math.round(overlapLeft - Math.min(swPx.x, nePx.x));
					const imageOffsetY = Math.round(overlapTop - Math.min(swPx.y, nePx.y));

					// Calculate dimensions
					const width = Math.min(
						Math.round(overlapRight - overlapLeft),
						scaledWidth - imageOffsetX,
						256 - tileOffsetX
					);
					const height = Math.min(
						Math.round(overlapBottom - overlapTop),
						scaledHeight - imageOffsetY,
						256 - tileOffsetY
					);

					if (width <= 0 || height <= 0) continue;

					// Extract region from source image
					const extractedRegion = await sharp(zoomImage)
						.extract({
							left: Math.max(0, imageOffsetX),
							top: Math.max(0, imageOffsetY),
							width: Math.min(width, scaledWidth - imageOffsetX),
							height: Math.min(height, scaledHeight - imageOffsetY)
						})
						.toBuffer();

					// Create transparent tile canvas
					const tileCanvas = sharp({
						create: {
							width: 256,
							height: 256,
							channels: 4,
							background: { r: 0, g: 0, b: 0, alpha: 0 }
						}
					});

					// Composite extracted region onto tile
					const tileDir = path.join(outputDir, zoom.toString(), tileX.toString());
					await fs.mkdir(tileDir, { recursive: true });
					const tilePath = path.join(tileDir, `${tileY}.webp`);

					await tileCanvas
						.composite([
							{
								input: extractedRegion,
								top: Math.max(0, tileOffsetY),
								left: Math.max(0, tileOffsetX)
							}
						])
						.png({ compressionLevel: 6 }) // Use PNG instead of WebP for no quality loss
						.toFile(tilePath.replace('.webp', '.png'));

					tilesGenerated++;
				} catch (error) {
					console.error(`Failed to generate tile ${zoom}/${tileX}/${tileY}:`, error);
				}
			}
		}

		console.log(`Generated ${tilesGenerated} tiles for zoom ${zoom}`);
	}

	console.log(`\nTile generation complete!`);
}
