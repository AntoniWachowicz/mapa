/**
 * Map Boundaries - Polygon Utilities
 * Pure functions for polygon boundary calculations and point-in-polygon checks.
 */

import type { GeoJSON } from '$lib/types.js';

/**
 * Calculate bounding box from polygon coordinates
 */
export function calculatePolygonBounds(
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon
): { swLat: number; swLng: number; neLat: number; neLng: number } {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  if (polygon.type === 'Polygon') {
    const coordinates = polygon.coordinates[0]; // First ring (outer boundary)
    coordinates.forEach(([lng, lat]: number[]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  } else if (polygon.type === 'MultiPolygon') {
    polygon.coordinates.forEach((polygonCoords) => {
      const ring = polygonCoords[0]; // First ring of each polygon
      ring.forEach(([lng, lat]: number[]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });
  }

  return {
    swLat: minLat,
    swLng: minLng,
    neLat: maxLat,
    neLng: maxLng
  };
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
  if (polygon.type === 'Polygon') {
    return checkPolygon(lat, lng, polygon.coordinates[0]);
  } else if (polygon.type === 'MultiPolygon') {
    // Check if point is in any of the polygons
    return polygon.coordinates.some((polygonCoords) => checkPolygon(lat, lng, polygonCoords[0]));
  }
  return false;
}

/**
 * Helper function to check if point is in a single polygon using ray casting
 */
function checkPolygon(lat: number, lng: number, coordinates: number[][]): boolean {
  let isInside = false;

  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const xi = coordinates[i][0]; // longitude
    const yi = coordinates[i][1]; // latitude
    const xj = coordinates[j][0]; // longitude
    const yj = coordinates[j][1]; // latitude

    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      isInside = !isInside;
    }
  }

  return isInside;
}

/**
 * Check if coordinates are within rectangular or polygon bounds
 */
export function isWithinBounds(
  lat: number,
  lng: number,
  boundaryType: 'rectangle' | 'polygon',
  rectangleBounds: { swLat: number; swLng: number; neLat: number; neLng: number },
  polygonBoundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
  if (boundaryType === 'polygon' && polygonBoundary) {
    return isPointInPolygon(lat, lng, polygonBoundary);
  }

  // Default rectangle boundary check
  return (
    lat >= rectangleBounds.swLat &&
    lat <= rectangleBounds.neLat &&
    lng >= rectangleBounds.swLng &&
    lng <= rectangleBounds.neLng
  );
}
