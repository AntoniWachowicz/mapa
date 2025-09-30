// src/routes/admin/+page.server.ts - NEW FILE
import { getMapConfig, updateMapConfig } from '$lib/server/mapconfig.js';
import type { MapConfig } from '$lib/types.js';

export async function load() {
  try {
    const mapConfig = await getMapConfig();
    
    return {
      mapConfig
    };
  } catch (error) {
    console.error('Error loading admin data:', error);
    return {
      mapConfig: {
        swLat: 40.700,
        swLng: -74.020,
        neLat: 40.720,
        neLng: -74.000,
        defaultZoom: 12,
        maxCustomZoom: 14,
        boundaryType: 'rectangle' as const
      }
    };
  }
}

type RequestEvent = {
  request: Request;
};

export const actions = {
  updateMapConfig: async ({ request }: RequestEvent) => {
    try {
      const data = await request.formData();
      const configString = data.get('config');
      
      if (typeof configString !== 'string') {
        throw new Error('Invalid config data');
      }
      
      const config: MapConfig = JSON.parse(configString);
      
      // Basic validation
      if (config.swLat >= config.neLat || config.swLng >= config.neLng) {
        throw new Error('Invalid bounds: Southwest corner must be southwest of northeast corner');
      }
      
      await updateMapConfig(config);
      return { success: true };
    } catch (error) {
      console.error('Error updating map config:', error);
      return { success: false, error: 'Failed to update map configuration' };
    }
  }
};