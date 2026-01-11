/**
 * Excel Import Feature Module
 * Public API for Excel import functionality including data conversion utilities.
 */

// Re-export data conversion functions
export { convertValueByFieldType, buildFieldTypeMap } from './dataConverter.js';

// Re-export header processing
export { processExcelHeaders } from './headerProcessor.js';
export type { ProcessedExcelData } from './headerProcessor.js';

// Re-export row mapping
export {
  mapExcelRowToObject,
  buildImportPayload,
  findCoordinateColumns,
  SPECIAL_MAPPINGS
} from './rowMapper.js';
export type { MappedRowResult, ColumnMapping } from './rowMapper.js';
