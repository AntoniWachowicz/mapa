# Project Data Directory

This directory contains large data files that are not included in the git repository.

## Shapefiles

The `shapefiles/` directory contains Polish administrative boundary data from PRG (Państwowy Rejestr Granic).

### Source
Download from:
- https://gis-support.pl/baza-wiedzy-2/dane-do-pobrania/granice-administracyjne/
- https://www.geoportal.gov.pl/

### Files
- `gminy.shp/dbf/shx` - Polish gmina (municipality) boundaries
- Other administrative boundary files

### Usage
These files are used by extraction scripts in `scripts/boundary-extraction/` to generate TypeScript boundary definitions for the application.

**Note:** Shapefile data is large (~80-100MB) and should NOT be committed to git. Download locally if needed for boundary extraction.
