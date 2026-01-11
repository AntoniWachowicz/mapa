/**
 * Boundary Helpers for Admin Map
 * Utilities for creating boundary overlays on Leaflet maps.
 */

/**
 * Create world bounds and outer ring for boundary overlays
 * Extends map bounds by 10 degrees to create "world" coordinates
 * Returns coordinates for outer ring (clockwise from SW)
 */
export function createWorldBoundsOverlay(map: any): {
  worldBounds: [[number, number], [number, number]];
  outerRing: [number, number][];
} {
  const mapBounds = map.getBounds();
  const worldBounds: [[number, number], [number, number]] = [
    [mapBounds.getSouth() - 10, mapBounds.getWest() - 10],
    [mapBounds.getNorth() + 10, mapBounds.getEast() + 10]
  ];

  const outerRing: [number, number][] = [
    [worldBounds[0][0], worldBounds[0][1]], // SW
    [worldBounds[1][0], worldBounds[0][1]], // NW
    [worldBounds[1][0], worldBounds[1][1]], // NE
    [worldBounds[0][0], worldBounds[1][1]], // SE
    [worldBounds[0][0], worldBounds[0][1]]  // back to SW
  ];

  return { worldBounds, outerRing };
}
