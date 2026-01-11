/**
 * Form Initialization Utility
 * Handles creation of initial form data structures based on template fields.
 */

import type {
  Template,
  ProjectData,
  GalleryData,
  MultiDateData,
  AddressData,
  PriceData,
  CategoryFieldData,
  SelectionFieldData
} from '$lib/types.js';
import type {
  MultiDateConfig,
  AddressConfig,
  PriceConfig
} from '$lib/types.js';

/**
 * Create initial form data structure from template
 * Initializes all fields with appropriate default values based on field type
 */
export function createInitialFormData(template: Template): ProjectData {
  const formData: ProjectData = {};

  template.fields.forEach((field) => {
    const fieldType = field.fieldType || field.type;
    const fieldName = field.fieldName || field.key;

    switch (fieldType) {
      case 'title':
      case 'richtext':
        formData[fieldName] = '';
        break;

      case 'files':
        formData[fieldName] = [];
        break;

      case 'gallery':
        formData[fieldName] = { items: [] } as GalleryData;
        break;

      case 'multidate':
        const multiDateConfig = field.config as MultiDateConfig;
        // Pre-populate with null dates for all configured date fields
        const initialDates: MultiDateData = {};
        multiDateConfig?.dateFields?.forEach(dateField => {
          initialDates[dateField.key] = null;
        });
        formData[fieldName] = initialDates;
        break;

      case 'address':
        const addressConfig = field.config as AddressConfig;
        // Pre-populate with empty strings for all configured address fields
        const initialAddress: AddressData = {};
        addressConfig?.displayFields?.forEach(fieldKey => {
          initialAddress[fieldKey as keyof AddressData] = '';
        });
        formData[fieldName] = initialAddress;
        break;

      case 'links':
        formData[fieldName] = [];
        break;

      case 'price':
        const priceConfig = field.config as PriceConfig;
        // Pre-populate funding sources from config
        const initialFunding = priceConfig?.defaultFundingSources?.map(source => ({
          source: source,
          amount: 0
        })) || [];
        formData[fieldName] = {
          currency: priceConfig?.currency || 'PLN',
          funding: initialFunding,
          showTotal: priceConfig?.showTotal ?? true,
          showBreakdown: priceConfig?.showPercentages ?? true
        } as PriceData;
        break;

      case 'tags':
      case 'category':
        formData[fieldName] = { selectedTags: [], majorTag: null, minorTags: [] } as CategoryFieldData;
        break;

      case 'selection':
        formData[fieldName] = {
          selected: null,
          selections: [],
          primary: null,
          secondary: [],
          customEntries: []
        } as SelectionFieldData;
        break;

      default:
        formData[fieldName] = '';
    }
  });

  return formData;
}

/**
 * Create empty form data structure (simple reset)
 * Sets all fields to empty strings (used after save)
 */
export function createEmptyFormData(template: Template): ProjectData {
  const formData: ProjectData = {};
  template.fields.forEach((field) => {
    formData[field.key] = '';
  });
  return formData;
}

/**
 * Create reset form data structure (with defaults for special types)
 * Used for canceling edits
 */
export function createResetFormData(template: Template): ProjectData {
  const formData: ProjectData = {};
  template.fields.forEach((field) => {
    if (field.type === 'tags') {
      formData[field.key] = { majorTag: null, minorTags: [] } as CategoryFieldData;
    } else {
      formData[field.key] = '';
    }
  });
  return formData;
}
