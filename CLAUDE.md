# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking and Svelte validation
- `npm run lint` - Run ESLint and Prettier checks
- `npm run format` - Format code with Prettier

## Architecture Overview

This is a SvelteKit application for creating interactive maps with custom data points. The architecture follows a clear separation between client and server functionality:

### Authentication & Authorization
- JWT-based authentication with httpOnly cookies (7-day expiration)
- Simple username/password validation against environment variables
- Protected routes enforced via `hooks.server.ts` middleware
- Routes requiring auth: `/admin`, `/schema-builder`, `/map`

### Data Layer
- MongoDB database with three main collections:
  - `settings` - stores templates and map configurations
  - `objects` - stores map data points with coordinates and custom fields
- Connection management through singleton pattern in `database.ts`
- Environment variables required: `MONGODB_URI`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET`

### Core Features
1. **Schema Builder** (`/schema-builder`) - Define custom fields for map objects with comprehensive field types
2. **Admin Panel** (`/admin`) - Configure map bounds, zoom levels, and optional custom overlay images
3. **Map Interface** (`/map`) - Interactive map displaying data points with custom schemas
4. **Pin Management** (`/addPin`) - Add new data points to the map with custom field data

### Field Types Available
- **Basic**: text, number, checkbox, textarea, date, email, url
- **Selection**: select (dropdown), tags (major/minor with colors)  
- **Financial**: currency (Polish złoty), percentage
- **Media**: image (URL with preview), youtube (video embeds)

### Key Type Definitions
- `Template` - Defines the schema structure with field configurations
- `MapConfig` - Map bounds, zoom settings, and custom image overlay
- `MapObject` - Data points with coordinates and custom field data
- `SavedObject` - Base object structure with ID and custom data

### Server Functions
- `src/lib/server/schemadb.ts` - CRUD operations for templates and objects
- `src/lib/server/mapconfig.ts` - Map configuration management with helper functions
- `src/lib/server/auth.ts` - Authentication utilities and token management

### Client State Management
- Svelte stores for template and project state in `stores.ts`
- Reactive components for dynamic form generation based on templates
- Real-time updates between schema builder and data entry forms

---

# Session Progress & Context

## Latest Development Session (August 24, 2025) - CONTINUED
**Status**: Enhanced Excel import system with comprehensive improvements and user experience enhancements

### Major Features Completed This Session (Continuation)
1. **Enhanced Excel Import System**
   - Added loading states with cancellation capability for long import operations
   - Fixed critical bug where only first row imported when multiple rows were selected
   - Created Excel template generation endpoint (`/api/excel-template`) with field-specific guidance
   - Implemented intelligent column mapping for Polish and English headers
   - Added comprehensive error handling and user feedback throughout import process

2. **Incomplete Data Tracking & Visual Indicators**
   - Added `hasIncompleteData` flag to SavedObject interface and database schema
   - Implemented visual indicators (⚠️ badges) for pins with missing required data
   - Enhanced PinList component with incomplete data warnings and tooltips
   - Created clear workflow for users to identify and complete missing data

3. **Geocoding Enhancements**
   - Created comprehensive geocoding service (`src/lib/server/geocoding.ts`)
   - Implemented address simplification to return only county, town, and street
   - Added support for Polish addresses with proper character encoding
   - Enhanced reverse geocoding capabilities with formatted output

4. **UI/UX Improvements**
   - Added Excel template download functionality with schema-specific instructions
   - Implemented progress tracking and cancellation for long-running operations
   - Fixed tags display in pin list with proper Svelte block structure
   - Enhanced import preview with clear indication of incomplete records

### Technical Implementation Details
- **New API Endpoints**: 
  - `POST /api/excel-template` - Generates custom Excel templates
  - `POST /api/import-excel` - Enhanced import with incomplete data tracking
  - `POST /api/geocode` - Address to coordinates conversion
  - `POST /api/reverse-geocode` - Coordinates to address conversion
- **Database Schema**: Added `hasIncompleteData` boolean flag to objects collection
- **Type Safety**: Enhanced SavedObject interface with incomplete data flag
- **File Upload**: Maintained existing upload system in `static/uploads/` directory

### Files Modified This Session
- `src/lib/types.ts` - Added `hasIncompleteData` to SavedObject interface
- `src/lib/PinManager.svelte` - Major overhaul with loading states, template download, enhanced import
- `src/lib/PinList.svelte` - Added incomplete data indicators, fixed tags display structure  
- `src/lib/server/schemadb.ts` - Enhanced with incomplete data handling in CRUD operations
- `src/lib/server/geocoding.ts` - NEW: Comprehensive geocoding service
- `src/routes/api/excel-template/+server.ts` - NEW: Excel template generation endpoint
- `src/routes/api/import-excel/+server.ts` - Enhanced import logic with better error handling
- `NOWE_FUNKCJE.md` - Comprehensive documentation of new features in Polish

### User-Requested Improvements Completed
1. ✅ **Loading state for Excel import** - Added with cancellation capability
2. ✅ **Fix import bug** - Only first row was importing, now all selected rows import correctly
3. ✅ **Excel template generation** - Automatic template download with field guidance
4. ✅ **Incomplete data markers** - Visual ⚠️ indicators for pins missing required data
5. ✅ **Simplified addresses** - Geocoding now returns county, town, street only
6. ✅ **Tags in pin list** - Fixed display with proper Svelte structure

### Current Architecture Status
- **Excel Integration**: Full bidirectional Excel support with templates and import/export
- **Geocoding Service**: Complete Polish address handling with OpenStreetMap integration
- **Data Quality**: Comprehensive incomplete data tracking and user guidance
- **User Experience**: Professional loading states, error handling, and visual feedback
- **Type Safety**: All new features properly typed with TypeScript validation

### Next Session Considerations
- Performance optimization for large Excel imports
- Enhanced geocoding accuracy for rural Polish addresses
- Batch editing capabilities for incomplete pins
- Advanced filtering options in pin list view

---

## Latest Development Session (September 30, 2025) - POLYGON BOUNDARIES
**Status**: ✅ **SUCCESSFULLY IMPLEMENTED OFFICIAL POLISH BOUNDARY DATA**

### 🎯 **Problem Solved: Precise Administrative Boundaries**
**Issue**: Previous boundary implementations were geographically inaccurate, extending beyond Polish borders into Slovakia, with insufficient precision (only ~10-160 coordinate points).

**Solution**: Successfully implemented **Approach #2** from `BOUNDARY_APPROACHES.md`: "Import Pre-Processed Boundary File"

### 📊 **Implementation Results**
**Official Data Source**: PRG (Państwowy Rejestr Granic) - Poland's State Boundary Register
- **Provider**: gis-support.pl (official Polish government data distributor)
- **TERYT Code**: 2417042 (verified official municipal identifier)
- **Data Quality**: Professional surveyed administrative boundaries
- **Last Updated**: 2022-12-22

### 🔧 **Technical Implementation Process**
1. **Downloaded Official Data**: `gminy.zip` (63MB) from gis-support.pl containing all Polish municipalities
2. **Located Target Municipality**: Found Gmina Jeleśnia using TERYT code 2417042 in shapefile
3. **Coordinate Conversion**: Converted 2,765 coordinates from EPSG:2180 (Poland CS92) to WGS84
4. **Integration**: Created `src/lib/boundaries_real.ts` with official coordinate data
5. **Validation**: Verified all coordinates within Polish territory (49.531°N - 49.695°N)

### 📈 **Precision Improvements**
- **Before**: ~111 generated coordinates around approximate center
- **After**: 2,765 official surveyed boundary coordinates
- **Accuracy**: Government-grade precision vs. algorithmic approximation
- **Territory**: Verified within Polish borders (safe margin from Slovak border)
- **Size**: Realistic 19.2km × 18.2km municipal area

### 💾 **Files Created/Modified**
- `src/lib/boundaries_real.ts` - NEW: Official boundary coordinates (2,765 points)
- `src/lib/boundaries.ts` - UPDATED: Now imports and exports real boundary data
- `jelesnia_boundary_wgs84.geojson` - CREATED: Backup GeoJSON file with official data
- `BOUNDARY_APPROACHES.md` - REFERENCE: Contains numbered approaches for future use

### 🏆 **Success Criteria Met**
- ✅ **Geographic Accuracy**: Stays completely within Polish territory
- ✅ **Maximum Precision**: 2,765 official surveyed coordinate points
- ✅ **Professional Quality**: Uses government administrative data
- ✅ **Polish Compliance**: Official TERYT codes and PRG data source
- ✅ **Technical Integration**: No compilation errors, seamless integration

### 🔑 **Key Learning: Working Solution Method**
**Successful Approach #2**: Direct import of pre-processed official government boundary files
1. Download official Polish administrative data from gis-support.pl
2. Extract specific municipality using TERYT codes
3. Convert coordinate projection from Polish CS92 to WGS84
4. Integrate 2,765+ precise coordinates directly into boundary definition
5. Result: Professional-grade accuracy with government data validation

**Note**: This approach succeeds where API-based methods failed due to using pre-validated, complete boundary datasets rather than attempting real-time coordinate generation or API reconstruction.