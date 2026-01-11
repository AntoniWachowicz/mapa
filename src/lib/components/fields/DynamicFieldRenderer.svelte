<script lang="ts">
  /**
   * Dynamic Field Renderer
   * Renders the appropriate input component based on field type.
   * Centralizes field type detection and component selection.
   */
  import type {
    Field,
    ProjectData,
    CategoryFieldData,
    SelectionFieldData,
    Tag,
    RichTextConfig,
    LinksConfig,
    MultiDateConfig,
    AddressConfig,
    PriceConfig,
    FilesConfig,
    GalleryConfig,
    LinkData,
    MultiDateData,
    AddressData,
    PriceData,
    FileData,
    GalleryData
  } from '$lib/types.js';
  import RichTextInput from '$lib/fields/RichTextInput.svelte';
  import LinksInput from '$lib/fields/LinksInput.svelte';
  import MultiDateInput from '$lib/fields/MultiDateInput.svelte';
  import AddressInput from '$lib/fields/AddressInput.svelte';
  import PriceInput from '$lib/fields/PriceInput.svelte';
  import FilesInput from '$lib/fields/FilesInput.svelte';
  import GalleryInput from '$lib/fields/GalleryInput.svelte';
  import TagInput from '$lib/fields/TagInput.svelte';
  import SelectionInput from '$lib/fields/SelectionInput.svelte';
  import { getFieldName, getFieldType } from '$lib/utils/fieldHelpers.js';

  interface Props {
    field: Field;
    formData: ProjectData;
    availableTags?: Tag[];
    onFieldChange: (fieldName: string, value: any) => void;
    onGeocode?: (fieldName: string) => void;
    getFieldValue: (fieldName: string) => string | number;
    getComplexFieldValue: (fieldName: string) => any;
    getTagValue: (fieldName: string) => CategoryFieldData;
    getSelectionValue: (fieldName: string) => SelectionFieldData;
    isGeocodingAddress?: boolean;
  }

  const {
    field,
    formData,
    availableTags = [],
    onFieldChange,
    onGeocode,
    getFieldValue,
    getComplexFieldValue,
    getTagValue,
    getSelectionValue,
    isGeocodingAddress = false
  }: Props = $props();

  const fieldName = $derived(getFieldName(field));
  const fieldType = $derived(getFieldType(field));
</script>

{#if fieldType === 'richtext'}
  <RichTextInput
    value={String(getFieldValue(fieldName))}
    config={field.config as RichTextConfig}
    required={field.required}
    oninput={(val) => onFieldChange(fieldName, val)}
  />

{:else if fieldType === 'links'}
  <LinksInput
    value={getComplexFieldValue(fieldName) as LinkData[]}
    config={field.config as LinksConfig}
    required={field.required}
    oninput={(val) => onFieldChange(fieldName, val)}
  />

{:else if fieldType === 'multidate'}
  <MultiDateInput
    value={getComplexFieldValue(fieldName) as MultiDateData}
    config={field.config as MultiDateConfig}
    required={field.required}
    oninput={(val) => onFieldChange(fieldName, val)}
  />

{:else if fieldType === 'address' && field.config}
  <AddressInput
    value={getComplexFieldValue(fieldName) as AddressData}
    config={field.config as AddressConfig}
    required={field.required}
    oninput={(val) => onFieldChange(fieldName, val)}
    onGeocode={onGeocode ? () => onGeocode(fieldName) : undefined}
  />

{:else if fieldType === 'price'}
  <PriceInput
    value={getComplexFieldValue(fieldName) as PriceData}
    config={field.config as PriceConfig}
    required={field.required}
    oninput={(val) => onFieldChange(fieldName, val)}
  />

{:else if fieldType === 'files'}
  <FilesInput
    value={getComplexFieldValue(fieldName) as FileData[]}
    config={field.config as FilesConfig}
    required={field.required}
    oninput={(val) => onFieldChange(fieldName, val)}
  />

{:else if fieldType === 'gallery'}
  <GalleryInput
    value={getComplexFieldValue(fieldName) as GalleryData}
    config={field.config as GalleryConfig}
    required={field.required}
    oninput={(val) => onFieldChange(fieldName, val)}
  />

{:else if fieldType === 'tags' || fieldType === 'category'}
  <TagInput
    value={getTagValue(fieldName)}
    {availableTags}
    {field}
    onchange={(newTagData) => onFieldChange(fieldName, newTagData)}
  />

{:else if fieldType === 'selection'}
  <SelectionInput
    value={getSelectionValue(fieldName)}
    {field}
    onchange={(newSelectionData) => onFieldChange(fieldName, newSelectionData)}
  />
{/if}
