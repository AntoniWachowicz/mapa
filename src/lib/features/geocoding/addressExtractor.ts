/**
 * Address Extractor Module
 * Extracts addresses from SavedObject data using multiple strategies and priorities.
 */

import type { SavedObject, Template } from '$lib/types.js';

/**
 * Extract address from a SavedObject using multiple strategies
 * @param obj - The SavedObject to extract address from
 * @param template - The template containing field definitions
 * @returns Extracted address string or null if no address found
 */
export function extractAddressFromObject(obj: SavedObject, template: Template | null): string | null {
  if (!template) return null;

  // Priority 1: Look for 'address' type fields
  const addressFields = template.fields.filter(f => f.type === 'address' || f.fieldType === 'address');
  for (const field of addressFields) {
    const addressData: any = obj.data[field.key];

    // Handle structured address object
    if (addressData && typeof addressData === 'object' && !Array.isArray(addressData)) {
      const parts = [];
      if (addressData.street) parts.push(addressData.street);
      if (addressData.number) parts.push(addressData.number);
      if (addressData.city) parts.push(addressData.city);
      if (addressData.gmina) parts.push(addressData.gmina);
      if (addressData.postalCode) parts.push(addressData.postalCode);

      // Even if we only have gmina or postal code, return it
      if (parts.length > 0) return parts.join(', ');
    }

    // Handle string dumped into address field (Excel import case)
    if (addressData && typeof addressData === 'string') {
      const trimmed = addressData.trim();
      if (trimmed.length > 2) return trimmed;
    }
  }

  // Priority 2: Look for fields with 'adres' in the name
  const addressLikeFields = template.fields.filter(f =>
    f.key?.toLowerCase().includes('adres') ||
    f.displayLabel?.toLowerCase().includes('adres') ||
    f.label?.toLowerCase().includes('adres')
  );
  for (const field of addressLikeFields) {
    const value: any = obj.data[field.key];

    // Handle string addresses
    if (value && typeof value === 'string' && value.trim().length > 5) {
      return value.trim();
    }

    // Handle address object that might be in a field with "adres" in name
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const parts = [];
      if (value.street) parts.push(value.street);
      if (value.number) parts.push(value.number);
      if (value.city) parts.push(value.city);
      if (value.postalCode) parts.push(value.postalCode);
      if (value.gmina) parts.push(value.gmina);
      if (parts.length > 0) return parts.join(' ');
    }
  }

  // Priority 3: Look for gmina + postal code fields separately and combine them
  const gminaFields = template.fields.filter(f =>
    f.key?.toLowerCase().includes('gmina') ||
    f.label?.toLowerCase().includes('gmina')
  );
  const postalCodeFields = template.fields.filter(f =>
    f.key?.toLowerCase().includes('kod') ||
    f.key?.toLowerCase().includes('postal') ||
    f.label?.toLowerCase().includes('kod pocztowy')
  );

  let gminaValue = '';
  let postalValue = '';

  for (const field of gminaFields) {
    const value = obj.data[field.key];
    if (value && typeof value === 'string' && value.trim().length > 2) {
      gminaValue = value.trim();
      break;
    }
  }

  for (const field of postalCodeFields) {
    const value = obj.data[field.key];
    if (value && typeof value === 'string' && value.trim().length > 0) {
      postalValue = value.trim();
      break;
    }
  }

  // If we have gmina or postal code, combine them
  if (gminaValue || postalValue) {
    const parts = [];
    if (gminaValue) parts.push(gminaValue);
    if (postalValue) parts.push(postalValue);
    return parts.join(', ');
  }

  // Priority 4: Look for fields with location/miejsce/lokalizacja in name
  const locationFields = template.fields.filter(f =>
    f.key?.toLowerCase().includes('miejsce') ||
    f.key?.toLowerCase().includes('lokalizacja') ||
    f.key?.toLowerCase().includes('location') ||
    f.label?.toLowerCase().includes('miejsce') ||
    f.label?.toLowerCase().includes('lokalizacja')
  );
  for (const field of locationFields) {
    const value = obj.data[field.key];
    if (value && typeof value === 'string' && value.trim().length > 3) {
      return value.trim();
    }
  }

  // Priority 5: Look for text fields that might contain addresses
  const textFields = template.fields.filter(f =>
    (f.type === 'richtext' || f.type === 'textarea' || f.type === 'text') &&
    !f.key?.toLowerCase().includes('opis') && // Exclude description fields
    !f.key?.toLowerCase().includes('uwag') && // Exclude notes
    !f.key?.toLowerCase().includes('description')
  );
  for (const field of textFields) {
    const value = obj.data[field.key];
    if (value && typeof value === 'string') {
      const trimmed = value.trim();
      // Check if it looks like an address (has at least one digit or comma, and multiple words)
      if (trimmed.length > 5 && (/\d/.test(trimmed) || /,/.test(trimmed)) && trimmed.split(/[\s,]+/).length >= 2) {
        return trimmed;
      }
    }
  }

  return null;
}
