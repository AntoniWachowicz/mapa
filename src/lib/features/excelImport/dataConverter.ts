/**
 * Excel Import Data Converter
 * Converts string values from Excel imports to appropriate types based on field type.
 */

/**
 * Convert a value from Excel (string) to the appropriate type based on field configuration
 * @param value - The raw value from Excel (typically a string)
 * @param fieldType - The target field type
 * @returns Converted value or null if conversion fails
 */
export function convertValueByFieldType(value: string, fieldType: string): any {
  if (!value || value === '') return null;

  try {
    switch (fieldType) {
      // New field types - most accept text as-is
      case 'richtext':
      case 'files':
      case 'gallery':
      case 'multidate':
      case 'address':
      case 'links':
      case 'tags':
      case 'category':
        return value; // Store as text, will be processed by field editor

      case 'price':
        // Try to parse as number for price
        const priceNum = parseFloat(value.replace(/,/g, '.').replace(/[^\d.-]/g, ''));
        return isNaN(priceNum) ? value : priceNum;

      // Legacy field types (for backward compatibility)
      case 'number':
      case 'currency':
      case 'percentage':
        const num = parseFloat(value.replace(/,/g, '.').replace(/[^\d.-]/g, ''));
        return isNaN(num) ? null : num;

      case 'checkbox':
        const lower = value.toLowerCase().trim();
        return lower === 'true' || lower === 'tak' || lower === 'yes' || lower === '1';

      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString();

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          console.warn(`Invalid email: ${value}`);
        }
        return value;

      case 'url':
      case 'image':
      case 'youtube':
        if (!/^https?:\/\/.+/.test(value)) {
          console.warn(`Invalid URL: ${value}`);
        }
        return value;

      case 'text':
      case 'textarea':
      case 'select':
      default:
        return value;
    }
  } catch (error) {
    console.error(`Error converting value "${value}" for type ${fieldType}:`, error);
    return value; // Return original value on error
  }
}

/**
 * Build a map of field keys to field types from a template
 * @param template - The template containing field definitions
 * @returns Record mapping field key to field type
 */
export function buildFieldTypeMap(template: { fields: Array<{ key: string; type?: string; fieldType?: string }> }): Record<string, string> {
  const fieldTypeMap: Record<string, string> = {};

  if (template.fields) {
    for (const field of template.fields) {
      fieldTypeMap[field.key] = field.type || field.fieldType || 'text';
    }
  }

  return fieldTypeMap;
}
