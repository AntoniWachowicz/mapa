/**
 * Form Field Accessors
 * Utilities for getting and setting form field values.
 */

import type { ProjectData, CategoryFieldData, SelectionFieldData } from '../types.js';

/**
 * Handle text input change event
 */
export function handleTextInput(
  formData: ProjectData,
  key: string,
  event: Event
): ProjectData {
  const target = event.target as HTMLInputElement;
  if (target) {
    return { ...formData, [key]: target.value };
  }
  return formData;
}

/**
 * Handle number input change event
 */
export function handleNumberInput(
  formData: ProjectData,
  key: string,
  event: Event
): ProjectData {
  const target = event.target as HTMLInputElement;
  if (target) {
    return { ...formData, [key]: Number(target.value) };
  }
  return formData;
}

/**
 * Handle checkbox change event
 */
export function handleCheckboxChange(
  formData: ProjectData,
  key: string,
  event: Event
): ProjectData {
  const target = event.target as HTMLInputElement;
  if (target) {
    return { ...formData, [key]: target.checked };
  }
  return formData;
}

/**
 * Get field value as string or number
 * Returns empty string for boolean or object values
 */
export function getFieldValue(formData: ProjectData, key: string): string | number {
  const value = formData[key];
  if (typeof value === 'boolean') return '';
  if (typeof value === 'object') return ''; // Handle CategoryFieldData
  return value || '';
}

/**
 * Get complex field value (objects, arrays)
 */
export function getComplexFieldValue(formData: ProjectData, key: string): any {
  return formData[key];
}

/**
 * Get checkbox value as boolean
 */
export function getCheckboxValue(formData: ProjectData, key: string): boolean {
  const value = formData[key];
  return typeof value === 'boolean' ? value : false;
}

/**
 * Get tag field value
 */
export function getTagValue(formData: ProjectData, key: string): CategoryFieldData {
  const value = formData[key] as CategoryFieldData;
  return value || { majorTag: null, minorTags: [] };
}

/**
 * Handle tag change
 */
export function handleTagChange(
  formData: ProjectData,
  key: string,
  tagData: CategoryFieldData
): ProjectData {
  return {
    ...formData,
    [key]: tagData
  };
}

/**
 * Get selection field value
 */
export function getSelectionValue(formData: ProjectData, key: string): SelectionFieldData {
  const value = formData[key] as SelectionFieldData;
  return value || {
    selected: null,
    selections: [],
    primary: null,
    secondary: [],
    customEntries: []
  };
}

/**
 * Handle selection change
 */
export function handleSelectionChange(
  formData: ProjectData,
  key: string,
  selectionData: SelectionFieldData
): ProjectData {
  return {
    ...formData,
    [key]: selectionData
  };
}
