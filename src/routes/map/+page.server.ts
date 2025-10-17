// src/routes/map/+page.server.ts - UPDATE to include map config
import { getTemplate, getObjects } from '$lib/server/schemadb.js';
import { getMapConfig } from '$lib/server/mapconfig.js';

export async function load() {
  try {
    const [template, objects, mapConfig] = await Promise.all([
      getTemplate(),
      getObjects(),
      getMapConfig()  // NEW: Load map configuration
    ]);

    return {
      template,
      objects,
      mapConfig  // NEW: Include in returned data
    };
  } catch (error) {
    console.error('Error loading map data:', error);
    return {
      template: { fields: [] },
      objects: [],
      mapConfig: {  // NEW: Default map config
        swLat: 40.700,
        swLng: -74.020,
        neLat: 40.720,
        neLng: -74.000,
        defaultZoom: 12,
        maxCustomZoom: 14
      }
    };
  }
}