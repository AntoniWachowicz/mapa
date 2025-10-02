// src/lib/server/mapconfig.ts - NEW FILE
import { connectToDatabase } from './database.js';
import type { MapConfig, GeoJSON } from '../types.js';
import { ZYWIECKI_RAJ_BOUNDARY } from '../boundaries.js';

// Default map config - you can adjust these coordinates for your area
const DEFAULT_MAP_CONFIG: MapConfig = {
  swLat: 40.700,      // Southwest corner latitude
  swLng: -74.020,     // Southwest corner longitude
  neLat: 40.720,      // Northeast corner latitude
  neLng: -74.000,     // Northeast corner longitude
  defaultZoom: 12,    // Starting zoom level
  maxCustomZoom: 14,  // Above this zoom = show OSM tiles
  customImageUrl: undefined,
  boundaryType: 'rectangle'
};

export async function getMapConfig(): Promise<MapConfig> {
  try {
    const db = await connectToDatabase();
    const settings = await db.collection('settings').findOne({});

    if (settings?.mapConfig) {
      const config = settings.mapConfig;

      // Vercel fallback: If on Vercel and no custom image URL, use demo tiles
      if (process.env.VERCEL && !config.customImageUrl) {
        console.log('[Vercel] Using demo tiles fallback');
        return {
          ...config,
          customImageUrl: '/uploads/tiles/demo/{z}/{x}/{y}.png',
          maxCustomZoom: 14 // Demo tiles go up to zoom 14
        };
      }

      return config;
    }

    return DEFAULT_MAP_CONFIG;
  } catch (error) {
    console.error('Error loading map config:', error);
    return DEFAULT_MAP_CONFIG;
  }
}

export async function updateMapConfig(config: MapConfig): Promise<void> {
  try {
    const db = await connectToDatabase();
    await db.collection('settings').updateOne(
      {},
      {
        $set: { mapConfig: config }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error saving map config:', error);
    throw error;
  }
}

// Helper function to calculate center from bounds
export function calculateCenter(config: MapConfig): { lat: number, lng: number } {
  return {
    lat: (config.swLat + config.neLat) / 2,
    lng: (config.swLng + config.neLng) / 2
  };
}

// Helper function to get Leaflet bounds array
export function getLeafletBounds(config: MapConfig): [[number, number], [number, number]] {
  return [
    [config.swLat, config.swLng], // Southwest corner
    [config.neLat, config.neLng]  // Northeast corner
  ];
}

// Helper function to get polygon boundary for Żywiecki Raj LGD
export function getZywieckirajBoundary(): GeoJSON.Polygon {
  return ZYWIECKI_RAJ_BOUNDARY;
}

// Helper function to calculate bounds from polygon coordinates
export function calculatePolygonBounds(polygon: GeoJSON.Polygon): { swLat: number, swLng: number, neLat: number, neLng: number } {
  const coordinates = polygon.coordinates[0]; // First ring (outer boundary)

  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];
  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];

  coordinates.forEach(([lng, lat]: number[]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  return {
    swLat: minLat,
    swLng: minLng,
    neLat: maxLat,
    neLng: maxLng
  };
}

// Calculate approximate area of a boundary in square kilometers
export function calculateBoundaryArea(config: MapConfig): number {
  // Using simple lat/lng to km conversion
  // 1 degree latitude ≈ 111 km
  // 1 degree longitude ≈ 111 km * cos(latitude)

  const latDiff = config.neLat - config.swLat;
  const lngDiff = config.neLng - config.swLng;
  const avgLat = (config.neLat + config.swLat) / 2;

  const heightKm = latDiff * 111;
  const widthKm = lngDiff * 111 * Math.cos(avgLat * Math.PI / 180);

  return heightKm * widthKm;
}

// Calculate appropriate breakpoint zoom level based on area
export function calculateBreakpointZoom(areaKm2: number): number {
  // Maximum zoom levels for best detail - area fills screen
  if (areaKm2 > 100) return 14;
  if (areaKm2 > 50) return 15;
  if (areaKm2 > 20) return 16;
  if (areaKm2 > 10) return 17;
  return 18; // Maximum detail for small areas
}

// Get breakpoint zoom for current map configuration
export function getBreakpointZoom(config: MapConfig): number {
  const area = calculateBoundaryArea(config);
  return calculateBreakpointZoom(area);
}