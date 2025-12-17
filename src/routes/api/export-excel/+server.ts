import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import * as XLSX from 'xlsx';
import type { Template, MapObject } from '$lib/types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { objects, template } = await request.json() as {
      objects: MapObject[];
      template: Template;
    };
    
    if (!objects || !template) {
      throw error(400, 'Objects and template are required');
    }
    
    // Prepare headers
    const headers: string[] = [];
    const fieldMap: { [key: string]: string } = {};
    
    // Add coordinate columns
    headers.push('Szerokość (Lat)', 'Długość (Lng)');
    
    // Add field columns
    template.fields.forEach(field => {
      if (field.visible && field.key && field.key !== 'coordinates') {
        const columnName = field.displayLabel || field.label;
        headers.push(columnName);
        fieldMap[field.key] = columnName;
      }
    });
    
    // Prepare data rows
    const rows: any[][] = [headers];
    
    objects.forEach(obj => {
      const row: any[] = [];

      // Add coordinates - extract from GeoJSON Point (handle missing location)
      const lat = obj.location?.coordinates?.[1] ?? '';
      const lng = obj.location?.coordinates?.[0] ?? '';
      row.push(lat, lng);

      // Add field data
      template.fields.forEach(field => {
        if (field.visible && field.key && field.key !== 'coordinates') {
          let value = obj.data[field.key];
          
          // Format value based on field type
          if (field.type === 'tags') {
            const tagData = value as any;
            if (tagData && tagData.majorTag) {
              const majorTag = template.tags.find(t => t.id === tagData.majorTag);
              let tagString = majorTag ? (majorTag.displayName || majorTag.name) : '';
              
              if (tagData.minorTags && tagData.minorTags.length > 0) {
                const minorTagNames = tagData.minorTags
                  .map((tagId: string) => {
                    const tag = template.tags.find(t => t.id === tagId);
                    return tag ? (tag.displayName || tag.name) : '';
                  })
                  .filter(Boolean)
                  .join(', ');
                
                if (minorTagNames) {
                  tagString += ` (${minorTagNames})`;
                }
              }
              
              value = tagString;
            } else {
              value = '';
            }
          } else if (value === null || value === undefined) {
            value = '';
          }
          
          row.push(value);
        }
      });
      
      rows.push(row);
    });
    
    // Create workbook
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pinezki');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });
    
    // Return file as response
    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pinezki-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
    
  } catch (err) {
    console.error('Excel export error:', err);
    throw error(500, 'Failed to export Excel file');
  }
};