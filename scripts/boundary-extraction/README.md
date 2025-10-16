# Boundary Extraction Scripts

These are Node.js utility scripts for extracting boundary data from Polish government shapefiles.

## Scripts

### `examine_fields.cjs`
Examines the shapefile structure and searches for features containing "jeleśnia", "jelesnia", or "żywiec".

**Usage:**
```bash
node examine_fields.cjs
```

### `search_teryt.cjs`
Searches for a gmina by its TERYT code.

**Usage:**
```bash
node search_teryt.cjs
```

### `find_jelesnia.cjs`
Searches through a shapefile to find the Jeleśnia gmina and displays its properties.

**Usage:**
```bash
node find_jelesnia.cjs
```

### `extract_jelesnia.cjs`
Extracts the Jeleśnia boundary (TERYT: 2417042) from the shapefile and:
- Displays boundary information (coordinates, bounds, size)
- Generates TypeScript boundary definition
- Saves GeoJSON file

**Usage:**
```bash
node extract_jelesnia.cjs
```

**Output files:**
- `jelesnia_boundary_real.ts` - TypeScript boundary definition
- `jelesnia_boundary_real.geojson` - GeoJSON boundary file

### `convert_coordinates.cjs`
Converts coordinates between different formats and coordinate systems.

**Usage:**
```bash
node convert_coordinates.cjs
```

## Source Data

These scripts work with PRG (Państwowy Rejestr Granic) data - the official Polish border registry available from:
- https://gis-support.pl/baza-wiedzy-2/dane-do-pobrania/granice-administracyjne/
- https://www.geoportal.gov.pl/

**Shapefile Location:**
The scripts expect shapefile data to be located in `../../data/shapefiles/` (relative to this scripts directory).
Download the gmina boundary files and place them in the `data/shapefiles/` directory at the project root.

## Installing Dependencies

```bash
npm install shapefile
```

## Creating New Extraction Scripts

To extract a different gmina or region:

1. Copy one of the existing scripts
2. Update the TERYT code or search criteria
3. Run the script with the appropriate shapefile
4. Move generated files to `src/lib/boundaries/regions/`
5. Add to the boundary registry in `src/lib/boundaries/index.ts`

## Complete Workflow

1. Download shapefile data from gis-support.pl or geoportal.gov.pl
2. Place shapefile files (`.shp`, `.dbf`, `.shx`, etc.) in `../../data/shapefiles/`
3. Run scripts from this directory: `node extract_jelesnia.cjs`
4. Generated boundary files will be created in this directory
5. Move generated `.ts` and `.geojson` files to `../../src/lib/boundaries/regions/`
6. Register the boundary in `../../src/lib/boundaries/index.ts`
7. Use the boundary in your application

## Notes

- These are one-time utility scripts for data extraction
- They should NOT be included in the production build
- Extracted boundaries should be committed to version control
- Source shapefiles are typically large (~80-100MB) and should NOT be committed
- The `data/` directory has a `.gitignore` that excludes shapefile formats
