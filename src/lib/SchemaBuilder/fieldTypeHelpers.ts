/**
 * Field Type Helpers
 * Utility functions for field type display names, config editing, and field properties.
 */

import type { Field } from '$lib/types.js';

/**
 * Field type display name mappings (Polish)
 */
const FIELD_TYPE_NAMES: Record<string, string> = {
  // New field types
  'title': 'tytuł',
  'location': 'lokalizacja',
  'richtext': 'tekst',
  'files': 'pliki',
  'gallery': 'galeria',
  'multidate': 'daty',
  'address': 'adres',
  'links': 'linki',
  'tags': 'tagi',
  'price': 'kwota',
  'category': 'kategoria',
  'selection': 'lista wyboru',
  // Legacy field types
  'text': 'tekst',
  'textarea': 'długi tekst',
  'number': 'liczba',
  'currency': 'kwota',
  'percentage': 'procent',
  'email': 'email',
  'url': 'adres www',
  'date': 'data',
  'select': 'lista',
  'image': 'obraz',
  'youtube': 'youtube',
  'checkbox': 'tak/nie'
};

/**
 * Field types that have editable configuration
 */
const EDITABLE_CONFIG_TYPES = [
  'richtext',
  'files',
  'gallery',
  'multidate',
  'address',
  'links',
  'price',
  'category',
  'selection'
];

/**
 * Get the display name for a field type
 */
export function getFieldTypeDisplayName(fieldType: string): string {
  return FIELD_TYPE_NAMES[fieldType] || fieldType;
}

/**
 * Get the display type for a field, handling both new and legacy field type properties
 */
export function getFieldDisplayType(field: Field): string {
  // Special handling for location field
  if (field.key === 'location' || field.fieldName === 'location') {
    return 'lokalizacja';
  }

  // Try new fieldType first, fall back to legacy type
  const typeToUse = field.fieldType || field.type;
  return getFieldTypeDisplayName(typeToUse as string);
}

/**
 * Check if a field type has editable configuration
 */
export function hasEditableConfig(field: Field): boolean {
  const fieldType = field.fieldType || field.type;
  return EDITABLE_CONFIG_TYPES.includes(fieldType as string);
}

/**
 * Check if a field is mandatory (cannot be deleted or made optional)
 * Mandatory fields are: protected fields, title field, and location field
 */
export function isFieldMandatory(field: Field): boolean {
  return field.protected || field.key === 'title' || field.key === 'location';
}
