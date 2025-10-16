// src/lib/boundaries.ts - Re-export from new boundaries module for backward compatibility
// This file is kept for backward compatibility. New code should import from './boundaries/index.js'

export {
  ZYWIECKI_RAJ_BOUNDARY,
  BOUNDARY_REGISTRY,
  getBoundaryById,
  getBoundariesByCategory,
  calculatePolygonBounds,
  type BoundaryRegion
} from './boundaries/index.js';