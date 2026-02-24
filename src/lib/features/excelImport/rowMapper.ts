/**
 * Excel Row Mapper
 * Maps Excel row data to schema fields with type conversion.
 */

import { convertValueByFieldType } from './dataConverter.js';

export interface MappedRowResult {
  /** Data mapped to schema field keys */
  data: Record<string, any>;
  /** Parsed coordinates if lat/lng columns were mapped */
  coordinates: { lat: number; lng: number } | null;
  /** Whether valid coordinates were found */
  hasCoordinates: boolean;
}

export interface ColumnMapping {
  [excelColumn: string]: string; // Excel column name -> schema field key or special value
}

/**
 * Special mapping values for coordinate columns
 */
export const SPECIAL_MAPPINGS = {
  LATITUDE: '_latitude',
  LONGITUDE: '_longitude',
  SKIP: '_skip',
  GEOCODE: '_geocode'
} as const;

/**
 * Find latitude and longitude column mappings
 * @param columnMapping - Mapping of Excel columns to schema fields
 * @returns Object with lat and lng column names, or null if not found
 */
export function findCoordinateColumns(
  columnMapping: ColumnMapping
): { latColumn: string | null; lngColumn: string | null } {
  let latColumn: string | null = null;
  let lngColumn: string | null = null;

  for (const [excelCol, schemaField] of Object.entries(columnMapping)) {
    if (schemaField === SPECIAL_MAPPINGS.LATITUDE) latColumn = excelCol;
    if (schemaField === SPECIAL_MAPPINGS.LONGITUDE) lngColumn = excelCol;
  }

  return { latColumn, lngColumn };
}

/**
 * Map a single Excel row to schema fields with type conversion
 * @param originalData - Raw data from Excel row (column name -> value)
 * @param columnMapping - Mapping of Excel columns to schema fields
 * @param fieldTypeMap - Map of schema field key to field type
 * @returns Mapped data and coordinates
 */
export function mapExcelRowToObject(
  originalData: Record<string, any>,
  columnMapping: ColumnMapping,
  fieldTypeMap: Record<string, string>
): MappedRowResult {
  const mappedData: Record<string, any> = {};
  const { latColumn, lngColumn } = findCoordinateColumns(columnMapping);

  // Map Excel columns to schema fields with type conversion
  for (const [excelCol, schemaField] of Object.entries(columnMapping)) {
    // Skip special coordinate mappings and empty/skip mappings
    if (
      schemaField === SPECIAL_MAPPINGS.LATITUDE ||
      schemaField === SPECIAL_MAPPINGS.LONGITUDE ||
      schemaField === SPECIAL_MAPPINGS.SKIP ||
      schemaField === SPECIAL_MAPPINGS.GEOCODE ||
      schemaField === ''
    ) {
      continue;
    }

    // Get the value from the original Excel data
    const rawValue = originalData[excelCol];
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      // Check for dot-notation subfield mapping (e.g. 'address.street', 'dates.submitted')
      if (schemaField.includes('.')) {
        const [parentKey, subKey] = schemaField.split('.', 2);
        // Initialize parent object if needed
        if (!mappedData[parentKey] || typeof mappedData[parentKey] !== 'object') {
          mappedData[parentKey] = {};
        }
        // For price.total, parse as number
        const parentType = fieldTypeMap[parentKey] || 'text';
        if (parentType === 'price' && subKey === 'total') {
          const num = parseFloat(String(rawValue).replace(/,/g, '.').replace(/[^\d.-]/g, ''));
          if (!isNaN(num)) {
            (mappedData[parentKey] as Record<string, any>)[subKey] = num;
          }
        } else if (parentType === 'multidate') {
          // Parse as date
          const date = new Date(rawValue);
          (mappedData[parentKey] as Record<string, any>)[subKey] = isNaN(date.getTime()) ? rawValue : date.toISOString();
        } else {
          // Address and other subfields: store as string
          (mappedData[parentKey] as Record<string, any>)[subKey] = String(rawValue).trim();
        }
      } else {
        // Simple field mapping
        const fieldType = fieldTypeMap[schemaField] || 'text';
        const convertedValue = convertValueByFieldType(rawValue, fieldType);

        if (convertedValue !== null) {
          mappedData[schemaField] = convertedValue;
        }
      }
    }
  }

  // Parse coordinates
  let coordinates: { lat: number; lng: number } | null = null;
  if (latColumn && lngColumn && originalData[latColumn] && originalData[lngColumn]) {
    const lat = parseFloat(originalData[latColumn]);
    const lng = parseFloat(originalData[lngColumn]);
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates = { lat, lng };
    }
  }

  return {
    data: mappedData,
    coordinates,
    hasCoordinates: coordinates !== null
  };
}

/**
 * Build the payload for saving an imported object
 * @param mappedResult - Result from mapExcelRowToObject
 * @returns Payload ready for POST to /api/objects
 */
export function buildImportPayload(mappedResult: MappedRowResult): {
  data: Record<string, any>;
  hasIncompleteData: boolean;
  missingFields: string[];
  location?: { type: 'Point'; coordinates: [number, number] };
} {
  const payload: any = {
    data: mappedResult.data,
    hasIncompleteData: !mappedResult.hasCoordinates,
    missingFields: mappedResult.hasCoordinates ? [] : ['location']
  };

  if (mappedResult.coordinates) {
    payload.location = {
      type: 'Point',
      coordinates: [mappedResult.coordinates.lng, mappedResult.coordinates.lat]
    };
  }

  return payload;
}
