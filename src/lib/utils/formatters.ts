/**
 * Formatting Utilities
 * Helper functions for formatting data in tables and displays.
 */

import type { Field, FieldValue } from '$lib/types.js';

/**
 * Format price with Polish formatting (spaces for thousands, comma for decimal)
 */
export function formatPrice(amount: number): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  const fixed = num.toFixed(2);
  const [integer, decimal] = fixed.split('.');
  const withSpaces = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withSpaces},${decimal}`;
}

/**
 * Format field value for compact table cell display
 * Intentionally simple - for detailed formatting see formatDetailFieldValue()
 */
export function formatTableCellValue(field: Field, value: FieldValue | null | undefined): string {
  // Check for empty values
  if (!value && value !== 0 && value !== false) return '—';

  // Check for empty arrays
  if (Array.isArray(value) && value.length === 0) return '—';

  // Check for empty gallery objects
  if (typeof value === 'object' && value !== null && 'items' in value) {
    const items = (value as { items?: unknown[] }).items;
    if (!items || (Array.isArray(items) && items.length === 0)) {
      return '—';
    }
  }

  // All legacy field type handlers removed - using modern field types only
  return String(value);
}

/**
 * Get display name for a field
 */
export function getFieldDisplayName(field: Field): string {
  return field.displayLabel || field.label;
}

/**
 * Get Polish display name for field type
 */
export function getFieldType(field: Field): string {
  // Modern field types only
  const fieldType = field.fieldType || field.type;
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
  return typeMap[fieldType || ''] || fieldType || '';
}
