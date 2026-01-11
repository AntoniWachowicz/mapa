/**
 * Excel Header Processing
 * Processes raw Excel data to extract headers and format data rows.
 */

export interface ProcessedExcelData {
  /** Column headers extracted from the selected row */
  headers: string[];
  /** All data rows wrapped with originalData property */
  allData: Array<{ originalData: Record<string, any> }>;
  /** First 3 rows for preview in mapping modal */
  sampleData: Record<string, any>[];
}

/**
 * Process raw Excel data by extracting headers and formatting data rows
 * @param rawData - 2D array of raw Excel cell values
 * @param headerRowIndex - Index of the row containing headers (0-based)
 * @returns Processed data with headers, all data, and sample data
 */
export function processExcelHeaders(
  rawData: any[][],
  headerRowIndex: number
): ProcessedExcelData {
  if (rawData.length === 0 || headerRowIndex >= rawData.length) {
    return { headers: [], allData: [], sampleData: [] };
  }

  // Extract headers from selected row, filtering empty cells
  const headers = rawData[headerRowIndex]
    .map((cell: any) => String(cell || '').trim())
    .filter((h: string) => h !== '');

  // Extract data rows (everything after the header row)
  const dataRows = rawData.slice(headerRowIndex + 1);

  // Convert to object format with originalData wrapper
  const allData = dataRows
    .map((row: any[]) => {
      const rowData: Record<string, any> = {};
      headers.forEach((header, index) => {
        const cellValue = row[index];
        if (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
          rowData[header] = String(cellValue).trim();
        }
      });
      return { originalData: rowData };
    })
    .filter((row) => Object.keys(row.originalData).length > 0);

  // Create sample data for preview (first 3 rows)
  const sampleData = allData.slice(0, 3).map((row) => row.originalData);

  return { headers, allData, sampleData };
}
