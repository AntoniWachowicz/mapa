<script lang="ts">
  import type { Field, Template, FieldType, RichTextConfig, FilesConfig, GalleryConfig, MultiDateConfig, AddressConfig, LinksConfig, PriceConfig } from './types.js';
  import TagManager from './TagManager.svelte';

  // Icon components
  function EyeIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.28883 13.0792C1.90372 12.4253 1.90372 11.5747 2.28883 10.9208C4.39231 7.34883 7.9568 5 12 5C16.0432 5 19.6077 7.34883 21.7112 10.9208C22.0963 11.5747 22.0963 12.4253 21.7112 13.0792C19.6077 16.6512 16.0432 19 12 19C7.9568 19 4.39231 16.6512 2.28883 13.0792ZM16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12ZM12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" fill="currentColor"/></svg>`;
  }

  function TrashIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.44 6C7.74928 6 8 5.74928 8 5.44V5C8 3.34315 9.34315 2 11 2H13C14.6569 2 16 3.34315 16 5V5.44C16 5.74928 16.2507 6 16.56 6H20C20.5523 6 21 6.44772 21 7C21 7.55228 20.5523 8 20 8H19.56C19.2507 8 19 8.25072 19 8.56V18C19 20.2091 17.2091 22 15 22H9C6.79086 22 5 20.2091 5 18V8.56C5 8.25072 4.74928 8 4.44 8H4C3.44772 8 3 7.55228 3 7C3 6.44772 3.44772 6 4 6H7.44ZM10 5C10 4.44772 10.4477 4 11 4H13C13.5523 4 14 4.44772 14 5V5.44C14 5.74928 13.7493 6 13.44 6H10.56C10.2507 6 10 5.74928 10 5.44V5ZM9 11C9 10.4477 9.44772 10 10 10C10.5523 10 11 10.4477 11 11V17C11 17.5523 10.5523 18 10 18C9.44772 18 9 17.5523 9 17V11ZM14 10C13.4477 10 13 10.4477 13 11V17C13 17.5523 13.4477 18 14 18C14.5523 18 15 17.5523 15 17V11C15 10.4477 14.5523 10 14 10Z" fill="currentColor"/></svg>`;
  }

  function ChevronUpIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.29289 15.2071C6.68342 15.5976 7.31658 15.5976 7.70711 15.2071L12 10.9142L16.2929 15.2071C16.6834 15.5976 17.3166 15.5976 17.7071 15.2071C18.0976 14.8166 18.0976 14.1834 17.7071 13.7929L12.7071 8.79289C12.5196 8.60536 12.2652 8.5 12 8.5C11.7348 8.5 11.4804 8.60536 11.2929 8.79289L6.29289 13.7929C5.90237 14.1834 5.90237 14.8166 6.29289 15.2071Z" fill="currentColor"/></svg>`;
  }

  function ChevronDownIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.29289 8.79289C6.68342 8.40237 7.31658 8.40237 7.70711 8.79289L12 13.0858L16.2929 8.79289C16.6834 8.40237 17.3166 8.40237 17.7071 8.79289C18.0976 9.18342 18.0976 9.81658 17.7071 10.2071L12.7071 15.2071C12.5196 15.3946 12.2652 15.5 12 15.5C11.7348 15.5 11.4804 15.3946 11.2929 15.2071L6.29289 10.2071C5.90237 9.81658 5.90237 9.18342 6.29289 8.79289Z" fill="currentColor"/></svg>`;
  }

  function RequiredIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L22 20H2L12 2Z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">!</text></svg>`;
  }

  function PlusIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  function EditIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="currentColor"/></svg>`;
  }
  
  interface Props {
    template: Template;
    onUpdate: (template: Template) => void;
  }
  
  const { template, onUpdate }: Props = $props();

  let label = $state('');
  let type = $state<Field['type']>('text');
  let required = $state(false);
  let maxMinorTags = $state(3); // For category field type
  let allowMultiple = $state(true); // For tags field type (single vs multiple choice)
  let selectOptions = $state(''); // For select field type (comma-separated)
  let addressSync = $state(false); // For address field type (auto-sync with coordinates)
  let editingFieldIndex = $state<number | null>(null);
  let editingConfigIndexes = $state<Set<number>>(new Set());
  let addingNewField = $state(false);
  let newFieldLabel = $state('');
  let newFieldType = $state<FieldType>('richtext');
  let newFieldRequired = $state(false);
  let draggedFieldIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let deleteConfirmIndex = $state<number | null>(null);

  // New field type configurations
  let richTextMaxLength = $state(5000);
  let richTextFormatting = $state(['bold', 'italic', 'underline', 'lists', 'links']);

  let filesAllowedTypes = $state(['pdf', 'docx', 'xlsx']);
  let filesMaxSize = $state(10);
  let filesMaxCount = $state(5);

  let galleryStyle = $state<'carousel' | 'grid' | 'masonry'>('carousel');
  let galleryAllowImages = $state(true);
  let galleryAllowVideos = $state(true);
  let galleryMaxItems = $state(10);

  let multiDateFields = $state([
    { key: 'submitted', label: 'Data złożenia', required: false }
  ]);
  let multiDateLayout = $state<'horizontal' | 'vertical'>('horizontal');

  let addressDisplayFields = $state(['street', 'number', 'postalCode', 'city']);
  let addressRequiredFields = $state(['city']);
  let addressEnableGeocoding = $state(true);

  let linksMaxCount = $state(10);

  let priceCurrency = $state('PLN');
  let priceFundingSources = $state(['UE', 'Wnioskodawca']);
  let priceShowPercentages = $state(true);
  let priceShowTotal = $state(true);
  
  // Check if category field already exists (only one allowed)
  const hasCategoryField = $derived(
    template?.fields?.some(f => f.fieldType === 'category' || f.type === 'category') ?? false
  );
  const canAddCategoryField = $derived(!hasCategoryField && type === 'category');
  
  function addField(): void {
    if (label.trim() && template?.fields) {
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      // Check if trying to add second category field
      if (type === 'category' && template.fields.some(f => f.type === 'category')) {
        return; // Prevent adding multiple category fields
      }

      const newField: Field = {
        key,
        label,
        displayLabel: label,
        type,
        required,
        visible: true,
        protected: false,
        adminVisible: true,
        ...(type === 'category' && { tagConfig: { maxMinorTags } }),
        ...(type === 'tags' && { tagConfig: { maxMinorTags: 0, allowMultiple } }),
        ...(type === 'select' && {
          selectConfig: {
            options: selectOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
          }
        }),
        ...(type === 'address' && { addressSync })
      };
      const updatedTemplate: Template = {
        ...template,
        fields: [...template.fields, newField]
      };
      onUpdate(updatedTemplate);

      label = '';
      type = 'text';
      required = false;
      maxMinorTags = 3;
      allowMultiple = true;
      selectOptions = '';
      addressSync = false;
    }
  }

  function startAddingField(): void {
    addingNewField = true;
    newFieldLabel = '';
    newFieldType = 'text';
    newFieldRequired = false;
  }

  function saveNewField(): void {
    if (!newFieldLabel.trim() || !template?.fields) return;

    const fieldId = `field_${Date.now()}`;
    const fieldName = newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check if trying to add second category field
    if (newFieldType === 'category' && template.fields.some(f => f.fieldType === 'category' || f.type === 'category')) {
      return;
    }

    let config: any = undefined;

    switch (newFieldType) {
      case 'richtext':
        config = {
          maxLength: richTextMaxLength,
          allowedFormatting: richTextFormatting
        } as RichTextConfig;
        break;

      case 'files':
        config = {
          allowedTypes: filesAllowedTypes,
          maxFileSize: filesMaxSize * 1024 * 1024, // Convert MB to bytes
          maxFiles: filesMaxCount
        } as FilesConfig;
        break;

      case 'gallery':
        config = {
          displayStyle: galleryStyle,
          allowImages: galleryAllowImages,
          allowVideos: galleryAllowVideos,
          maxItems: galleryMaxItems
        } as GalleryConfig;
        break;

      case 'multidate':
        config = {
          dateFields: multiDateFields,
          layout: multiDateLayout
        } as MultiDateConfig;
        break;

      case 'address':
        config = {
          displayFields: addressDisplayFields,
          requiredFields: addressRequiredFields,
          enableGeocoding: addressEnableGeocoding
        } as AddressConfig;
        break;

      case 'links':
        config = {
          maxLinks: linksMaxCount
        } as LinksConfig;
        break;

      case 'price':
        config = {
          currency: priceCurrency,
          defaultFundingSources: priceFundingSources,
          showPercentages: priceShowPercentages,
          showTotal: priceShowTotal
        } as PriceConfig;
        break;

      case 'tags':
      case 'category':
        // Tags and category use existing tag system
        break;
    }

    const newField: Field = {
      id: fieldId,
      fieldType: newFieldType,
      fieldName: fieldName,
      label: newFieldLabel,
      required: newFieldRequired,
      order: template.fields.length,
      config: config,
      // Legacy compatibility
      key: fieldName,
      displayLabel: newFieldLabel,
      type: newFieldType as any,
      visible: true,
      protected: false,
      adminVisible: true
    };

    const updatedTemplate: Template = {
      ...template,
      version: 2,
      fields: [...template.fields, newField]
    };

    onUpdate(updatedTemplate);
    addingNewField = false;

    // Reset config values to defaults
    resetConfigDefaults();
  }

  function resetConfigDefaults(): void {
    richTextMaxLength = 5000;
    richTextFormatting = ['bold', 'italic', 'underline', 'lists', 'links'];
    filesAllowedTypes = ['pdf', 'docx', 'xlsx'];
    filesMaxSize = 10;
    filesMaxCount = 5;
    galleryStyle = 'carousel';
    galleryAllowImages = true;
    galleryAllowVideos = true;
    galleryMaxItems = 10;
    multiDateFields = [{ key: 'submitted', label: 'Data złożenia', required: false }];
    multiDateLayout = 'horizontal';
    addressDisplayFields = ['street', 'number', 'postalCode', 'city'];
    addressRequiredFields = ['city'];
    addressEnableGeocoding = true;
    linksMaxCount = 10;
    priceCurrency = 'PLN';
    priceFundingSources = ['UE', 'Wnioskodawca'];
    priceShowPercentages = true;
    priceShowTotal = true;
  }

  // Helper functions for dynamic arrays
  function addDateField(): void {
    multiDateFields = [...multiDateFields, { key: '', label: '', required: false }];
  }

  function removeDateField(index: number): void {
    multiDateFields = multiDateFields.filter((_, i) => i !== index);
  }

  function addFundingSource(): void {
    priceFundingSources = [...priceFundingSources, ''];
  }

  function removeFundingSource(index: number): void {
    priceFundingSources = priceFundingSources.filter((_, i) => i !== index);
  }

  function cancelNewField(): void {
    addingNewField = false;
  }
  
  function removeField(index: number): void {
    const field = template.fields[index];

    // Don't allow removal of protected fields
    if (field.protected || field.key === 'title') {
      return;
    }

    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.filter((_, i) => i !== index)
    };
    onUpdate(updatedTemplate);
    deleteConfirmIndex = null;
    editingConfigIndexes.delete(index);
    editingConfigIndexes = new Set(editingConfigIndexes);
  }

  function startDeleteField(index: number): void {
    deleteConfirmIndex = index;
  }

  function cancelDeleteField(): void {
    deleteConfirmIndex = null;
  }

  function toggleRequired(index: number): void {
    const field = template.fields[index];

    // Don't allow changing required state of protected fields
    if (field.protected || field.key === 'title') {
      return;
    }

    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.map((f, i) =>
        i === index ? { ...f, required: !f.required } : f
      )
    };
    onUpdate(updatedTemplate);
  }

  function isFieldMandatory(field: Field): boolean {
    return field.protected || field.key === 'title' || field.key === 'location';
  }
  
  function toggleVisibility(index: number): void {
    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.map((field, i) => 
        i === index ? { ...field, visible: !field.visible } : field
      )
    };
    onUpdate(updatedTemplate);
  }
  
  function toggleAdminVisibility(index: number): void {
    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.map((field, i) => 
        i === index ? { ...field, adminVisible: !field.adminVisible } : field
      )
    };
    onUpdate(updatedTemplate);
  }
  
  function moveFieldUp(index: number): void {
    const currentField = template.fields[index];
    const targetField = template.fields[index - 1];

    if (index > 0 && canMoveField(currentField) &&
        !(targetField.key === 'title' || targetField.key === 'name')) {
      const newFields = [...template.fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      const updatedTemplate: Template = { ...template, fields: newFields };
      onUpdate(updatedTemplate);
    }
  }

  function moveFieldDown(index: number): void {
    const currentField = template.fields[index];
    const targetField = template.fields[index + 1];

    if (index < template.fields.length - 1 && canMoveField(currentField) &&
        !(targetField.key === 'title' || targetField.key === 'name')) {
      const newFields = [...template.fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      const updatedTemplate: Template = { ...template, fields: newFields };
      onUpdate(updatedTemplate);
    }
  }
  
  function handleLabelInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      label = target.value;
    }
  }
  
  function handleTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      type = target.value as Field['type'];
    }
  }
  
  function handleRequiredChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      required = target.checked;
    }
  }

  function startEditingField(index: number): void {
    editingFieldIndex = index;
  }

  function saveFieldName(index: number, newDisplayLabel: string): void {
    if (!newDisplayLabel.trim()) return;
    
    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.map((field, i) => 
        i === index ? { ...field, displayLabel: newDisplayLabel.trim() } : field
      )
    };
    onUpdate(updatedTemplate);
    editingFieldIndex = null;
  }

  function cancelEditingField(): void {
    editingFieldIndex = null;
  }

  function toggleEditingConfig(index: number): void {
    if (editingConfigIndexes.has(index)) {
      editingConfigIndexes.delete(index);
      editingConfigIndexes = new Set(editingConfigIndexes);
    } else {
      const field = template.fields[index];
      const fieldType = field.fieldType || field.type;

      // Load current config values when opening
      if (fieldType === 'richtext' && field.config) {
        const config = field.config as RichTextConfig;
        richTextMaxLength = config.maxLength || 5000;
        richTextFormatting = config.allowedFormatting || ['bold', 'italic', 'underline', 'lists', 'links'];
      } else if (fieldType === 'files' && field.config) {
        const config = field.config as FilesConfig;
        filesAllowedTypes = config.allowedTypes || ['pdf', 'docx', 'xlsx'];
        filesMaxSize = (config.maxFileSize || 10485760) / (1024 * 1024); // Convert bytes to MB
        filesMaxCount = config.maxFiles || 5;
      } else if (fieldType === 'gallery' && field.config) {
        const config = field.config as GalleryConfig;
        galleryStyle = config.displayStyle || 'carousel';
        galleryAllowImages = config.allowImages ?? true;
        galleryAllowVideos = config.allowVideos ?? true;
        galleryMaxItems = config.maxItems || 10;
      } else if (fieldType === 'multidate' && field.config) {
        const config = field.config as MultiDateConfig;
        multiDateFields = config.dateFields || [{ key: 'submitted', label: 'Data złożenia', required: false }];
        multiDateLayout = config.layout || 'horizontal';
      } else if (fieldType === 'address' && field.config) {
        const config = field.config as AddressConfig;
        addressDisplayFields = config.displayFields || ['street', 'number', 'postalCode', 'city'];
        addressRequiredFields = config.requiredFields || ['city'];
        addressEnableGeocoding = config.enableGeocoding ?? true;
      } else if (fieldType === 'links' && field.config) {
        const config = field.config as LinksConfig;
        linksMaxCount = config.maxLinks || 10;
      } else if (fieldType === 'price' && field.config) {
        const config = field.config as PriceConfig;
        priceCurrency = config.currency || 'PLN';
        priceFundingSources = config.defaultFundingSources || ['UE', 'Wnioskodawca'];
        priceShowPercentages = config.showPercentages ?? true;
        priceShowTotal = config.showTotal ?? true;
      }

      editingConfigIndexes.add(index);
      editingConfigIndexes = new Set(editingConfigIndexes);
    }
  }

  function saveEditedConfig(index: number): void {
    const field = template.fields[index];
    const fieldType = field.fieldType || field.type;
    let config: any = undefined;

    switch (fieldType) {
      case 'richtext':
        config = {
          maxLength: richTextMaxLength,
          allowedFormatting: richTextFormatting
        } as RichTextConfig;
        break;

      case 'files':
        config = {
          allowedTypes: filesAllowedTypes,
          maxFileSize: filesMaxSize * 1024 * 1024,
          maxFiles: filesMaxCount
        } as FilesConfig;
        break;

      case 'gallery':
        config = {
          displayStyle: galleryStyle,
          allowImages: galleryAllowImages,
          allowVideos: galleryAllowVideos,
          maxItems: galleryMaxItems
        } as GalleryConfig;
        break;

      case 'multidate':
        config = {
          dateFields: multiDateFields,
          layout: multiDateLayout
        } as MultiDateConfig;
        break;

      case 'address':
        config = {
          displayFields: addressDisplayFields,
          requiredFields: addressRequiredFields,
          enableGeocoding: addressEnableGeocoding
        } as AddressConfig;
        break;

      case 'links':
        config = {
          maxLinks: linksMaxCount
        } as LinksConfig;
        break;

      case 'price':
        config = {
          currency: priceCurrency,
          defaultFundingSources: priceFundingSources,
          showPercentages: priceShowPercentages,
          showTotal: priceShowTotal
        } as PriceConfig;
        break;
    }

    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.map((f, i) =>
        i === index ? { ...f, config } : f
      )
    };

    onUpdate(updatedTemplate);
    editingConfigIndexes.delete(index);
    editingConfigIndexes = new Set(editingConfigIndexes);
  }

  function cancelEditingConfig(index: number): void {
    editingConfigIndexes.delete(index);
    editingConfigIndexes = new Set(editingConfigIndexes);
  }

  // Drag and drop functions
  function handleDragStart(event: DragEvent, index: number): void {
    draggedFieldIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', '');
    }
  }

  function handleDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    dragOverIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragLeave(): void {
    dragOverIndex = null;
  }

  function handleDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();

    if (draggedFieldIndex === null || draggedFieldIndex === dropIndex) {
      draggedFieldIndex = null;
      dragOverIndex = null;
      return;
    }

    const draggedField = template.fields[draggedFieldIndex];
    const targetField = template.fields[dropIndex];

    // Don't allow moving the title/name field or moving over the title/name field
    if ((targetField.key === 'title' || targetField.key === 'name') ||
        (draggedField.key === 'title' || draggedField.key === 'name')) {
      draggedFieldIndex = null;
      dragOverIndex = null;
      return;
    }

    // Create new array with moved field
    const newFields = [...template.fields];
    const [movedField] = newFields.splice(draggedFieldIndex, 1);
    newFields.splice(dropIndex, 0, movedField);

    const updatedTemplate: Template = { ...template, fields: newFields };
    onUpdate(updatedTemplate);

    draggedFieldIndex = null;
    dragOverIndex = null;
  }

  function canMoveField(field: Field): boolean {
    // Allow coordinates to be moved, but protect title/name field from being moved
    return field.key !== 'title' && field.key !== 'name';
  }

  function getFieldTypeDisplayName(fieldType: string): string {
    const typeNames: Record<string, string> = {
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
      'price': 'cena',
      'category': 'kategoria',
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
    return typeNames[fieldType] || fieldType;
  }

  function getFieldDisplayType(field: Field): string {
    if (field.key === 'location' || field.fieldName === 'location') {
      return 'lokalizacja';
    }
    // Try new fieldType first, fall back to legacy type
    const typeToUse = field.fieldType || field.type;
    return getFieldTypeDisplayName(typeToUse as string);
  }

  function hasEditableConfig(field: Field): boolean {
    const fieldType = field.fieldType || field.type;
    const editableTypes = ['richtext', 'files', 'gallery', 'multidate', 'address', 'links', 'price', 'category'];
    return editableTypes.includes(fieldType as string);
  }
</script>

<div class="schema-builder">
  <div class="fields-container">
    {#if template?.fields && template.fields.length > 0}
      <div class="fields-list">
        {#each template.fields.filter(f => f.adminVisible) as field, i}
          {@const originalIndex = template.fields.findIndex(f => f.key === field.key)}
          <div
            class="field-row"
            class:draggable={canMoveField(field)}
            class:dragging={draggedFieldIndex === originalIndex}
            class:drag-over={dragOverIndex === originalIndex}
            draggable={canMoveField(field)}
            ondragstart={(e) => handleDragStart(e, originalIndex)}
            ondragover={(e) => handleDragOver(e, originalIndex)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(e, originalIndex)}
          >
            <div class="field-name">
              {#if editingFieldIndex === originalIndex}
                <input
                  type="text"
                  value={field.displayLabel || field.label}
                  class="field-name-edit"
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      saveFieldName(originalIndex, target.value);
                    } else if (e.key === 'Escape') {
                      cancelEditingField();
                    }
                  }}
                  onblur={(e) => {
                    const target = e.target as HTMLInputElement;
                    saveFieldName(originalIndex, target.value);
                  }}
                  autofocus
                >
              {:else}
                <span class="field-label" onclick={() => startEditingField(originalIndex)}>
                  {field.displayLabel || field.label}
                </span>
              {/if}
            </div>

            <div class="field-type">
              <span class="field-type-label">{getFieldDisplayType(field)}</span>
            </div>

            <div class="field-actions">
              <div class="icon-grid">
                <button
                  onclick={() => toggleEditingConfig(originalIndex)}
                  class="icon-button edit-button"
                  class:active={editingConfigIndexes.has(originalIndex)}
                  disabled={!hasEditableConfig(field)}
                  title={hasEditableConfig(field) ? "Edytuj konfigurację pola" : "To pole nie ma konfigurowalnych opcji"}
                >
                  {@html EditIcon()}
                </button>

                <button
                  onclick={() => toggleRequired(originalIndex)}
                  disabled={isFieldMandatory(field)}
                  class="icon-button required-button"
                  class:active={field.required}
                  title={isFieldMandatory(field) ? 'Pole obowiązkowe' : (field.required ? 'Pole wymagane - kliknij aby zmienić' : 'Pole opcjonalne - kliknij aby wymagać')}
                >
                  {@html RequiredIcon()}
                </button>

                <button
                  onclick={() => toggleVisibility(originalIndex)}
                  class="icon-button visibility-button"
                  class:inactive={!field.visible}
                  title={field.visible ? 'Ukryj pole' : 'Pokaż pole'}
                >
                  {@html EyeIcon()}
                </button>
              </div>

              <button
                onclick={() => moveFieldUp(originalIndex)}
                disabled={originalIndex === 0 || !canMoveField(field) || (originalIndex > 0 && (template.fields[originalIndex - 1].key === 'title' || template.fields[originalIndex - 1].key === 'name'))}
                class="icon-button move-button"
                title="Przenieś w górę"
              >
                {@html ChevronUpIcon()}
              </button>

              <button
                onclick={() => moveFieldDown(originalIndex)}
                disabled={originalIndex === template.fields.length - 1 || !canMoveField(field) || (originalIndex < template.fields.length - 1 && (template.fields[originalIndex + 1].key === 'title' || template.fields[originalIndex + 1].key === 'name'))}
                class="icon-button move-button"
                title="Przenieś w dół"
              >
                {@html ChevronDownIcon()}
              </button>
            </div>
          </div>

          <!-- Configuration editor panel -->
          {#if editingConfigIndexes.has(originalIndex)}
            {@const fieldType = field.fieldType || field.type}
            <div class="config-editor-panel">
              {#if fieldType === 'richtext'}
                <div class="field-config">
                  <div class="config-row-inline">
                    <label class="config-label">
                      Maksymalna długość:
                      <input type="number" bind:value={richTextMaxLength} min="100" step="100" class="config-input-inline" />
                    </label>
                  </div>
                </div>
              {:else if fieldType === 'files'}
                <div class="field-config">
                  <div class="config-section">
                    <label class="config-label">Dozwolone typy plików:</label>
                    <div class="checkbox-grid">
                      {#each ['pdf', 'docx', 'xlsx', 'doc', 'xls', 'txt', 'rtf', 'odt', 'ods'] as fileType}
                        <label class="checkbox-label">
                          <input type="checkbox" value={fileType} bind:group={filesAllowedTypes} />
                          {fileType.toUpperCase()}
                        </label>
                      {/each}
                    </div>
                  </div>
                  <label class="config-label">
                    Max rozmiar (MB):
                    <input type="number" bind:value={filesMaxSize} min="1" max="100" class="config-input" />
                  </label>
                  <label class="config-label">
                    Max plików:
                    <input type="number" bind:value={filesMaxCount} min="1" max="20" class="config-input" />
                  </label>
                </div>
              {:else if fieldType === 'gallery'}
                <div class="field-config">
                  <label class="config-label">
                    Styl wyświetlania:
                    <select bind:value={galleryStyle} class="config-select">
                      <option value="carousel">Karuzela</option>
                      <option value="grid">Siatka</option>
                      <option value="masonry">Masonry</option>
                    </select>
                  </label>
                  <label class="config-label">
                    <input type="checkbox" bind:checked={galleryAllowImages} />
                    Zezwól na obrazy
                  </label>
                  <label class="config-label">
                    <input type="checkbox" bind:checked={galleryAllowVideos} />
                    Zezwól na filmy (YouTube/Vimeo)
                  </label>
                  <label class="config-label">
                    Max elementów:
                    <input type="number" bind:value={galleryMaxItems} min="1" max="50" class="config-input" />
                  </label>
                </div>
              {:else if fieldType === 'multidate'}
                <div class="field-config">
                  <div class="config-section">
                    <label class="config-label">Pola dat:</label>
                    {#each multiDateFields as dateField, i}
                      <div class="date-field-row">
                        <input
                          type="text"
                          bind:value={dateField.label}
                          placeholder="Etykieta (np. Data złożenia)"
                          class="config-input"
                        />
                        <input
                          type="text"
                          bind:value={dateField.key}
                          placeholder="Klucz (np. submitted)"
                          class="config-input"
                        />
                        <label class="checkbox-label">
                          <input type="checkbox" bind:checked={dateField.required} />
                          Wymagane
                        </label>
                        {#if multiDateFields.length > 1}
                          <button
                            type="button"
                            onclick={() => removeDateField(i)}
                            class="remove-btn"
                          >
                            ✕
                          </button>
                        {/if}
                      </div>
                    {/each}
                    <button type="button" onclick={addDateField} class="add-btn">
                      + Dodaj pole daty
                    </button>
                  </div>
                  <label class="config-label">
                    Układ:
                    <select bind:value={multiDateLayout} class="config-select">
                      <option value="horizontal">Poziomy</option>
                      <option value="vertical">Pionowy</option>
                    </select>
                  </label>
                </div>
              {:else if fieldType === 'address'}
                <div class="field-config">
                  <div class="config-section">
                    <label class="config-label">Wyświetlane pola:</label>
                    <div class="checkbox-grid">
                      {#each ['street', 'number', 'postalCode', 'city', 'gmina'] as addrField}
                        <label class="checkbox-label">
                          <input type="checkbox" value={addrField} bind:group={addressDisplayFields} />
                          {addrField}
                        </label>
                      {/each}
                    </div>
                  </div>
                </div>
              {:else if fieldType === 'links'}
                <div class="field-config">
                  <label class="config-label">
                    Max liczba linków:
                    <input type="number" bind:value={linksMaxCount} min="1" max="20" class="config-input" />
                  </label>
                </div>
              {:else if fieldType === 'price'}
                <div class="field-config">
                  <label class="config-label">
                    Waluta:
                    <input type="text" bind:value={priceCurrency} class="config-input" placeholder="PLN" />
                  </label>
                  <div class="config-section">
                    <label class="config-label">Domyślne źródła finansowania:</label>
                    {#each priceFundingSources as source, i}
                      <div class="funding-source-row">
                        <input
                          type="text"
                          bind:value={priceFundingSources[i]}
                          placeholder="Źródło (np. UE)"
                          class="config-input"
                        />
                        {#if priceFundingSources.length > 1}
                          <button
                            type="button"
                            onclick={() => removeFundingSource(i)}
                            class="remove-btn"
                          >
                            ✕
                          </button>
                        {/if}
                      </div>
                    {/each}
                    <button type="button" onclick={addFundingSource} class="add-btn">
                      + Dodaj źródło
                    </button>
                  </div>
                  <label class="config-label">
                    <input type="checkbox" bind:checked={priceShowPercentages} />
                    Pokazuj procenty
                  </label>
                  <label class="config-label">
                    <input type="checkbox" bind:checked={priceShowTotal} />
                    Pokazuj sumę
                  </label>
                </div>
              {:else if fieldType === 'category'}
                <div class="field-config category-manager">
                  <TagManager template={template} onUpdate={onUpdate} />
                </div>
              {/if}

              <!-- Save/Cancel/Delete buttons -->
              <div class="config-actions">
                <div class="config-actions-left">
                  {#if !isFieldMandatory(field)}
                    {#if deleteConfirmIndex === originalIndex}
                      <button
                        type="button"
                        onclick={() => removeField(originalIndex)}
                        class="config-delete-confirm-btn"
                      >
                        Potwierdź usunięcie
                      </button>
                      <button
                        type="button"
                        onclick={cancelDeleteField}
                        class="config-cancel-btn"
                      >
                        Anuluj
                      </button>
                    {:else}
                      <button
                        type="button"
                        onclick={() => startDeleteField(originalIndex)}
                        class="config-delete-btn"
                      >
                        <img src="/icons/Trash.svg" alt="Delete" style="width: 16px; height: 16px; margin-right: 6px;" />
                        Usuń pole
                      </button>
                    {/if}
                  {/if}
                </div>
                <div class="config-actions-right">
                  <button
                    type="button"
                    onclick={() => saveEditedConfig(originalIndex)}
                    class="config-save-btn"
                  >
                    Zapisz zmiany
                  </button>
                  <button
                    type="button"
                    onclick={() => cancelEditingConfig(originalIndex)}
                    class="config-cancel-btn"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </div>
          {/if}
        {/each}

        <!-- Add field row -->
        {#if addingNewField}
          <div class="field-row new-field-row">
            <div class="field-name">
              <input
                type="text"
                bind:value={newFieldLabel}
                placeholder="Nazwa pola"
                class="field-name-edit"
                onkeydown={(e) => {
                  if (e.key === 'Enter' && newFieldLabel.trim()) {
                    saveNewField();
                  } else if (e.key === 'Escape') {
                    cancelNewField();
                  }
                }}
                autofocus
              >
            </div>

            <div class="field-type">
              <select bind:value={newFieldType} class="field-type-select">
                <option value="richtext">tekst sformatowany</option>
                <option value="files">pliki</option>
                <option value="gallery">galeria</option>
                <option value="multidate">daty</option>
                <option value="address">adres</option>
                <option value="links">linki</option>
                <option value="price">cena</option>
                <option value="category" disabled={hasCategoryField}>kategoria {hasCategoryField ? '(już istnieje)' : ''}</option>
                <option value="tags">tagi</option>
              </select>
            </div>

            <!-- Field configuration options -->
            {#if newFieldType === 'richtext'}
              <div class="field-config">
                <label class="config-label">
                  Maksymalna długość:
                  <input type="number" bind:value={richTextMaxLength} min="100" step="100" class="config-input" />
                </label>
              </div>
            {:else if newFieldType === 'files'}
              <div class="field-config">
                <div class="config-section">
                  <label class="config-label">Dozwolone typy plików:</label>
                  <div class="checkbox-grid">
                    {#each ['pdf', 'docx', 'xlsx', 'doc', 'xls', 'txt', 'rtf', 'odt', 'ods'] as fileType}
                      <label class="checkbox-label">
                        <input type="checkbox" value={fileType} bind:group={filesAllowedTypes} />
                        {fileType.toUpperCase()}
                      </label>
                    {/each}
                  </div>
                </div>
                <label class="config-label">
                  Max rozmiar (MB):
                  <input type="number" bind:value={filesMaxSize} min="1" max="100" class="config-input" />
                </label>
                <label class="config-label">
                  Max plików:
                  <input type="number" bind:value={filesMaxCount} min="1" max="20" class="config-input" />
                </label>
              </div>
            {:else if newFieldType === 'gallery'}
              <div class="field-config">
                <label class="config-label">
                  Styl wyświetlania:
                  <select bind:value={galleryStyle} class="config-select">
                    <option value="carousel">Karuzela</option>
                    <option value="grid">Siatka</option>
                    <option value="masonry">Masonry</option>
                  </select>
                </label>
                <label class="config-label">
                  <input type="checkbox" bind:checked={galleryAllowImages} />
                  Zezwól na obrazy
                </label>
                <label class="config-label">
                  <input type="checkbox" bind:checked={galleryAllowVideos} />
                  Zezwól na filmy (YouTube/Vimeo)
                </label>
                <label class="config-label">
                  Max elementów:
                  <input type="number" bind:value={galleryMaxItems} min="1" max="50" class="config-input" />
                </label>
              </div>
            {:else if newFieldType === 'multidate'}
              <div class="field-config">
                <div class="config-section">
                  <label class="config-label">Pola dat:</label>
                  {#each multiDateFields as dateField, i}
                    <div class="date-field-row">
                      <input
                        type="text"
                        bind:value={dateField.label}
                        placeholder="Etykieta (np. Data złożenia)"
                        class="config-input"
                      />
                      <input
                        type="text"
                        bind:value={dateField.key}
                        placeholder="Klucz (np. submitted)"
                        class="config-input"
                      />
                      <label class="checkbox-label">
                        <input type="checkbox" bind:checked={dateField.required} />
                        Wymagane
                      </label>
                      {#if multiDateFields.length > 1}
                        <button
                          type="button"
                          onclick={() => removeDateField(i)}
                          class="remove-btn"
                        >
                          ✕
                        </button>
                      {/if}
                    </div>
                  {/each}
                  <button type="button" onclick={addDateField} class="add-btn">
                    + Dodaj pole daty
                  </button>
                </div>
                <label class="config-label">
                  Układ:
                  <select bind:value={multiDateLayout} class="config-select">
                    <option value="horizontal">Poziomy</option>
                    <option value="vertical">Pionowy</option>
                  </select>
                </label>
              </div>
            {:else if newFieldType === 'address'}
              <div class="field-config">
                <div class="config-section">
                  <label class="config-label">Wyświetlane pola:</label>
                  <div class="checkbox-grid">
                    {#each ['street', 'number', 'postalCode', 'city', 'gmina'] as addrField}
                      <label class="checkbox-label">
                        <input type="checkbox" value={addrField} bind:group={addressDisplayFields} />
                        {addrField}
                      </label>
                    {/each}
                  </div>
                </div>
                <div class="config-section">
                  <label class="config-label">Wymagane pola:</label>
                  <div class="checkbox-grid">
                    {#each addressDisplayFields as addrField}
                      <label class="checkbox-label">
                        <input type="checkbox" value={addrField} bind:group={addressRequiredFields} />
                        {addrField}
                      </label>
                    {/each}
                  </div>
                </div>
                <label class="config-label">
                  <input type="checkbox" bind:checked={addressEnableGeocoding} />
                  Włącz synchronizację z lokalizacją
                </label>
              </div>
            {:else if newFieldType === 'links'}
              <div class="field-config">
                <label class="config-label">
                  Max liczba linków:
                  <input type="number" bind:value={linksMaxCount} min="1" max="20" class="config-input" />
                </label>
              </div>
            {:else if newFieldType === 'price'}
              <div class="field-config">
                <label class="config-label">
                  Waluta:
                  <input type="text" bind:value={priceCurrency} class="config-input" placeholder="PLN" />
                </label>
                <div class="config-section">
                  <label class="config-label">Domyślne źródła finansowania:</label>
                  {#each priceFundingSources as source, i}
                    <div class="funding-source-row">
                      <input
                        type="text"
                        bind:value={priceFundingSources[i]}
                        placeholder="Źródło (np. UE)"
                        class="config-input"
                      />
                      {#if priceFundingSources.length > 1}
                        <button
                          type="button"
                          onclick={() => removeFundingSource(i)}
                          class="remove-btn"
                        >
                          ✕
                        </button>
                      {/if}
                    </div>
                  {/each}
                  <button type="button" onclick={addFundingSource} class="add-btn">
                    + Dodaj źródło
                  </button>
                </div>
                <label class="config-label">
                  <input type="checkbox" bind:checked={priceShowPercentages} />
                  Pokazuj procenty
                </label>
                <label class="config-label">
                  <input type="checkbox" bind:checked={priceShowTotal} />
                  Pokazuj sumę
                </label>
              </div>
            {:else if newFieldType === 'tags'}
              <div class="field-config">
                <label class="config-label">
                  <input
                    type="checkbox"
                    bind:checked={allowMultiple}
                    class="config-checkbox"
                  >
                  Wielokrotny wybór
                </label>
              </div>
            {/if}

            <div class="field-actions new-field-actions">
              <!-- Empty spacers to match the alignment -->
              <div class="icon-button-spacer"></div>
              <div class="icon-button-spacer"></div>
              <div class="icon-button-spacer"></div>
              <!-- Save and Cancel buttons in place of up/down arrows -->
              <button
                onclick={saveNewField}
                disabled={!newFieldLabel.trim()}
                class="icon-button save-button"
                title="Zapisz pole"
              >
                <img src="/icons/Checkmark.svg" alt="Save" style="width: 16px; height: 16px;" />
              </button>
              <button
                onclick={cancelNewField}
                class="icon-button cancel-button"
                title="Anuluj"
              >
                ✕
              </button>
            </div>
          </div>
        {/if}

        <!-- Add field button bar -->
        <button class="add-field-bar" onclick={startAddingField} disabled={addingNewField}>
          {@html PlusIcon()}
        </button>
      </div>
    {:else}
      <div class="empty-state">
        <p>Brak zdefiniowanych pól</p>
        <button class="add-field-bar" onclick={startAddingField} disabled={addingNewField}>
          {@html PlusIcon()}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .schema-builder {
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .fields-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    /* Make scrollbar overlay content instead of pushing it */
    scrollbar-gutter: stable;
  }

  /* Custom scrollbar styling for better alignment */
  .fields-container::-webkit-scrollbar {
    width: 12px;
  }

  .fields-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .fields-container::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  .fields-container::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  .fields-list {
    display: flex;
    flex-direction: column;
  }

  .field-row {
    display: grid;
    grid-template-columns: 2fr 1fr auto;
    align-items: start;
    padding: 4px 0;
    min-height: 36px;
    transition: background-color 0.1s ease;
    gap: 12px;
  }

  .field-row:hover:not(.new-field-row) {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .new-field-row {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .field-row.draggable {
    cursor: grab;
  }

  .field-row.draggable:active {
    cursor: grabbing;
  }

  .field-row.dragging {
    opacity: 0.5;
    background-color: rgba(0, 122, 204, 0.1);
  }

  .field-row.drag-over {
    background-color: rgba(0, 122, 204, 0.1);
    border-top: 2px solid #007acc;
  }

  .field-name {
    display: flex;
    align-items: flex-start;
    font-size: 16px;
    color: #000;
    padding-top: 8px;
  }

  .field-type {
    display: flex;
    align-items: flex-start;
    font-size: 16px;
    color: #999;
    text-align: left;
    justify-self: start;
    padding-top: 8px;
  }

  .field-actions {
    display: flex;
    gap: 0;
    justify-self: end;
    align-items: flex-start;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(3, 36px);
    gap: 0;
    align-content: start;
  }

  .field-label {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 2px;
    transition: background-color 0.1s ease;
    font-family: inherit;
  }

  .field-label:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .field-name-edit {
    font-family: inherit;
    font-size: 16px;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
    outline: none;
    background: white;
    min-width: 120px;
    color: #000;
  }

  .field-name-edit:focus {
    border-color: #007acc;
  }

  .field-type-label {
    font-family: inherit;
    font-size: 16px;
    color: #999;
  }

  .field-type-select {
    font-family: inherit;
    font-size: 16px;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 5px;
    outline: none;
    background: white;
    max-width: 100px;
    width: 100px;
    color: #999;
  }

  .new-field-row .field-type-select {
    color: #999;
  }

  .field-type-select:focus {
    border-color: #007acc;
  }

  .icon-button {
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: background-color 0.1s ease;
    color: #000;
  }

  .icon-button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
  }

  .icon-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .icon-button.inactive {
    opacity: 0.5;
  }

  .save-button {
    color: #22c55e;
  }

  .cancel-button {
    color: #ef4444;
  }

  .icon-button-spacer {
    width: 36px;
    height: 36px;
  }

  .new-field-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: nowrap;
    min-width: 180px;
  }

  .required-button {
    color: #999;
  }

  .required-button.active {
    color: #000;
  }

  .required-button:disabled {
    color: #000;
    opacity: 1;
  }

  .edit-button {
    color: #000;
  }

  .edit-button.active {
    background: #000000;
    color: #ffffff;
  }

  .edit-button.active:hover {
    background: #1a1a1a;
  }

  .config-editor-panel {
    grid-column: 1 / -1;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    margin: 0 0 15px 0;
  }

  .config-extra-options {
    margin-top: 20px;
    padding-top: 0;
  }

  .config-option-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .config-option-label {
    font-size: 14px;
    color: #666;
    font-family: inherit;
  }

  .config-option-buttons {
    display: flex;
    gap: 4px;
  }

  .config-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 20px;
    padding-top: 0;
  }

  .config-actions-left {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .config-actions-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .config-save-btn {
    background: #000000;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .config-save-btn:hover {
    background: #1a1a1a;
  }

  .config-cancel-btn {
    background: transparent;
    color: #666;
    border: 1px solid #ccc;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .config-cancel-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: #999;
  }

  .config-delete-btn {
    background: transparent;
    color: #dc2626;
    border: 1px solid rgba(220, 38, 38, 0.3);
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.1s ease;
    display: flex;
    align-items: center;
  }

  .config-delete-btn:hover {
    background: rgba(220, 38, 38, 0.05);
    border-color: #dc2626;
  }

  .config-delete-confirm-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .config-delete-confirm-btn:hover {
    background: #b91c1c;
  }

  .empty-state {
    padding: 24px;
    text-align: center;
    color: #000;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
  }

  .add-field-bar {
    width: 100%;
    padding: 12px;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    border-radius: 5px;
    font-family: inherit;
    font-size: 16px;
    text-align: center;
    transition: all 0.1s ease;
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-field-bar:hover:not(:disabled) {
    color: #000;
    background: rgba(0, 0, 0, 0.02);
  }

  .add-field-bar:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .field-config {
    padding: 0;
    background: transparent;
    border-radius: 0;
    margin: 8px 0 0 0;
  }

  .field-config:last-child {
    margin-bottom: 20px;
  }

  .config-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #666;
    cursor: pointer;
  }

  .config-checkbox {
    margin: 0;
  }

  .category-manager {
    padding: 0;
    background: transparent;
    border-radius: 0;
    margin: 0;
  }

  /* Configuration panel styles */
  .config-section {
    margin-bottom: 16px;
    padding: 0;
  }

  .config-input {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  .config-input:focus {
    outline: none;
    border-color: #007acc;
  }

  .config-row-inline {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .config-input-inline {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    width: 120px;
  }

  .config-input-inline:focus {
    outline: none;
    border-color: #007acc;
  }

  .config-select {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    background: white;
  }

  .config-select:focus {
    outline: none;
    border-color: #007acc;
  }

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
    margin-top: 8px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #333;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .date-field-row,
  .funding-source-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto auto;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
  }

  .add-btn {
    background: #000000;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    margin-top: 8px;
  }

  .add-btn:hover {
    background: #1a1a1a;
  }

  .remove-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    line-height: 1;
  }

  .remove-btn:hover {
    background: #b91c1c;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .field-row {
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 12px 0;
    }

    .field-actions {
      justify-self: start;
    }

    .field-type {
      margin-left: 0;
    }

    .date-field-row,
    .funding-source-row {
      grid-template-columns: 1fr;
    }

    .checkbox-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }
  }
</style>