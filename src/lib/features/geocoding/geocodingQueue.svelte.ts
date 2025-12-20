/**
 * Geocoding Queue Module
 * Manages a queue of geocoding requests with rate limiting to respect Nominatim API limits.
 */

import type { SavedObject } from '$lib/types.js';

export interface GeocodingRequest {
  objectId: string;
  address: string;
}

export interface GeocodingResult {
  success: boolean;
  data?: {
    lat: number;
    lng: number;
  };
}

// State using Svelte 5 runes
let quickGeocodingIds = $state<Set<string>>(new Set());
let geocodingQueue = $state<GeocodingRequest[]>([]);
let isProcessingQueue = $state(false);

/**
 * Get the current queue
 */
export function getQueue(): GeocodingRequest[] {
  return geocodingQueue;
}

/**
 * Check if an object is currently being geocoded
 */
export function isGeocoding(objectId: string): boolean {
  return quickGeocodingIds.has(objectId);
}

/**
 * Check if an object is in the queue
 */
export function isInQueue(objectId: string): boolean {
  return geocodingQueue.some(r => r.objectId === objectId);
}

/**
 * Add a request to the geocoding queue
 */
export function addToQueue(objectId: string, address: string): void {
  // Check if already in queue
  if (isInQueue(objectId)) {
    throw new Error('Ten obiekt jest już w kolejce do geokodowania');
  }

  // Check if already being processed
  if (isGeocoding(objectId)) {
    throw new Error('Ten obiekt jest obecnie geokodowany');
  }

  console.log('Adding to geocoding queue:', address);

  // Add to queue
  geocodingQueue.push({ objectId, address });
}

/**
 * Process the geocoding queue - one request at a time with delays
 * @param onUpdate - Callback to update object in the list after successful geocoding
 */
export async function processQueue(
  onUpdate: (objectId: string, lat: number, lng: number) => Promise<void>
): Promise<void> {
  if (isProcessingQueue || geocodingQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (geocodingQueue.length > 0) {
    const request = geocodingQueue.shift();
    if (!request) break;

    const { objectId, address } = request;

    console.log(`Processing queue: ${geocodingQueue.length + 1} remaining, geocoding: ${address}`);

    // Add to loading set
    quickGeocodingIds.add(objectId);

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const result: GeocodingResult = await response.json();
      if (!result.success || !result.data) {
        console.error(`Failed to geocode: ${address}`);
        // Don't alert for queued items, just log
      } else {
        // Save coordinates via callback
        const { lat, lng } = result.data;
        await onUpdate(objectId, lat, lng);
        console.log(`✓ Geocoded: ${address} -> ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Queue geocode error:', error);
    } finally {
      // Remove from loading set
      quickGeocodingIds.delete(objectId);
    }

    // Wait 1.5 seconds between addresses to respect Nominatim rate limits
    // (each address may make multiple queries internally with 500ms delays)
    if (geocodingQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  isProcessingQueue = false;
  console.log('Geocoding queue completed');
}

/**
 * Get the current queue length
 */
export function getQueueLength(): number {
  return geocodingQueue.length;
}
