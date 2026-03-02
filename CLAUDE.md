# CLAUDE.md

LLM-focused development guide for this SvelteKit mapping application.

**PRIMARY REFERENCE**: `docs/WORKING-NOTES.md` - Start here for current context, known issues, and technical debt.

---

## Code Style (Mandatory)

Write all code at senior-developer quality. Specifically:

- **Dispatch tables over switch statements** — `Record<FieldType, Handler>` instead of `switch(type)`. Adding a new case means adding one entry, not touching multiple files.
- **Composition over nesting** — chain `.map().filter().reduce()` rather than building intermediate arrays with loops
- **Trust the type system** — no defensive null-checking where types already guarantee the value; only validate at system boundaries (user input, API responses, database reads)
- **No unnecessary abstraction** — don't create helpers or utilities for one-off operations; three similar lines is better than a premature abstraction
- **Minimal file splitting** — only split when there is a genuine reason (file too large, reused elsewhere, clear separation of concerns); not just because a concern exists
- **No redundant comments** — never comment what the code already says; only comment architectural decisions, non-obvious contracts, and where things connect to the wider system

**Comments must document decisions, not mechanics.** Good: `// dispatch table — add new field types here only, no other files need touching`. Bad: `// loop through fields`.

The owner has limited TypeScript knowledge but quickly grasps concepts when explained. Write the best code possible; explain it when asked rather than simplifying it preemptively.

---

## Quick Start

```bash
npm run dev       # Dev server (localhost:5173)
npm run check     # Type checking before commits
npm run format    # Format code
```

**Environment**: Requires `.env` with `MONGODB_URI`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET`

---

## Key Files Reference

**Server-only** (never import in client code):
- `src/lib/server/database.ts` - MongoDB singleton
- `src/lib/server/schemadb.ts` - Template/pin CRUD
- `src/lib/server/geocoding.ts` - Nominatim wrapper
- `src/lib/server/auth.ts` - JWT utilities

**Core Components**:
- `src/lib/PinManager.svelte` - Pin form with dynamic fields
- `src/lib/PinList.svelte` - Pin list with ⚠️ incomplete indicators
- `src/lib/SchemaBuilder.svelte` - Template configuration
- `src/lib/MapComponent.svelte` - Leaflet integration

**Extracted Modules** (Dec 2025 refactoring):
- `src/lib/features/` - Feature modules (geocoding, excelImport, tableResize, dragDrop, etc.)
- `src/lib/components/modals/` - Reusable modals (Modal, ColumnMappingModal, BulkEditModal, etc.)
- `src/lib/components/table/` - Table components (DataTable, TableHeader, TableCell)
- `src/lib/SchemaBuilder/` - SchemaBuilder sub-components and utilities
- `src/lib/utils/` - Utility functions (formatters, validation, videoEmbeds)
- `src/lib/services/` - Service modules (geocodingService, imageUploadService)

**API Routes**:
- `src/routes/api/pins/+server.ts` - Pin CRUD
- `src/routes/api/geocode/+server.ts` - Geocoding
- `src/routes/api/import-excel/+server.ts` - Excel import

**Types**: `src/lib/types.ts`
**Boundaries**: `src/lib/boundaries/` (PRG official data)

---

## Architecture Quick Facts

- **Auth**: JWT in httpOnly cookies, 7-day expiration, validated in `hooks.server.ts`
- **Database**: MongoDB, 2 collections (`settings`, `objects`), singleton connection
- **Geocoding**: OSM Nominatim, 500ms rate limit, postal code-first strategy
- **Boundaries**: PRG shapefiles (2,765 coords/gmina), TypeScript constants
- **Stack**: SvelteKit + Svelte 5 runes + TypeScript + Leaflet

**See**: `docs/ARCHITECTURE.md` for technical details

---

## Critical Gotchas

### Geocoding
- **Must use postal code first** - 95% success vs 60% for full address
- **Rate limit**: 500ms between Nominatim requests (enforced)
- **Rural addresses**: Often incomplete, extract postal from "Village, XX-XXX Gmina"
- **Query builder**: `buildGeocodingQueries()` in `geocoding.ts:156`

### Database
- **Connection string must include database name** - `mongodb://host:port/dbname`
- **Singleton pattern** - Don't create multiple connections
- **Optional location** - Pins can exist without coordinates (incomplete tracking)

### Authentication
- **Protected routes**: `/admin`, `/schema-builder`, `/map`, `/addPin`
- **Session validation**: Every request checked in `hooks.server.ts`
- **No client-side JWT access** - httpOnly cookies by design

### Boundaries
- **Missing gmina**: Ujazd (TERYT: 1016105) not in PRG shapefile
- **Large files**: 2,765 coords each, stored as TS constants (not API calls)
- **Format**: GeoJSON Polygon/MultiPolygon

### Excel Import
- **Supports null location** - Creates incomplete pins
- **Column mapping**: Auto-detection by name similarity
- **Multi-strategy geocoding**: Each row attempts multiple queries

---

## Known Issues & Technical Debt

**High Priority**:
- No rate limiting on auth endpoints
- Static files publicly accessible (no auth check)
- No global error boundary
- Keyboard navigation broken (a11y)

**Medium Priority**:
- No geocoding cache (repeat requests)
- Label warning in MultiDateInput.svelte:34
- Pre-existing type errors in seed/import-excel routes (54 errors)

**Resolved (Dec 2025)**:
- ~~CSS warnings in PinDetailPanel.svelte~~ - Fixed
- ~~Large file sizes~~ - Refactored (list 76%, PinManager 62% reduction)

**See**: `docs/WORKING-NOTES.md` for full list

---

## Active TODOs

**See**: `docs/TODO.md` for complete task list and feature roadmap

---

## Design Decisions

### Why Postal Code First for Geocoding?
Polish OSM data has excellent postal code coverage. Rural addresses often lack street names. Success rate: postal 95%, gmina 80%, full address 60%.

### Why Static Boundary Files?
2,765 coords/gmina too large for API responses. Chose bundle size over runtime API calls. See `docs/archive/BOUNDARY_APPROACHES.md` for alternatives.

### Why MongoDB?
Flexible schema for custom fields. No migrations needed. Simple native driver, no ORM overhead.

### Why JWT in httpOnly Cookies?
XSS protection (not JS-accessible). Stateless auth. Trade-off: Can't read from client, but that's the security feature.

---

## Documentation (`/docs`)

The `/docs` directory is the primary knowledge base for development. Always check here first.

### Core Files (Start Here)
- `WORKING-NOTES.md` - **Current status**, gotchas, uncommitted changes
- `TODO.md` - **Task list** with priorities and feature roadmap
- `ARCHITECTURE.md` - Technical reference, system design

### Active Development
- `REFACTORING-PLAN.md` - **Major restructuring complete** (~4327 lines removed across 25 sessions)
- `REFACTORING-WORKFLOW.md` - Step-by-step validation checklist for extractions

### Feature Documentation (`/docs/features/`)
Detailed docs for major subsystems:
- `Boundaries.md` - PRG boundary system, gmina data, LGD regions
- `Excel-Import.md` - Import workflow, column mapping, error handling
- `Geocoding.md` - Nominatim strategy, postal code approach, rate limiting

### Archive (`/docs/archive/`)
Historical context and completed work:
- `BOUNDARY_APPROACHES.md` - Design alternatives considered
- `SESSION_NOTES.md` - Dec 10, 2025 session log
- `Needed_changes.md` - Pre-production checklist
- `NOWE_FUNKCJE.md` - Feature notes (Polish)
- `CUSTOM_OVERLAY_IMAGE_DESIGN.md` - Overlay feature design
- `MAP_CUSTOMIZATION_ROADMAP.md` - Map theming plans
- `pin-system-overhaul-spec.md` - Pin schema redesign
- `implementation-guide.md` - Previous implementation reference
- `LGD_ZYWIECKI_RAJ_SUMMARY.md` - Boundary data sourcing

### Directory Structure
```
docs/
├── WORKING-NOTES.md      # Start here
├── TODO.md               # Tasks & features
├── ARCHITECTURE.md       # System design
├── REFACTORING-PLAN.md   # Current refactoring
├── REFACTORING-WORKFLOW.md
├── features/
│   ├── Boundaries.md
│   ├── Excel-Import.md
│   └── Geocoding.md
└── archive/              # Historical docs
```

---

## Commands

```bash
# Development
npm run dev       # Start dev server
npm run check     # TypeScript + Svelte validation
npm run lint      # ESLint + Prettier checks
npm run format    # Auto-format code

# Production
npm run build     # Build for production
npm run preview   # Preview production build
```

---

## Recent Changes (Dec 2025)

**Major Refactoring Complete**: ~4327 lines removed across 25 sessions
- Extracted 72+ modules from large components
- Created `src/lib/components/modals/` - Reusable modal components
- Created `src/lib/components/table/` - DataTable, TableHeader, TableCell
- Created `src/lib/features/` - Feature modules (geocoding, excelImport, etc.)
- Created `src/lib/utils/` and `src/lib/services/` - Utilities and services
- list/+page.svelte: 3734 → ~900 lines (76% reduction)
- PinManager.svelte: 2314 → ~890 lines (62% reduction)
- See `docs/REFACTORING-PLAN.md` for session-by-session details

**List Table UI** (Dec 25):
- Compact cells (max 2 lines)
- Row-based expansion (click any cell to expand row)
- All fonts converted to rem units
- Fixed column alignment with `table-layout: fixed`

**Geocoding**: Postal code-first strategy, rural address support
**Excel Import**: Column mapping modal, incomplete data tracking
**Boundaries**: LGD Buduj Razem 19/20 gminas added

**Git status**: See `docs/WORKING-NOTES.md` for uncommitted changes

---

*This file is intentionally concise. For working context, see `docs/WORKING-NOTES.md`.*
