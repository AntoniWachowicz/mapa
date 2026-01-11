/**
 * Pin Position Tracker
 * Tracks pixel position of selected pins during map panning and zooming.
 */

import type { MapObject } from '$lib/types.js';

export interface PinPositionTrackerOptions {
  map: any;
  L: any;
  objects: MapObject[];
  selectedObjectId: string | null;
  onPinPositionUpdate?: (x: number, y: number) => void;
}

/**
 * Create a pin position tracker
 * Manages continuous pixel position updates during zoom/pan animations
 */
export function createPinPositionTracker() {
  let animationFrameId: number | null = null;
  let isZooming = false;

  /**
   * Update the selected pin's pixel position and notify callback
   */
  function updatePosition(options: PinPositionTrackerOptions): void {
    const { map, L, objects, selectedObjectId, onPinPositionUpdate } = options;

    if (!map || !L || !selectedObjectId || !onPinPositionUpdate) return;

    // Find the selected object
    const selectedObj = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObj || !selectedObj.location) return;

    // Extract lat/lng from GeoJSON Point: coordinates are [lng, lat]
    const [lng, lat] = selectedObj.location.coordinates;

    // Convert lat/lng to pixel coordinates
    const point = map.latLngToContainerPoint([lat, lng]);

    // Call the callback with pixel position (bottom-middle of pin icon)
    // Adjust 4px up to align with the actual visible bottom of the icon
    onPinPositionUpdate(point.x, point.y - 4);
  }

  /**
   * Start continuous position updates using requestAnimationFrame
   */
  function startContinuousUpdate(options: PinPositionTrackerOptions): void {
    if (animationFrameId !== null) return; // Already running

    isZooming = true;

    const animate = () => {
      if (isZooming) {
        updatePosition(options);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        animationFrameId = null;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop continuous position updates
   */
  function stopContinuousUpdate(): void {
    isZooming = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  return {
    updatePosition,
    startContinuousUpdate,
    stopContinuousUpdate
  };
}
