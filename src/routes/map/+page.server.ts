// src/routes/map/+page.server.ts
import { getTemplate, getObjects } from '$lib/server/schemadb.js';
import { getMapConfig } from '$lib/server/mapconfig.js';

export async function load({ locals }: { locals: App.Locals }) {
  const tenantId = locals.user!.tenantId!;
  try {
    const [template, objects, mapConfig] = await Promise.all([
      getTemplate(tenantId),
      getObjects(tenantId),
      getMapConfig()
    ]);
    return { template, objects, mapConfig };
  } catch (error) {
    console.error('Error loading map data:', error);
    return {
      template: { fields: [] },
      objects: [],
      mapConfig: { swLat: 40.700, swLng: -74.020, neLat: 40.720, neLng: -74.000, defaultZoom: 12, maxCustomZoom: 14 }
    };
  }
}
