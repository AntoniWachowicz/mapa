import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Temporary storage for uploaded Excel files
const TEMP_DIR = 'static/uploads/temp';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('excel') as File;

    if (!file) {
      throw error(400, 'No Excel file provided');
    }

    // Read Excel file
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array' });

    // Save file temporarily for import step
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
    const tempId = randomUUID();
    const tempPath = join(TEMP_DIR, `${tempId}.xlsx`);
    writeFileSync(tempPath, Buffer.from(bytes));

    // Get first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!jsonData || jsonData.length < 2) {
      throw error(400, 'Excel file must contain at least a header row and one data row');
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];

    // Filter out instruction rows and empty rows
    const dataRows = rows.filter((row) => {
      // Skip rows that look like instructions
      const firstCell = row[0] ? String(row[0]).toLowerCase() : '';
      if (firstCell.includes('instrukcje') || firstCell.includes('wpisz') || firstCell.includes('jeśli') || firstCell.includes('⬇')) {
        return false;
      }

      // Skip completely empty rows
      const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
      return hasData;
    });

    // Clean headers (remove instruction text in parentheses)
    const cleanedHeaders = headers.map(header =>
      String(header || '').replace(/\s*\([^)]*\)\s*$/g, '').trim()
    );

    // Get sample data (first 3 rows)
    const sampleData = dataRows.slice(0, 3).map(row => {
      const rowData: Record<string, any> = {};
      cleanedHeaders.forEach((header, index) => {
        if (header) {
          rowData[header] = row[index] !== undefined && row[index] !== null
            ? String(row[index]).trim()
            : '';
        }
      });
      return rowData;
    });

    return json({
      success: true,
      tempId, // ID to retrieve file in import step
      headers: cleanedHeaders.filter(h => h), // Remove empty headers
      sampleData,
      totalRows: dataRows.length
    });

  } catch (err) {
    console.error('Excel analysis error:', err);
    throw error(500, 'Failed to analyze Excel file');
  }
};
