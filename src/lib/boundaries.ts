// src/lib/boundaries.ts - Client-side boundary definitions
import type { GeoJSON } from './types.js';
import { ZYWIECKI_RAJ_BOUNDARY as REAL_BOUNDARY } from './boundaries_real.js';

// Export the real official boundary data
export const ZYWIECKI_RAJ_BOUNDARY: GeoJSON.Polygon = REAL_BOUNDARY;

// Helper function to calculate polygon bounds
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