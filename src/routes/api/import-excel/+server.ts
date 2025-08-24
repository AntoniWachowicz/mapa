import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import { geocodeAddress, formatPolishAddress } from '$lib/server/geocoding.js';

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
    const dataRows = rows.filter((row, index) => {
      // Skip rows that look like instructions
      const firstCell = row[0] ? String(row[0]).toLowerCase() : '';
      if (firstCell.includes('instrukcje') || firstCell.includes('wpisz') || firstCell.includes('jeśli')) {
        return false;
      }
      
      // Skip completely empty rows
      const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
      return hasData;
    });
    
    const processedRows = [];
    
    // Process each row (with progress tracking capability)
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowData: any = {};
      
      // Map row data to headers
      headers.forEach((header, index) => {
        const cellValue = row[index];
        if (cellValue !== undefined && cellValue !== null) {
          // Clean header name by removing instruction text in parentheses
          const cleanHeader = header.replace(/\s*\([^)]*\)\s*$/g, '').trim();
          rowData[cleanHeader] = String(cellValue).trim();
        }
      });
      
      // Skip empty rows
      if (Object.keys(rowData).length === 0) {
        continue;
      }
      
      let coordinates = null;
      let hasIncompleteData = false;
      
      // Look for existing coordinate fields first
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
      
      const latClean = latField ? latField.replace(/\s*\([^)]*\)\s*$/g, '').trim() : null;
      const lngClean = lngField ? lngField.replace(/\s*\([^)]*\)\s*$/g, '').trim() : null;
      
      if (latClean && lngClean && rowData[latClean] && rowData[lngClean]) {
        const lat = parseFloat(rowData[latClean]);
        const lng = parseFloat(rowData[lngClean]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates = { lat, lng };
        }
      }
      
      // If no coordinates found, look for address field and try to geocode
      if (!coordinates) {
        const addressFields = ['adres', 'address', 'lokalizacja', 'location', 'miejsce'];
        const addressField = headers.find(h => {
          const cleanH = h.replace(/\s*\([^)]*\)\s*$/g, '').trim().toLowerCase();
          return addressFields.some(af => cleanH.includes(af.toLowerCase()));
        });
        
        const addressClean = addressField ? addressField.replace(/\s*\([^)]*\)\s*$/g, '').trim() : null;
        
        if (addressClean && rowData[addressClean]) {
          try {
            const formattedAddress = formatPolishAddress(rowData[addressClean]);
            const geocodeResult = await geocodeAddress(formattedAddress);
            
            if (geocodeResult) {
              coordinates = {
                lat: geocodeResult.lat,
                lng: geocodeResult.lng
              };
              
              // Update the address with the formatted one from geocoding service
              rowData[addressClean] = geocodeResult.address;
            }
            
            // Add a small delay to be respectful to the geocoding service
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (geocodeError) {
            console.warn(`Failed to geocode address for row ${i + 1}:`, geocodeError);
          }
        }
      }
      
      // Check for fields that couldn't be imported (tags, complex types)
      Object.keys(rowData).forEach(key => {
        const value = rowData[key];
        if (typeof value === 'string' && value.includes('zostanie puste')) {
          hasIncompleteData = true;
          delete rowData[key]; // Remove the placeholder text
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
      headers: headers.map(h => h.replace(/\s*\([^)]*\)\s*$/g, '').trim()), // Clean headers
      data: processedRows,
      totalRows: processedRows.length,
      incompleteDataCount: processedRows.filter(row => row.hasIncompleteData).length
    });
    
  } catch (err) {
    console.error('Excel import error:', err);
    throw error(500, 'Failed to import Excel file');
  }
};