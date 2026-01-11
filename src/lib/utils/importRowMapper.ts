/**
 * Import Row Mapper Utility
 * Maps imported Excel row data to template fields with fuzzy field matching.
 */

import type { Template, ProjectData } from '$lib/types.js';

export interface ImportRowData {
  coordinates?: { lat: number; lng: number };
  hasIncompleteData?: boolean;
  originalData: Record<string, any>;
}

export interface MappedRowResult {
  data: ProjectData;
  hasIncompleteData: boolean;
}

/**
 * Map imported row data to template fields
 * Uses fuzzy matching to find corresponding fields in imported data
 */
export function mapImportRowToFields(
  template: Template,
  rowData: ImportRowData
): MappedRowResult {
  const newData: ProjectData = {};
  let hasIncompleteData = rowData.hasIncompleteData || false;

  // Map original data to template fields
  // Note: coordinates are no longer stored in form data, they're in GeoJSON location
  template.fields.forEach(field => {
    if (field.type === 'tags') {
      // Tags can't be imported from Excel - mark as incomplete
      newData[field.key] = { majorTag: null, minorTags: [] };
      if (field.required) {
        hasIncompleteData = true;
      }
    } else {
      // Try to find matching field in imported data using fuzzy matching
      const matchingKey = Object.keys(rowData.originalData).find(key =>
        key.toLowerCase().includes(field.key.toLowerCase()) ||
        field.key.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase() === (field.displayLabel || field.label).toLowerCase()
      );

      if (
        matchingKey &&
        rowData.originalData[matchingKey] !== undefined &&
        rowData.originalData[matchingKey] !== ''
      ) {
        const value = rowData.originalData[matchingKey];
        newData[field.key] = String(value);
      } else {
        newData[field.key] = '';

        if (field.required) {
          hasIncompleteData = true;
        }
      }
    }
  });

  return {
    data: newData,
    hasIncompleteData
  };
}
