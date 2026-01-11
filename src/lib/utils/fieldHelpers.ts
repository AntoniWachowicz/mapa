/**
 * Field Helper Utilities
 * Common utilities for working with template fields.
 */

import type { Field } from '../types.js';

/**
 * Get the normalized field name from a Field object
 * Handles both old (key) and new (fieldName) naming conventions
 */
export function getFieldName(field: Field): string {
  return field.fieldName || field.key;
}

/**
 * Get the field type, handling both fieldType and type properties
 */
export function getFieldType(field: Field): string {
  return field.fieldType || field.type;
}

/**
 * Check if a field is required
 */
export function isFieldRequired(field: Field): boolean {
  return field.required === true;
}
