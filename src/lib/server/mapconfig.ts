// src/lib/server/mapconfig.ts - NEW FILE
import { connectToDatabase } from './database.js';
import type { MapConfig } from '../types.js';

// Default map config - you can adjust these coordinates for your area
const DEFAULT_MAP_CONFIG: MapConfig = {
  swLat: 40.700,      // Southwest corner latitude
  swLng: -74.020,     // Southwest corner longitude
  neLat: 40.720,      // Northeast corner latitude  
  neLng: -74.000,     // Northeast corner longitude
  defaultZoom: 12,    // Starting zoom level
  maxCustomZoom: 14,  // Above this zoom = show OSM tiles
  customImageUrl: undefined
};

export async function getMapConfig(): Promise<MapConfig> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('settings');
    
    const result = await collection.findOne({ type: 'mapconfig' });
    
    if (!result) {
      // Create default map config
      await collection.insertOne({ 
        type: 'mapconfig', 
        config: DEFAULT_MAP_CONFIG 
      });
      return DEFAULT_MAP_CONFIG;
    }
    
    return result.config;
  } catch (error) {
    console.error('Error getting map config:', error);
    return DEFAULT_MAP_CONFIG;
  }
}

export async function updateMapConfig(config: MapConfig): Promise<void> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('settings');
    
    await collection.updateOne(
      { type: 'mapconfig' },
      { $set: { config } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating map config:', error);
    throw error;
  }
}

// Helper function to calculate center from bounds
export function calculateCenter(config: MapConfig): { lat: number, lng: number } {
  return {
    lat: (config.swLat + config.neLat) / 2,
    lng: (config.swLng + config.neLng) / 2
  };
}

// Helper function to get Leaflet bounds array
export function getLeafletBounds(config: MapConfig): [[number, number], [number, number]] {
  return [
    [config.swLat, config.swLng], // Southwest corner
    [config.neLat, config.neLng]  // Northeast corner
  ];
}