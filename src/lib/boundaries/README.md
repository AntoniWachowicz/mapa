# Boundary Regions

This directory contains geographic boundary data for different regions that can be used as map boundaries.

## Directory Structure

```
boundaries/
├── index.ts              # Main registry - import boundaries here
├── regions/              # Individual boundary definitions
│   ├── zywiecki-raj.ts  # Żywiecki Raj LGD boundary
│   ├── jelesnia.geojson # Jeleśnia gmina boundary (example)
│   └── ...              # Add more regions here
└── utils/               # Utility functions for boundary processing
```

## How to Add a New Boundary Region

### 1. Prepare Your Boundary Data

You need a GeoJSON Polygon with coordinates in WGS84 format (EPSG:4326):
- Longitude/Latitude order: `[lng, lat]`
- First coordinate should match the last (closed polygon)

### 2. Create a TypeScript File

Create a new file in `regions/` directory (e.g., `regions/my-region.ts`):

```typescript
import type { GeoJSON } from '../../types.js';

export const MY_REGION_BOUNDARY: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [longitude1, latitude1],
      [longitude2, latitude2],
      [longitude3, latitude3],
      // ... more coordinates
      [longitude1, latitude1] // Close the polygon
    ]
  ]
};
```

### 3. Register in the Boundary Registry

Update `index.ts` to include your new boundary:

```typescript
import { MY_REGION_BOUNDARY } from './regions/my-region.js';

export const BOUNDARY_REGISTRY: BoundaryRegion[] = [
  // ... existing boundaries
  {
    id: 'my-region',
    name: 'My Region Name',
    description: 'Description of the region',
    polygon: MY_REGION_BOUNDARY,
    category: 'gmina' // or 'lgd', 'powiat', 'wojewodztwo', 'custom'
  }
];
```

### 4. Use in Your Application

```typescript
import { getBoundaryById, BOUNDARY_REGISTRY } from '$lib/boundaries';

// Get a specific boundary
const myBoundary = getBoundaryById('my-region');

// List all available boundaries
const allBoundaries = BOUNDARY_REGISTRY;

// Get boundaries by category
import { getBoundariesByCategory } from '$lib/boundaries';
const gminas = getBoundariesByCategory('gmina');
```

## Boundary Categories

- **gmina**: Municipal boundaries (gmina in Polish)
- **lgd**: Local Action Group (Lokalna Grupa Działania)
- **powiat**: County/district boundaries
- **wojewodztwo**: Voivodeship (province) boundaries
- **custom**: Custom or special purpose boundaries

## Tools for Processing Boundaries

If you have boundary data in other formats:

1. **QGIS** - Open source GIS software
   - Can convert between coordinate systems
   - Export to GeoJSON format

2. **ogr2ogr** - Command line tool
   ```bash
   ogr2ogr -f GeoJSON -t_srs EPSG:4326 output.geojson input.shp
   ```

3. **Online converters**
   - geojson.io - View and edit GeoJSON
   - mapshaper.org - Simplify complex boundaries

## Notes

- Keep boundary complexity reasonable - simplify if needed to reduce file size
- Ensure coordinates are in WGS84 (EPSG:4326) format
- Test boundaries work correctly with the map component before committing
- Consider adding metadata like area, population, or administrative codes
