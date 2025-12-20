/**
 * Formatting Utilities
 * Helper functions for formatting data in tables and displays.
 */

/**
 * Format price with Polish formatting (spaces for thousands, comma for decimal)
 */
export function formatPrice(amount: number): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  const fixed = num.toFixed(2);
  const [integer, decimal] = fixed.split('.');
  const withSpaces = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces},${decimal}`;
}

/**
 * Format field value for compact table cell display
 * Intentionally simple - for detailed formatting see formatDetailFieldValue()
 */
export function formatTableCellValue(field: any, value: any): string {
  // Check for empty values
  if (!value && value !== 0 && value !== false) return '—';

  // Check for empty arrays
  if (Array.isArray(value) && value.length === 0) return '—';

  // Check for empty gallery objects
  if (typeof value === 'object' && value !== null && 'items' in value) {
    if (!value.items || (Array.isArray(value.items) && value.items.length === 0)) {
      return '—';
    }
  }

  // All legacy field type handlers removed - using modern field types only
  return String(value);
}

/**
 * Get display name for a field
 */
export function getFieldDisplayName(field: any): string {
  return field.displayLabel || field.label;
}

/**
 * Get Polish display name for field type
 */
export function getFieldType(field: any): string {
  // Modern field types only
  const typeMap: Record<string, string> = {
    'title': 'tytuł',
    'location': 'lokalizacja',
    'richtext': 'tekst sformatowany',
    'files': 'pliki',
    'gallery': 'galeria',
    'multidate': 'wielodata',
    'address': 'adres',
    'links': 'linki',
    'tags': 'tagi',
    'price': 'cena',
    'category': 'kategoria'
  };
  return typeMap[field.type] || field.type;
}
