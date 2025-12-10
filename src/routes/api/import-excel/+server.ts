import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = 'static/uploads/temp';

export const POST: RequestHandler = async ({ request }) => {
  try {
    let bytes: ArrayBuffer | Buffer;
    let columnMapping: Record<string, string> = {};

    const contentType = request.headers.get('content-type') || '';

    // Check if it's FormData (multipart) or JSON
    // FormData is used by list page for simple direct upload
    // JSON with tempId is used by PinManager for column mapping flow
    if (contentType.includes('multipart') || contentType.includes('form-data')) {
      // Simple flow: Direct file upload (used by list page)
      const formData = await request.formData();
      const file = formData.get('file') || formData.get('excel');

      if (!file || !(file instanceof File)) {
        throw error(400, 'No Excel file provided');
      }

      bytes = await file.arrayBuffer();
    } else if (contentType.includes('application/json')) {
      // Complex flow: tempId from analyze-excel (used by PinManager with column mapping)
      const body = await request.json();
      const { tempId, columnMapping: mapping = {} } = body;
      columnMapping = mapping;

      if (!tempId) {
        throw error(400, 'No temp file ID provided');
      }

      const tempPath = join(TEMP_DIR, `${tempId}.xlsx`);
      if (!existsSync(tempPath)) {
        throw error(400, 'Temp file not found - please re-upload');
      }

      bytes = readFileSync(tempPath);

      // Clean up temp file
      try {
        unlinkSync(tempPath);
      } catch (e) {
        console.warn('Could not delete temp file:', e);
      }
    } else {
      // Unknown content type - try FormData as fallback
      try {
        const formData = await request.formData();
        const file = formData.get('file') || formData.get('excel');
        if (file && file instanceof File) {
          bytes = await file.arrayBuffer();
        } else {
          throw error(400, 'No Excel file provided - unsupported content type');
        }
      } catch {
        throw error(400, 'Invalid request format - expected FormData or JSON');
      }
    }

    // Process the Excel file (same logic for both flows)
    const workbook = XLSX.read(bytes, { type: bytes instanceof Buffer ? 'buffer' : 'array' });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!jsonData || jsonData.length < 2) {
      throw error(400, 'Excel file must contain at least a header row and one data row');
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];

    // Filter out instruction rows and empty rows
    const dataRows = rows.filter((row) => {
      const firstCell = row[0] ? String(row[0]).toLowerCase() : '';
      if (firstCell.includes('instrukcje') || firstCell.includes('wpisz') || firstCell.includes('jeśli')) {
        return false;
      }
      const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
      return hasData;
    });

    const processedRows = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowData: any = {};

      headers.forEach((header, index) => {
        const cellValue = row[index];
        if (cellValue !== undefined && cellValue !== null) {
          const cleanHeader = header.replace(/\s*\([^)]*\)\s*$/g, '').trim();
          rowData[cleanHeader] = String(cellValue).trim();
        }
      });

      if (Object.keys(rowData).length === 0) {
        continue;
      }

      let coordinates = null;
      let hasIncompleteData = false;

      // Determine lat/lng columns (from mapping or auto-detect)
      let latColumn: string | null = null;
      let lngColumn: string | null = null;

      if (Object.keys(columnMapping).length > 0) {
        // Use explicit column mapping
        for (const [excelColumn, mapping] of Object.entries(columnMapping)) {
          const cleanHeader = excelColumn.replace(/\s*\([^)]*\)\s*$/g, '').trim();
          if (mapping === 'latitude') {
            latColumn = cleanHeader;
          } else if (mapping === 'longitude') {
            lngColumn = cleanHeader;
          }
        }
      } else {
        // Auto-detect lat/lng columns
        const latFields = ['lat', 'latitude', 'szerokość', 'szerokosc'];
        const lngFields = ['lng', 'lon', 'longitude', 'długość', 'dlugosc'];

        const latField = headers.find(h => {
          const cleanH = h.replace(/\s*\([^)]*\)\s*$/g, '').trim().toLowerCase();
          return latFields.some(lf => cleanH.includes(lf.toLowerCase()));
        });
        const lngField = headers.find(h => {
          const cleanH = h.replace(/\s*\([^)]*\)\s*$/g, '').trim().toLowerCase();
          return lngFields.some(lf => cleanH.includes(lf.toLowerCase()));
        });

        latColumn = latField ? latField.replace(/\s*\([^)]*\)\s*$/g, '').trim() : null;
        lngColumn = lngField ? lngField.replace(/\s*\([^)]*\)\s*$/g, '').trim() : null;
      }

      // Parse coordinates
      if (latColumn && lngColumn && rowData[latColumn] && rowData[lngColumn]) {
        const lat = parseFloat(rowData[latColumn]);
        const lng = parseFloat(rowData[lngColumn]);
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates = { lat, lng };
        }
      }

      // Check for incomplete data markers
      Object.keys(rowData).forEach(key => {
        const value = rowData[key];
        if (typeof value === 'string' && value.includes('zostanie puste')) {
          hasIncompleteData = true;
          delete rowData[key];
        }
      });

      processedRows.push({
        originalData: rowData,
        coordinates,
        rowIndex: i + 1,
        hasIncompleteData
      });
    }

    return json({
      success: true,
      headers: headers.map(h => h.replace(/\s*\([^)]*\)\s*$/g, '').trim()),
      data: processedRows,
      totalRows: processedRows.length,
      incompleteDataCount: processedRows.filter(row => row.hasIncompleteData).length
    });

  } catch (err: any) {
    console.error('Excel import error:', err);
    if (err.status) {
      throw err;
    }
    throw error(500, 'Failed to import Excel file');
  }
};
