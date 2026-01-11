/**
 * Pin Validation Utilities
 * Validates pin form data against template field requirements.
 */

import type {
  Template,
  ProjectData,
  GalleryData,
  MultiDateData,
  MultiDateConfig,
  AddressData,
  AddressConfig,
  PriceData,
  CategoryFieldData
} from '$lib/types.js';

export interface ValidationResult {
  isValid: boolean;
  emptyRequiredFields: string[];
}

/**
 * Validates form data against template field requirements
 * @param template - The template defining field requirements
 * @param formData - The form data to validate
 * @param selectedCoordinates - Whether coordinates are selected (for location validation)
 * @param editingObject - Whether editing an existing object (affects location requirement)
 * @returns Validation result with list of empty required fields
 */
export function validatePinData(
  template: Template,
  formData: ProjectData,
  selectedCoordinates: { lat: number; lng: number } | null,
  editingObject: any | null
): ValidationResult {
  if (!template?.fields) {
    return { isValid: true, emptyRequiredFields: [] };
  }

  const emptyRequiredFields: string[] = [];

  for (const field of template.fields) {
    if (field.required && field.visible) {
      const fieldType = field.fieldType || field.type;
      const fieldName = field.fieldName || field.key;

      // Special handling for location field
      if (fieldType === 'location' || field.key === 'location') {
        // Only require location for new objects, not when editing incomplete ones
        if (!selectedCoordinates && !editingObject) {
          emptyRequiredFields.push(field.label || field.displayLabel || 'Lokalizacja');
        }
        continue;
      }

      const value = formData[fieldName];

      // Validate based on field type
      if (fieldType === 'title' || fieldType === 'richtext') {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          emptyRequiredFields.push(field.label);
        }
      } else if (fieldType === 'files') {
        if (!Array.isArray(value) || value.length === 0) {
          emptyRequiredFields.push(field.label);
        }
      } else if (fieldType === 'gallery') {
        const gallery = value as GalleryData;
        if (!gallery || !gallery.items || gallery.items.length === 0) {
          emptyRequiredFields.push(field.label);
        }
      } else if (fieldType === 'multidate') {
        const config = field.config as MultiDateConfig;
        const dates = value as MultiDateData;
        const hasRequiredDates = config?.dateFields
          ?.filter(df => df.required)
          .every(df => dates && dates[df.key]);
        if (!hasRequiredDates) {
          emptyRequiredFields.push(field.label);
        }
      } else if (fieldType === 'address' && field.config) {
        const addrConfig = field.config as AddressConfig;
        const addr = value as AddressData;
        const hasRequiredAddr = addrConfig?.requiredFields
          ?.every(rf => addr && (addr as any)[rf]);
        if (!hasRequiredAddr) {
          emptyRequiredFields.push(field.label);
        }
      } else if (fieldType === 'links') {
        if (!Array.isArray(value) || value.length === 0) {
          emptyRequiredFields.push(field.label);
        }
      } else if (fieldType === 'price') {
        const priceData = value as PriceData;
        if (!priceData || !priceData.funding || priceData.funding.length === 0) {
          emptyRequiredFields.push(field.label);
        }
      } else if (field.type === 'tags' || field.type === 'category') {
        const tagData = value as CategoryFieldData;
        if (!tagData || !tagData.majorTag) {
          emptyRequiredFields.push(field.displayLabel || field.label);
        }
      }
    }
  }

  return {
    isValid: emptyRequiredFields.length === 0,
    emptyRequiredFields
  };
}

/**
 * Checks if the pin has a complete location
 * @param selectedCoordinates - The selected coordinates
 * @returns True if location is set
 */
export function hasCompleteLocation(
  selectedCoordinates: { lat: number; lng: number } | null
): boolean {
  return !!selectedCoordinates;
}
