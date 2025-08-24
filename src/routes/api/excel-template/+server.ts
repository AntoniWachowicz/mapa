import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import type { Template } from '$lib/types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { template } = await request.json() as { template: Template };
    
    if (!template) {
      throw error(400, 'Template is required');
    }
    
    // Prepare headers for the Excel template
    const headers: string[] = ['Szerokość (Lat)', 'Długość (Lng)'];
    
    // Add field columns (excluding coordinates and complex types)
    template.fields.forEach(field => {
      if (field.visible && field.key !== 'coordinates') {
        const columnName = field.displayLabel || field.label;
        
        // Add notes for complex field types
        if (field.type === 'tags') {
          headers.push(`${columnName} (zostanie puste - uzupełnij w aplikacji)`);
        } else if (field.type === 'image') {
          headers.push(`${columnName} (wklej URL obrazu)`);
        } else if (field.type === 'youtube') {
          headers.push(`${columnName} (wklej URL YouTube)`);
        } else if (field.type === 'checkbox') {
          headers.push(`${columnName} (wpisz: tak/nie)`);
        } else if (field.type === 'select' && field.selectConfig) {
          const options = field.selectConfig.options.join('/');
          headers.push(`${columnName} (opcje: ${options})`);
        } else if (field.type === 'address') {
          headers.push(`${columnName} (pełny adres w Polsce)`);
        } else if (field.type === 'currency') {
          headers.push(`${columnName} (kwota w zł)`);
        } else if (field.type === 'percentage') {
          headers.push(`${columnName} (liczba 0-100)`);
        } else if (field.type === 'date') {
          headers.push(`${columnName} (RRRR-MM-DD)`);
        } else {
          headers.push(columnName);
        }
      }
    });
    
    // Create example data rows
    const exampleRows: any[][] = [];
    
    // Add instruction row
    const instructionRow = ['⬇ INSTRUKCJE ⬇'];
    headers.slice(1).forEach(() => instructionRow.push(''));
    exampleRows.push(instructionRow);
    
    // Add coordinate instructions
    const coordInstructions = [
      'Wpisz współrzędne lub adres',
      'Jeśli podasz adres, współrzędne zostaną znalezione automatycznie'
    ];
    headers.slice(2).forEach(() => coordInstructions.push(''));
    exampleRows.push(coordInstructions);
    
    // Add empty separator row
    const separatorRow = Array(headers.length).fill('');
    exampleRows.push(separatorRow);
    
    // Add example data row
    const exampleRow = ['52.229676', '21.012229']; // Warsaw coordinates
    
    template.fields.forEach(field => {
      if (field.visible && field.key !== 'coordinates') {
        if (field.type === 'tags') {
          exampleRow.push('(zostanie puste)');
        } else if (field.type === 'text' || field.type === 'textarea') {
          exampleRow.push('Przykładowy tekst');
        } else if (field.type === 'number') {
          exampleRow.push('123');
        } else if (field.type === 'currency') {
          exampleRow.push('1000.50');
        } else if (field.type === 'percentage') {
          exampleRow.push('75');
        } else if (field.type === 'email') {
          exampleRow.push('przykład@email.pl');
        } else if (field.type === 'url') {
          exampleRow.push('https://example.com');
        } else if (field.type === 'date') {
          exampleRow.push('2024-12-31');
        } else if (field.type === 'address') {
          exampleRow.push('ul. Marszałkowska 1, Warszawa');
        } else if (field.type === 'checkbox') {
          exampleRow.push('tak');
        } else if (field.type === 'select' && field.selectConfig) {
          exampleRow.push(field.selectConfig.options[0] || 'opcja1');
        } else if (field.type === 'image') {
          exampleRow.push('https://example.com/obraz.jpg');
        } else if (field.type === 'youtube') {
          exampleRow.push('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        } else {
          exampleRow.push('przykład');
        }
      }
    });
    
    exampleRows.push(exampleRow);
    
    // Create second example row for address-based import
    const addressExampleRow = ['', '']; // Empty coordinates - will be filled by geocoding
    template.fields.forEach(field => {
      if (field.visible && field.key !== 'coordinates') {
        if (field.type === 'address') {
          addressExampleRow.push('Plac Zamkowy 4, Kraków');
        } else if (field.type === 'tags') {
          addressExampleRow.push('(zostanie puste)');
        } else if (field.type === 'text' || field.type === 'textarea') {
          addressExampleRow.push('Inny przykład');
        } else {
          addressExampleRow.push(''); // Empty for other fields in this example
        }
      }
    });
    
    exampleRows.push(addressExampleRow);
    
    // Combine headers and example data
    const allRows = [headers, ...exampleRows];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    
    // Set column widths
    const colWidths = headers.map(header => ({ wch: Math.max(header.length, 15) }));
    worksheet['!cols'] = colWidths;
    
    // Style the header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: 'D4E6F1' } },
        font: { bold: true }
      };
    }
    
    // Style the instruction rows
    for (let row = 1; row <= 2; row++) {
      for (let col = 0; col < headers.length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: 'FFF3CD' } },
            font: { italic: true }
          };
        }
      }
    }
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Szablon Pinezek');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });
    
    // Return file as response
    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="szablon-pinezki-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
    
  } catch (err) {
    console.error('Excel template generation error:', err);
    throw error(500, 'Failed to generate Excel template');
  }
};