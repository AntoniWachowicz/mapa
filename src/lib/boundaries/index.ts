// src/lib/boundaries/index.ts - Boundary registry and management
import type { GeoJSON } from '../types.js';
// Note: ZYWIECKI_RAJ_BOUNDARY is actually Jeleśnia's boundary (kept for backward compatibility)
import { ZYWIECKI_RAJ_BOUNDARY as JELESNIA_BOUNDARY } from './regions/zywiecki-raj.js';

// Import all LGD Żywiecki Raj gmina boundaries
import { CZERNICHOW_BOUNDARY } from './regions/czernichow.js';
import { GILOWICE_BOUNDARY } from './regions/gilowice.js';
import { KOSZARAWA_BOUNDARY } from './regions/koszarawa.js';
import { LIPOWA_BOUNDARY } from './regions/lipowa.js';
import { LEKAWICA_BOUNDARY } from './regions/lekawica.js';
import { LODYGOWICE_BOUNDARY } from './regions/lodygowice.js';
import { MILOWKA_BOUNDARY } from './regions/milowka.js';
import { RADZIECHOWY_WIEPRZ_BOUNDARY } from './regions/radziechowy-wieprz.js';
import { RAJCZA_BOUNDARY } from './regions/rajcza.js';
import { SLEMIEN_BOUNDARY } from './regions/slemien.js';
import { SWINNA_BOUNDARY } from './regions/swinna.js';
import { UJSOLY_BOUNDARY } from './regions/ujsoly.js';
import { WEGIERSKA_GORKA_BOUNDARY } from './regions/wegierska-gorka.js';

// Create a MultiPolygon combining all 14 gminas for LGD Żywiecki Raj
const LGD_ZYWIECKI_RAJ_MULTIPOLYGON: GeoJSON.MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    CZERNICHOW_BOUNDARY.coordinates,
    GILOWICE_BOUNDARY.coordinates,
    JELESNIA_BOUNDARY.coordinates,
    KOSZARAWA_BOUNDARY.coordinates,
    LEKAWICA_BOUNDARY.coordinates,
    LIPOWA_BOUNDARY.coordinates,
    LODYGOWICE_BOUNDARY.coordinates,
    MILOWKA_BOUNDARY.coordinates,
    RADZIECHOWY_WIEPRZ_BOUNDARY.coordinates,
    RAJCZA_BOUNDARY.coordinates,
    SLEMIEN_BOUNDARY.coordinates,
    SWINNA_BOUNDARY.coordinates,
    UJSOLY_BOUNDARY.coordinates,
    WEGIERSKA_GORKA_BOUNDARY.coordinates
  ]
};

export interface BoundaryRegion {
  id: string;
  name: string;
  description: string;
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  // Optional metadata
  category?: 'gmina' | 'lgd' | 'powiat' | 'wojewodztwo' | 'custom';
  area?: number; // in km²
}

// Registry of all available boundaries
export const BOUNDARY_REGISTRY: BoundaryRegion[] = [
  // LGD Żywiecki Raj - All 14 gminas combined as MultiPolygon
  {
    id: 'zywiecki-raj',
    name: 'LGD Żywiecki Raj',
    description: 'Lokalna Grupa Działania Żywiecki Raj - all 14 gminas with visible borders',
    polygon: LGD_ZYWIECKI_RAJ_MULTIPOLYGON,
    category: 'lgd'
  },
  // Individual gminas in LGD Żywiecki Raj (alphabetical order)
  {
    id: 'czernichow',
    name: 'Gmina Czernichów',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: CZERNICHOW_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'gilowice',
    name: 'Gmina Gilowice',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: GILOWICE_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'jelesnia',
    name: 'Gmina Jeleśnia',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: JELESNIA_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'koszarawa',
    name: 'Gmina Koszarawa',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: KOSZARAWA_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'lekawica',
    name: 'Gmina Łękawica',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: LEKAWICA_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'lipowa',
    name: 'Gmina Lipowa',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: LIPOWA_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'lodygowice',
    name: 'Gmina Łodygowice',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: LODYGOWICE_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'milowka',
    name: 'Gmina Milówka',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: MILOWKA_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'radziechowy-wieprz',
    name: 'Gmina Radziechowy-Wieprz',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: RADZIECHOWY_WIEPRZ_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'rajcza',
    name: 'Gmina Rajcza',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: RAJCZA_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'slemien',
    name: 'Gmina Ślemień',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: SLEMIEN_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'swinna',
    name: 'Gmina Świnna',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: SWINNA_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'ujsoly',
    name: 'Gmina Ujsoły',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: UJSOLY_BOUNDARY,
    category: 'gmina'
  },
  {
    id: 'wegierska-gorka',
    name: 'Gmina Węgierska Górka',
    description: 'Gmina wiejska w powiecie żywieckim, część LGD Żywiecki Raj',
    polygon: WEGIERSKA_GORKA_BOUNDARY,
    category: 'gmina'
  }
];

// Helper function to get boundary by ID
export function getBoundaryById(id: string): BoundaryRegion | undefined {
  return BOUNDARY_REGISTRY.find(region => region.id === id);
}

// Helper function to get all boundaries by category
export function getBoundariesByCategory(category: BoundaryRegion['category']): BoundaryRegion[] {
  return BOUNDARY_REGISTRY.filter(region => region.category === category);
}

// Helper function to calculate polygon bounds
export function calculatePolygonBounds(polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon): { swLat: number, swLng: number, neLat: number, neLng: number } {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  if (polygon.type === 'Polygon') {
    const coordinates = polygon.coordinates[0]; // First ring (outer boundary)
    coordinates.forEach(([lng, lat]: number[]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  } else if (polygon.type === 'MultiPolygon') {
    polygon.coordinates.forEach(polygonCoords => {
      const ring = polygonCoords[0]; // First ring of each polygon
      ring.forEach(([lng, lat]: number[]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });
  }

  return {
    swLat: minLat,
    swLng: minLng,
    neLat: maxLat,
    neLng: maxLng
  };
}

// Export for backward compatibility (note: this is actually Jeleśnia's boundary)
export { ZYWIECKI_RAJ_BOUNDARY } from './regions/zywiecki-raj.js';

// Export the actual LGD MultiPolygon
export { LGD_ZYWIECKI_RAJ_MULTIPOLYGON };
