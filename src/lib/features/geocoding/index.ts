/**
 * Geocoding Feature Module
 * Public API for geocoding functionality including queue management and address extraction.
 */

// Re-export types
export type { GeocodingRequest, GeocodingResult } from './geocodingQueue.svelte.js';

// Re-export queue functions
export {
  getQueue,
  isGeocoding,
  isInQueue,
  addToQueue,
  processQueue,
  getQueueLength
} from './geocodingQueue.svelte.js';

// Re-export address extraction
export { extractAddressFromObject } from './addressExtractor.js';
