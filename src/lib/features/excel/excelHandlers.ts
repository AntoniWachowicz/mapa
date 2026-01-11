/**
 * Excel I/O Service
 * Handles Excel import/export operations for pin management.
 * Provides utilities for template download, file analysis, data import, and export.
 */

import type { Template, SavedObject } from '$lib/types.js';

/**
 * Download result from Excel analysis
 */
export interface ExcelAnalysisResult {
  success: boolean;
  tempId: string;
  headers: string[];
  sampleData: any[];
}

/**
 * Result from Excel import operation
 */
export interface ExcelImportResult {
  success: boolean;
  data: any[];
  incompleteDataCount?: number;
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Download Excel template for the given schema
 */
export async function downloadExcelTemplate(template: Template): Promise<void> {
  if (!template) {
    throw new Error('Brak zdefiniowanego schematu');
  }

  const response = await fetch('/api/excel-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ template })
  });

  if (!response.ok) {
    throw new Error('Błąd podczas pobierania szablonu');
  }

  const blob = await response.blob();
  const filename = `szablon-pinezki-${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, filename);
}

/**
 * Analyze uploaded Excel file and return headers/sample data
 */
export async function analyzeExcelFile(
  file: File,
  signal?: AbortSignal
): Promise<ExcelAnalysisResult> {
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    throw new Error('Proszę wybrać plik Excel (.xlsx lub .xls)');
  }

  const formData = new FormData();
  formData.append('excel', file);

  const response = await fetch('/api/analyze-excel', {
    method: 'POST',
    body: formData,
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error('Błąd podczas analizy pliku Excel');
  }

  return result;
}

/**
 * Convert column mapping from modal format to API format
 * Handles special fields: _latitude, _longitude, _geocode, _skip
 */
export function convertColumnMappingToApiFormat(
  columnMapping: Record<string, string>
): Record<string, string> {
  const apiColumnMapping: Record<string, string> = {};

  for (const [excelCol, modalValue] of Object.entries(columnMapping)) {
    if (modalValue === '_latitude') {
      apiColumnMapping[excelCol] = 'latitude';
    } else if (modalValue === '_longitude') {
      apiColumnMapping[excelCol] = 'longitude';
    } else if (modalValue === '_geocode') {
      apiColumnMapping[excelCol] = 'geocode';
    } else if (modalValue === '_skip' || modalValue === '') {
      apiColumnMapping[excelCol] = 'ignore';
    } else {
      // Regular field mapping
      apiColumnMapping[excelCol] = modalValue;
    }
  }

  return apiColumnMapping;
}

/**
 * Import Excel data using temporary file ID and column mapping
 */
export async function importExcelWithMapping(
  tempId: string,
  columnMapping: Record<string, string>,
  signal?: AbortSignal
): Promise<ExcelImportResult> {
  if (!tempId) {
    throw new Error('Błąd: Brak danych pliku Excel. Proszę wybrać plik ponownie.');
  }

  const apiColumnMapping = convertColumnMappingToApiFormat(columnMapping);

  const response = await fetch('/api/import-excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempId, columnMapping: apiColumnMapping }),
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error('Błąd podczas importu pliku Excel');
  }

  return result;
}

/**
 * Export objects to Excel file
 */
export async function exportToExcel(
  objects: SavedObject[],
  template: Template
): Promise<void> {
  if (!template || !objects || objects.length === 0) {
    throw new Error('Brak danych do eksportu');
  }

  const response = await fetch('/api/export-excel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      objects: objects,
      template: template
    })
  });

  if (!response.ok) {
    throw new Error('Błąd podczas eksportu do Excel');
  }

  const blob = await response.blob();
  const filename = `pinezki-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, filename);
}
