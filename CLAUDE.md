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

## Latest Development Session (August 24, 2025)
**Status**: Complete mapping application with comprehensive field types implemented

### Major Features Completed This Session
1. **Extended Field Type System**
   - Added 7 new field types: email, url, date, textarea, select, currency, percentage
   - Implemented media field types: image (single image URLs) and YouTube embeds
   - Professional form validation and display for all field types
   - Currency formatting (Polish złoty with proper number formatting)

2. **Media Field Implementation**
   - Image field with URL input and live preview functionality
   - YouTube field with automatic video ID extraction from various URL formats
   - Professional media display in PinList component with responsive design
   - 16:9 aspect ratio maintenance for YouTube embeds

3. **Enhanced Form Handling**
   - Type-safe field value handling with proper string conversion
   - Comprehensive field validation for different input types
   - Professional styling matching omikron.info.pl design standards
   - Image previews in PinManager during data entry

4. **Documentation and Planning**
   - Created FIELD_TYPES_SUGGESTIONS.txt with comprehensive field type analysis
   - Identified practical field types for LGD investment display
   - Prioritized citizen-facing functionality over technical administrative fields

### Technical Implementation Details
- **Field Types**: Extended Field type union to include all new types
- **Media Handling**: YouTube video ID extraction with regex patterns
- **Form Components**: Enhanced PinManager and PinList with media support
- **Styling**: Professional CSS with responsive media displays and proper spacing
- **Type Safety**: Fixed TypeScript issues with proper string conversion

### Files Modified
- `src/lib/types.ts` - Extended Field interface with new types and SelectConfig
- `src/lib/PinManager.svelte` - Added form handling for all new field types
- `src/lib/PinList.svelte` - Enhanced display with media support and YouTube embedding
- `FIELD_TYPES_SUGGESTIONS.txt` - Comprehensive field type documentation

### Next Session Priorities
- Test all field types in production environment
- Consider additional media types (file uploads, image galleries)
- Optimize media loading and caching
- Implement rich text editor for textarea fields

**Architecture Status**: Fully functional mapping application with comprehensive field system for LGD investments