// src/routes/embed/+page.server.ts
// Public route — no auth required. tenantId comes from the `t` query param,
// which the admin/embed-code generator includes automatically in every iframe URL.
import { getTemplate, getObjects } from '$lib/server/schemadb.js';
import { getMapConfig } from '$lib/server/mapconfig.js';

const EMPTY_RESPONSE = {
  template: { fields: [] },
  objects: [],
  mapConfig: { swLat: 40.700, swLng: -74.020, neLat: 40.720, neLng: -74.000, defaultZoom: 12, maxCustomZoom: 14 }
};

export async function load({ url }: { url: URL }) {
  const tenantId = url.searchParams.get('t');
  if (!tenantId) return EMPTY_RESPONSE;

  try {
    const [template, objects, mapConfig] = await Promise.all([
      getTemplate(tenantId),
      getObjects(tenantId),
      getMapConfig()
    ]);
    return { template, objects, mapConfig };
  } catch (error) {
    console.error('Error loading embed data:', error);
    return EMPTY_RESPONSE;
  }
}
