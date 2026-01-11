/**
 * Boundary Renderer
 * Handles rendering of map boundary overlays and polygon outlines.
 */

import type { MapConfig, GeoJSON } from '$lib/types.js';

/**
 * Transform GeoJSON coordinates [lng, lat] to Leaflet coordinates [lat, lng]
 */
function transformCoordinates(coords: number[]): number[] {
  return [coords[1], coords[0]];
}

/**
 * Transform polygon coordinates from GeoJSON format to Leaflet format
 */
function transformPolygonCoordinates(polygonCoords: number[][][]): number[][] {
  return polygonCoords[0].map(transformCoordinates);
}

/**
 * Extract holes for bounds overlay from map configuration
 * Returns array of coordinate rings representing the "holes" (allowed areas)
 */
function extractBoundaryHoles(mapConfig: MapConfig): number[][][] {
  if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
    // Use polygon coordinates for the inner hole(s)
    if (mapConfig.polygonBoundary.type === 'Polygon') {
      return [mapConfig.polygonBoundary.coordinates[0].map(transformCoordinates)];
    } else if (mapConfig.polygonBoundary.type === 'MultiPolygon') {
      return mapConfig.polygonBoundary.coordinates.map(transformPolygonCoordinates);
    }
  }

  // Use rectangle bounds for the inner hole
  return [[
    [mapConfig.swLat, mapConfig.swLng], // SW
    [mapConfig.neLat, mapConfig.swLng], // NW
    [mapConfig.neLat, mapConfig.neLng], // NE
    [mapConfig.swLat, mapConfig.neLng], // SE
    [mapConfig.swLat, mapConfig.swLng]  // back to SW
  ]];
}

/**
 * Create overlay to darken area outside bounds
 * Returns the created Leaflet polygon layer
 */
export function createBoundsOverlay(
  L: any,
  map: any,
  mapConfig: MapConfig
): any {
  const mapBounds = map.getBounds();
  const worldBounds = [
    [mapBounds.getSouth() - 10, mapBounds.getWest() - 10],
    [mapBounds.getNorth() + 10, mapBounds.getEast() + 10]
  ];

  // Create outer ring (world bounds)
  const outerRing = [
    [worldBounds[0][0], worldBounds[0][1]], // SW
    [worldBounds[1][0], worldBounds[0][1]], // NW
    [worldBounds[1][0], worldBounds[1][1]], // NE
    [worldBounds[0][0], worldBounds[1][1]], // SE
    [worldBounds[0][0], worldBounds[0][1]]  // back to SW
  ];

  // Extract holes from boundary configuration
  const holes = extractBoundaryHoles(mapConfig);

  // Create and return the polygon overlay
  return L.polygon([outerRing, ...holes], {
    color: 'transparent',
    weight: 0,
    fillColor: '#000000',
    fillOpacity: 0.3,
    interactive: false  // Allow clicks to pass through
  }).addTo(map);
}

/**
 * Create visible boundary polygon outline
 * Returns the created Leaflet polygon layer
 */
export function createBoundaryPolygon(
  L: any,
  map: any,
  polygonBoundary: GeoJSON.Polygon | GeoJSON.MultiPolygon
): any {
  let allCoordinates: number[][][] = [];

  if (polygonBoundary.type === 'Polygon') {
    allCoordinates = [polygonBoundary.coordinates[0].map(transformCoordinates)];
  } else if (polygonBoundary.type === 'MultiPolygon') {
    allCoordinates = polygonBoundary.coordinates.map(transformPolygonCoordinates);
  }

  return L.polygon(allCoordinates, {
    color: '#007bff',
    weight: 3,
    fillOpacity: 0,
    interactive: false
  }).addTo(map);
}
