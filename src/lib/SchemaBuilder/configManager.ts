/**
 * Configuration Manager
 * Handles loading field configurations into state and building config objects from state.
 */

import type {
  Field,
  FieldType,
  RichTextConfig,
  FilesConfig,
  GalleryConfig,
  MultiDateConfig,
  AddressConfig,
  LinksConfig,
  PriceConfig
} from '$lib/types.js';
import type { ConfigState } from './configState.svelte.js';

/**
 * Loads a field's configuration into the config state.
 * Populates the config state with values from the field's config object.
 *
 * @param field - The field whose config to load
 * @param configState - The config state to populate
 */
export function loadFieldConfig(field: Field, configState: ConfigState): void {
  const fieldType = field.fieldType || field.type;

  if (fieldType === 'richtext' && field.config) {
    const fieldConfig = field.config as RichTextConfig;
    configState.richTextMaxLength = fieldConfig.maxLength || 5000;
    configState.richTextFormatting = fieldConfig.allowedFormatting || ['bold', 'italic', 'underline', 'lists', 'links'];
  } else if (fieldType === 'files' && field.config) {
    const fieldConfig = field.config as FilesConfig;
    configState.filesAllowedTypes = fieldConfig.allowedTypes || ['pdf', 'docx', 'xlsx'];
    configState.filesMaxSize = (fieldConfig.maxFileSize || 10485760) / (1024 * 1024); // Convert bytes to MB
    configState.filesMaxCount = fieldConfig.maxFiles || 5;
  } else if (fieldType === 'gallery' && field.config) {
    const fieldConfig = field.config as GalleryConfig;
    configState.galleryStyle = fieldConfig.displayStyle || 'carousel';
    configState.galleryAllowImages = fieldConfig.allowImages ?? true;
    configState.galleryAllowVideos = fieldConfig.allowVideos ?? true;
    configState.galleryMaxItems = fieldConfig.maxItems || 10;
  } else if (fieldType === 'multidate' && field.config) {
    const fieldConfig = field.config as MultiDateConfig;
    configState.multiDateFields = fieldConfig.dateFields || [{ key: 'submitted', label: 'Data złożenia', required: false }];
    configState.multiDateLayout = fieldConfig.layout || 'horizontal';
  } else if (fieldType === 'address' && field.config) {
    const fieldConfig = field.config as AddressConfig;
    configState.addressDisplayFields = fieldConfig.displayFields || ['street', 'number', 'postalCode', 'city'];
    configState.addressRequiredFields = fieldConfig.requiredFields || ['city'];
    configState.addressEnableGeocoding = fieldConfig.enableGeocoding ?? true;
  } else if (fieldType === 'links' && field.config) {
    const fieldConfig = field.config as LinksConfig;
    configState.linksMaxCount = fieldConfig.maxLinks || 10;
  } else if (fieldType === 'price' && field.config) {
    const fieldConfig = field.config as PriceConfig;
    configState.priceCurrency = fieldConfig.currency || 'PLN';
    configState.priceFundingSources = fieldConfig.defaultFundingSources || ['UE', 'Wnioskodawca'];
    configState.priceShowPercentages = fieldConfig.showPercentages ?? true;
    configState.priceShowTotal = fieldConfig.showTotal ?? true;
  }
}

/**
 * Builds a field configuration object from the config state.
 * Returns a typed config object for the given field type.
 *
 * @param fieldType - The type of field to build config for
 * @param configState - The config state to read from
 * @returns The field configuration object, or undefined if no config needed
 */
export function buildFieldConfig(
  fieldType: FieldType | string,
  configState: ConfigState
): RichTextConfig | FilesConfig | GalleryConfig | MultiDateConfig | AddressConfig | LinksConfig | PriceConfig | undefined {
  switch (fieldType) {
    case 'richtext':
      return {
        maxLength: configState.richTextMaxLength,
        allowedFormatting: configState.richTextFormatting
      } as RichTextConfig;

    case 'files':
      return {
        allowedTypes: configState.filesAllowedTypes,
        maxFileSize: configState.filesMaxSize * 1024 * 1024, // Convert MB to bytes
        maxFiles: configState.filesMaxCount
      } as FilesConfig;

    case 'gallery':
      return {
        displayStyle: configState.galleryStyle,
        allowImages: configState.galleryAllowImages,
        allowVideos: configState.galleryAllowVideos,
        maxItems: configState.galleryMaxItems
      } as GalleryConfig;

    case 'multidate':
      return {
        dateFields: configState.multiDateFields,
        layout: configState.multiDateLayout
      } as MultiDateConfig;

    case 'address':
      return {
        displayFields: configState.addressDisplayFields,
        requiredFields: configState.addressRequiredFields,
        enableGeocoding: configState.addressEnableGeocoding
      } as AddressConfig;

    case 'links':
      return {
        maxLinks: configState.linksMaxCount
      } as LinksConfig;

    case 'price':
      return {
        currency: configState.priceCurrency,
        defaultFundingSources: configState.priceFundingSources,
        showPercentages: configState.priceShowPercentages,
        showTotal: configState.priceShowTotal
      } as PriceConfig;

    case 'tags':
    case 'category':
      // Tags and category use existing tag system, no config needed
      return undefined;

    default:
      return undefined;
  }
}
