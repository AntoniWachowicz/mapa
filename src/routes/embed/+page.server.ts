// src/routes/embed/+page.server.ts
import { getTemplate, getObjects } from '$lib/server/schemadb.js';
import { getMapConfig } from '$lib/server/mapconfig.js';

export async function load() {
  try {
    const [template, objects, mapConfig] = await Promise.all([
      getTemplate(),
      getObjects(),
      getMapConfig()
    ]);

    return {
      template,
      objects,
      mapConfig
    };
  } catch (error) {
    console.error('Error loading embed data:', error);
    return {
      template: { fields: [] },
      objects: [],
      mapConfig: {
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
