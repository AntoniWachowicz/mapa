/**
 * Import Row Processor
 * Handles processing of Excel import rows with validation and aggregation.
 */

import type { Template, ProjectData } from '$lib/types.js';
import { mapImportRowToFields, type ImportRowData } from '$lib/utils/importRowMapper.js';

export type { ImportRowData };

export interface ImportProcessResult {
  importedCount: number;
  incompleteCount: number;
  sortedRowIndices: number[];
}

/**
 * Validate that rows are selected for import
 */
export function validateRowSelection(selectedRows: Set<number>): boolean {
  return selectedRows.size > 0;
}

/**
 * Process selected Excel rows and save them
 * Returns counts and indices for result aggregation
 */
export async function processImportRows(
  selectedRowIndices: Set<number>,
  importedData: ImportRowData[],
  template: Template,
  onSave: (data: ProjectData, hasIncompleteData?: boolean) => Promise<void>
): Promise<ImportProcessResult> {
  let importedCount = 0;
  const sortedRowIndices = Array.from(selectedRowIndices).sort((a, b) => a - b);

  for (const rowIndex of sortedRowIndices) {
    const rowData = importedData[rowIndex];
    if (rowData && rowData.coordinates) {
      // Map row data to template fields
      const mappedRow = mapImportRowToFields(template, rowData);

      // Save the object with incomplete data flag
      await onSave(mappedRow.data, mappedRow.hasIncompleteData);
      importedCount++;
    }
  }

  // Calculate incomplete count from original data
  const incompleteCount = importedData.filter((row, index) =>
    sortedRowIndices.includes(index) && row.hasIncompleteData
  ).length;

  return {
    importedCount,
    incompleteCount,
    sortedRowIndices
  };
}

/**
 * Format import success message based on results
 */
export function formatImportSuccessMessage(result: ImportProcessResult): string {
  if (result.incompleteCount > 0) {
    return `Pomyślnie zaimportowano ${result.importedCount} pinezek. ${result.incompleteCount} pinezek ma niekompletne dane i zostanie oznaczone na mapie.`;
  } else {
    return `Pomyślnie zaimportowano ${result.importedCount} pinezek.`;
  }
}
