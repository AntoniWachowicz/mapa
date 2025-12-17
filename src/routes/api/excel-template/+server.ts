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

    // Track columns that need data validation
    interface ValidationRule {
      column: number;
      type: 'list' | 'checkbox' | 'date';
      options?: string[];
      fieldRequired?: boolean;
    }
    const validationRules: ValidationRule[] = [];
    let currentColumn = 2; // Start after lat/lng

    // Add field columns - with multi-column support for complex types
    template.fields.forEach(field => {
      if (field.visible && field.key !== 'coordinates') {
        const columnName = field.displayLabel || field.label;
        const fieldType = field.fieldType || field.type; // Support both new and legacy systems

        // TIER 2: Multi-column complex fields
        if (fieldType === 'multidate' && field.config) {
          const config = field.config as any;
          if (config.dateFields) {
            config.dateFields.forEach((df: any) => {
              headers.push(`${df.label} (RRRR-MM-DD)${df.required ? ' *' : ''}`);
              validationRules.push({ column: currentColumn++, type: 'date', fieldRequired: df.required });
            });
          }
        } else if (fieldType === 'address' && field.config) {
          const config = field.config as any;
          const addressFields = config.displayFields || ['street', 'number', 'postalCode', 'city', 'gmina'];
          const requiredFields = config.requiredFields || [];

          const fieldLabels: Record<string, string> = {
            street: 'Ulica',
            number: 'Numer',
            postalCode: 'Kod pocztowy',
            city: 'Miasto',
            gmina: 'Gmina'
          };

          addressFields.forEach((fieldKey: string) => {
            const isRequired = requiredFields.includes(fieldKey);
            headers.push(`${columnName} - ${fieldLabels[fieldKey]}${isRequired ? ' *' : ''}`);
            currentColumn++;
          });
        } else if (fieldType === 'links') {
          headers.push(`${columnName} (format: Nazwa|URL; oddziel średnikiem)`);
          currentColumn++;
        } else if (fieldType === 'price' && field.config) {
          const config = field.config as any;
          headers.push(`${columnName} - Całkowity koszt (${config.currency || 'PLN'})`);
          currentColumn++;

          if (config.defaultFundingSources && config.defaultFundingSources.length > 0) {
            config.defaultFundingSources.forEach((source: string, idx: number) => {
              headers.push(`Źródło ${idx + 1}: ${source} (kwota)`);
              currentColumn++;
              if (config.showPercentages) {
                headers.push(`Źródło ${idx + 1}: ${source} (%)`);
                currentColumn++;
              }
            });
          } else {
            headers.push(`Źródło finansowania 1 (nazwa)`);
            currentColumn++;
            headers.push(`Źródło finansowania 1 (kwota)`);
            currentColumn++;
          }
        } else if (fieldType === 'gallery') {
          headers.push(`${columnName} - URLs (oddziel średnikiem)`);
          currentColumn++;
          headers.push(`${columnName} - Opisy (oddziel średnikiem, opcjonalne)`);
          currentColumn++;
        }
        // TIER 3: Limited support fields
        else if (fieldType === 'richtext') {
          headers.push(`${columnName} (tekst bez formatowania, sformatuj w aplikacji)`);
          currentColumn++;
        } else if (fieldType === 'files') {
          headers.push(`${columnName} (dodaj pliki w aplikacji po imporcie)`);
          currentColumn++;
        } else if (fieldType === 'tags' || field.type === 'tags') {
          headers.push(`${columnName} (zostanie puste - uzupełnij w aplikacji)`);
          currentColumn++;
        } else if (fieldType === 'category') {
          headers.push(`${columnName} (zostanie puste - uzupełnij w aplikacji)`);
          currentColumn++;
        }
        else if (field.type === 'address') {
          headers.push(`${columnName} (pełny adres w Polsce)`);
          currentColumn++;
        } else {
          headers.push(`${columnName}${field.required ? ' *' : ''}`);
          currentColumn++;
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
        const fieldType = field.fieldType || field.type;

        // TIER 2: Multi-column complex fields
        if (fieldType === 'multidate' && field.config) {
          const config = field.config as any;
          if (config.dateFields) {
            config.dateFields.forEach(() => {
              exampleRow.push('2024-12-31');
            });
          }
        } else if (fieldType === 'address' && field.config) {
          const config = field.config as any;
          const addressFields = config.displayFields || ['street', 'number', 'postalCode', 'city', 'gmina'];
          const exampleData: Record<string, string> = {
            street: 'Marszałkowska',
            number: '1',
            postalCode: '00-624',
            city: 'Warszawa',
            gmina: 'Warszawa'
          };
          addressFields.forEach((fieldKey: string) => {
            exampleRow.push(exampleData[fieldKey] || '');
          });
        } else if (fieldType === 'links') {
          exampleRow.push('Strona główna|https://example.com; Facebook|https://fb.com/example');
        } else if (fieldType === 'price' && field.config) {
          const config = field.config as any;
          exampleRow.push('150000'); // Total cost

          if (config.defaultFundingSources && config.defaultFundingSources.length > 0) {
            config.defaultFundingSources.forEach(() => {
              exampleRow.push('100000'); // Amount
              if (config.showPercentages) {
                exampleRow.push('66.67'); // Percentage
              }
            });
          } else {
            exampleRow.push('100000'); // Amount for source 1
          }
        } else if (fieldType === 'gallery') {
          exampleRow.push('https://example.com/img1.jpg; https://example.com/img2.jpg');
          exampleRow.push('Opis pierwszego zdjęcia; Opis drugiego zdjęcia');
        }
        // TIER 3: Limited support fields
        else if (fieldType === 'richtext') {
          exampleRow.push('Zwykły tekst bez formatowania');
        } else if (fieldType === 'files') {
          exampleRow.push('(zostanie puste)');
        } else if (fieldType === 'tags' || field.type === 'tags') {
          exampleRow.push('(zostanie puste)');
        } else if (fieldType === 'category') {
          exampleRow.push('(zostanie puste)');
        }
        else if (field.type === 'address') {
          exampleRow.push('ul. Marszałkowska 1, Warszawa');
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
        const fieldType = field.fieldType || field.type;

        // TIER 2: Multi-column complex fields - fill with empty values for simplicity
        if (fieldType === 'multidate' && field.config) {
          const config = field.config as any;
          if (config.dateFields) {
            config.dateFields.forEach(() => {
              addressExampleRow.push('');
            });
          }
        } else if (fieldType === 'address' && field.config) {
          const config = field.config as any;
          const addressFields = config.displayFields || ['street', 'number', 'postalCode', 'city', 'gmina'];
          const krakowData: Record<string, string> = {
            street: 'Plac Zamkowy',
            number: '4',
            postalCode: '31-001',
            city: 'Kraków',
            gmina: 'Kraków'
          };
          addressFields.forEach((fieldKey: string) => {
            addressExampleRow.push(krakowData[fieldKey] || '');
          });
        } else if (fieldType === 'links') {
          addressExampleRow.push('');
        } else if (fieldType === 'price' && field.config) {
          const config = field.config as any;
          addressExampleRow.push(''); // Total

          if (config.defaultFundingSources && config.defaultFundingSources.length > 0) {
            config.defaultFundingSources.forEach(() => {
              addressExampleRow.push('');
              if (config.showPercentages) {
                addressExampleRow.push('');
              }
            });
          } else {
            addressExampleRow.push('');
          }
        } else if (fieldType === 'gallery') {
          addressExampleRow.push('');
          addressExampleRow.push('');
        } else if (fieldType === 'richtext' || fieldType === 'files' || fieldType === 'tags' || fieldType === 'category') {
          addressExampleRow.push('');
        }
        else if (field.type === 'address') {
          addressExampleRow.push('Plac Zamkowy 4, Kraków');
        } else if (field.type === 'tags') {
          addressExampleRow.push('(zostanie puste)');
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

    // Apply data validation rules
    if (!worksheet['!dataValidation']) {
      worksheet['!dataValidation'] = [];
    }

    validationRules.forEach(rule => {
      const colLetter = XLSX.utils.encode_col(rule.column);

      if (rule.type === 'list' && rule.options) {
        // Create dropdown list validation
        worksheet['!dataValidation'].push({
          sqref: `${colLetter}5:${colLetter}1000`, // Apply from row 5 (after examples) to 1000
          type: 'list',
          allowBlank: !rule.fieldRequired,
          formula1: `"${rule.options.join(',')}"`,
          showErrorMessage: true,
          errorTitle: 'Nieprawidłowa wartość',
          error: `Wybierz jedną z opcji: ${rule.options.join(', ')}`
        });
      } else if (rule.type === 'checkbox' && rule.options) {
        // Checkbox validation (tak/nie dropdown)
        worksheet['!dataValidation'].push({
          sqref: `${colLetter}5:${colLetter}1000`,
          type: 'list',
          allowBlank: !rule.fieldRequired,
          formula1: '"tak,nie"',
          showErrorMessage: true,
          errorTitle: 'Nieprawidłowa wartość',
          error: 'Wpisz "tak" lub "nie"'
        });
      } else if (rule.type === 'date') {
        // Date format validation - ensure it's a valid date
        worksheet['!dataValidation'].push({
          sqref: `${colLetter}5:${colLetter}1000`,
          type: 'date',
          allowBlank: !rule.fieldRequired,
          operator: 'greaterThan',
          formula1: new Date(1900, 0, 1).toISOString().split('T')[0],
          showErrorMessage: true,
          errorTitle: 'Nieprawidłowa data',
          error: 'Wpisz datę w formacie RRRR-MM-DD (np. 2024-12-31)'
        });
      }
    });

    // Highlight required columns with light yellow background
    validationRules.forEach(rule => {
      if (rule.fieldRequired) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: rule.column });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: 'FFF9E6' } }, // Light yellow for required fields
            font: { bold: true }
          };
        }
      }
    });

    // Create instruction sheet
    const instructionData = [
      ['INSTRUKCJE UŻYCIA SZABLONU EXCEL'],
      [''],
      ['1. PODSTAWY'],
      ['• Wypełnij dane w arkuszu "Dane Pinezek"'],
      ['• Nie usuwaj ani nie zmieniaj nazw kolumn'],
      ['• Pola oznaczone * są wymagane'],
      ['• Pola z żółtym tłem są wymagane i mają dodatkową walidację'],
      [''],
      ['2. WSPÓŁRZĘDNE'],
      ['• Wpisz szerokość (Lat) i długość (Lng) geograficzną'],
      ['• ALBO zostaw puste i wypełnij pole adresu - współrzędne zostaną znalezione automatycznie'],
      ['• Format: liczby dziesiętne (np. 52.229676, 21.012229)'],
      [''],
      ['3. FORMATY DANYCH'],
      ['• Daty: RRRR-MM-DD (np. 2024-12-31)'],
      ['• Checkboxy: wpisz "tak" lub "nie"'],
      ['• Listy rozwijane: wybierz z dostępnych opcji (kliknij strzałkę w komórce)'],
      ['• Kwoty: liczby z kropką (np. 1000.50)'],
      ['• Procenty: liczby 0-100 (np. 75)'],
      [''],
      ['4. POLA ZŁOŻONE'],
      ['• Linki: format "Nazwa|URL" oddzielone średnikiem'],
      ['  Przykład: Strona główna|https://example.com; Facebook|https://fb.com/page'],
      [''],
      ['• Galeria: URLe zdjęć oddzielone średnikiem'],
      ['  Przykład: https://img1.jpg; https://img2.jpg'],
      ['  Opisy (opcjonalne): Opis 1; Opis 2'],
      [''],
      ['• Adres (pola strukturalne): wypełnij każde pole osobno'],
      ['  Ulica, Numer, Kod pocztowy, Miasto, Gmina'],
      [''],
      ['• Daty (wiele dat): każda data w osobnej kolumnie'],
      [''],
      ['• Finansowanie: wypełnij koszty i źródła finansowania'],
      ['  Procenty zostaną obliczone automatycznie przy imporcie'],
      [''],
      ['5. POLA KTÓRE UZUPEŁNISZ W APLIKACJI'],
      ['• Tagi - wybierz z dostępnych tagów po imporcie'],
      ['• Kategoria - wybierz kategorię po imporcie'],
      ['• Pliki - dodaj pliki PDF/DOCX po imporcie'],
      ['• Tekst sformatowany - sformatuj tekst po imporcie (bold, italic, etc.)'],
      [''],
      ['6. IMPORT'],
      ['• Zapisz plik jako .xlsx'],
      ['• W aplikacji kliknij "Importuj z Excel"'],
      ['• Wybierz wiersze do zaimportowania'],
      ['• Uzupełnij brakujące dane w aplikacji'],
      [''],
      ['7. WSKAZÓWKI'],
      ['• Usuń przykładowe wiersze przed importem'],
      ['• Testuj import na 1-2 wierszach najpierw'],
      ['• Aplikacja sprawdzi poprawność danych przed importem'],
      ['• Duplikaty współrzędnych zostaną wykryte'],
      [''],
      ['Potrzebujesz pomocy? Sprawdź dokumentację lub skontaktuj się z administratorem.']
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructionData);

    // Style the instruction sheet
    const instrRange = XLSX.utils.decode_range(instructionSheet['!ref'] || 'A1');

    // Title row styling
    if (instructionSheet['A1']) {
      instructionSheet['A1'].s = {
        font: { bold: true, sz: 16 },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center' }
      };
    }

    // Section headers (rows with numbers)
    for (let row = instrRange.s.r; row <= instrRange.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cell = instructionSheet[cellAddress];
      if (cell && cell.v && typeof cell.v === 'string' && /^\d+\./.test(cell.v)) {
        cell.s = {
          font: { bold: true, sz: 12 },
          fill: { fgColor: { rgb: 'E7E6E6' } }
        };
      }
    }

    // Set column width for instructions
    instructionSheet['!cols'] = [{ wch: 80 }];

    // Create workbook with both sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instrukcje');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dane Pinezek');
    
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