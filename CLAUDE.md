# CLAUDE.md

LLM-focused development guide for this SvelteKit mapping application.

**PRIMARY REFERENCE**: `docs/WORKING-NOTES.md` - Start here for current context, known issues, and technical debt.

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
- CSS warnings in PinDetailPanel.svelte:580,589
- No geocoding cache (repeat requests)
- Label warning in MultiDateInput.svelte:34

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

## Documentation

**LLM Development**:
- `docs/WORKING-NOTES.md` - Current status, gotchas, TODOs
- `docs/ARCHITECTURE.md` - Technical reference

**Archive** (historical context):
- `docs/archive/BOUNDARY_APPROACHES.md` - Design alternatives
- `docs/archive/SESSION_NOTES.md` - Dec 10, 2025 session
- `docs/archive/Needed_changes.md` - Pre-production checklist

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

**Geocoding**: Postal code-first strategy, rural address support
**Excel Import**: Column mapping modal, incomplete data tracking
**Boundaries**: LGD Buduj Razem 19/20 gminas added
**Docs**: Restructured from tutorial-style to LLM working notes

**Git status**: See `docs/WORKING-NOTES.md` for uncommitted changes

---

*This file is intentionally concise. For working context, see `docs/WORKING-NOTES.md`.*
