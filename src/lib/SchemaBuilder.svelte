<script lang="ts">
  import type { Field, Template, FieldType, AddressConfig, MultiDateConfig, PriceConfig, SelectionConfig, SelectionOption } from './types.js';
  import TagManager from './TagManager.svelte';
  import SelectionOptionsEditor from './SchemaBuilder/SelectionOptionsEditor.svelte';
  import Icon from './Icon.svelte';
  import * as dragDrop from './features/dragDrop/index.js';
  import { getFieldTypeDisplayName, getFieldDisplayType, hasEditableConfig, isFieldMandatory } from './SchemaBuilder/fieldTypeHelpers.js';
  import * as fieldOps from './SchemaBuilder/fieldOperations.js';

  interface Props {
    template: Template;
    onUpdate: (template: Template) => void;
  }

  const { template, onUpdate }: Props = $props();

  let editingFieldIndex = $state<number | null>(null);
  let addingNewField = $state(false);
  let newFieldLabel = $state('');
  let newFieldType = $state<FieldType>('richtext');
  let newFieldRequired = $state(false);
  let newFieldConfig = $state<Record<string, unknown>>({});
  let deleteConfirmIndex = $state<number | null>(null);

  // Migration state
  interface MigrationPreview {
    fieldKey: string;
    fieldLabel: string;
    fieldType: 'category' | 'tags';
    targetMode: 'hierarchical' | 'multi';
    tagCount: number;
    pinCount: number;
    willRemoveTags: boolean;
  }

  let showMigrationModal = $state(false);
  let migrationPreview = $state<MigrationPreview | null>(null);
  let isMigrating = $state(false);
  let migrationError = $state<string | null>(null);

  // Field count for header
  const fieldCount = $derived(template?.fields?.filter(f => f.adminVisible).length ?? 0);

  // Check if category field already exists (only one allowed)
  // Includes legacy category fields and selection fields with isCategory flag
  const hasCategoryField = $derived(
    template?.fields?.some(f =>
      f.fieldType === 'category' ||
      f.type === 'category' ||
      (f.fieldType === 'selection' && (f.config as SelectionConfig | undefined)?.isCategory)
    ) ?? false
  );

  // Get the key of the field currently marked as category (for disabling checkbox on other fields)
  const currentCategoryFieldKey = $derived(
    template?.fields?.find(f =>
      f.fieldType === 'category' ||
      f.type === 'category' ||
      (f.fieldType === 'selection' && (f.config as SelectionConfig | undefined)?.isCategory)
    )?.key ?? null
  );

  // Address field labels in Polish
  const addressFieldLabels: Record<string, string> = {
    gmina: 'Gmina',
    street: 'Ulica',
    number: 'Numer',
    postalCode: 'Kod pocztowy',
    city: 'Miasto'
  };

  function startAddingField(): void {
    addingNewField = true;
    newFieldLabel = '';
    newFieldType = 'richtext';
    newFieldRequired = false;
    newFieldConfig = {};
  }

  function saveNewField(): void {
    const updatedTemplate = fieldOps.saveNewField(template, {
      newFieldLabel,
      newFieldType,
      newFieldRequired,
      config: newFieldConfig
    });

    if (updatedTemplate) {
      onUpdate(updatedTemplate);
      addingNewField = false;
      newFieldConfig = {};
    }
  }

  function cancelNewField(): void {
    addingNewField = false;
    newFieldConfig = {};
  }

  function removeField(index: number): void {
    const updatedTemplate = fieldOps.removeField(template, index);

    if (updatedTemplate) {
      onUpdate(updatedTemplate);
      deleteConfirmIndex = null;
    }
  }

  function startDeleteField(index: number): void {
    deleteConfirmIndex = index;
  }

  function toggleRequired(index: number): void {
    const updatedTemplate = fieldOps.toggleRequired(template, index);
    if (updatedTemplate) {
      onUpdate(updatedTemplate);
    }
  }

  function toggleVisibility(index: number): void {
    const updatedTemplate = fieldOps.toggleVisibility(template, index);
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

  function updateFieldConfig(index: number, fieldConfig: Record<string, unknown>): void {
    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.map((f, i) =>
        i === index ? { ...f, config: fieldConfig as any } : f
      )
    };
    onUpdate(updatedTemplate);
  }

  // Toggle address sub-field
  function toggleAddressField(fieldIndex: number, subField: string): void {
    const field = template.fields[fieldIndex];
    const config = (field.config || { displayFields: ['gmina', 'postalCode'] }) as AddressConfig;
    const displayFields = config.displayFields || ['gmina', 'postalCode'];

    const newDisplayFields = displayFields.includes(subField)
      ? displayFields.filter(f => f !== subField)
      : [...displayFields, subField];

    updateFieldConfig(fieldIndex, { ...config, displayFields: newDisplayFields });
  }

  // Add date field to multidate
  function addDateField(fieldIndex: number): void {
    const field = template.fields[fieldIndex];
    const config = (field.config || { dateFields: [] }) as MultiDateConfig;
    const dateFields = config.dateFields || [];

    const newDateFields = [...dateFields, { key: `date_${Date.now()}`, label: '', required: false }];
    updateFieldConfig(fieldIndex, { ...config, dateFields: newDateFields });
  }

  // Update date field label
  function updateDateFieldLabel(fieldIndex: number, dateIndex: number, label: string): void {
    const field = template.fields[fieldIndex];
    const config = (field.config || { dateFields: [] }) as MultiDateConfig;
    const dateFields = [...(config.dateFields || [])];

    if (dateFields[dateIndex]) {
      dateFields[dateIndex] = { ...dateFields[dateIndex], label };
      updateFieldConfig(fieldIndex, { ...config, dateFields });
    }
  }

  // Remove date field
  function removeDateField(fieldIndex: number, dateIndex: number): void {
    const field = template.fields[fieldIndex];
    const config = (field.config || { dateFields: [] }) as MultiDateConfig;
    const dateFields = (config.dateFields || []).filter((_, i) => i !== dateIndex);

    updateFieldConfig(fieldIndex, { ...config, dateFields });
  }

  // Change field type
  function changeFieldType(index: number, newType: FieldType): void {
    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.map((f, i) =>
        i === index ? { ...f, fieldType: newType, type: newType, config: {} } : f
      )
    };
    onUpdate(updatedTemplate);
  }

  // Drag and drop helper
  function canMoveField(field: Field): boolean {
    return field.key !== 'title' && field.key !== 'name';
  }

  function handleFieldDrop(event: DragEvent, dropIndex: number): void {
    const newFields = dragDrop.handleDrop(
      event,
      dropIndex,
      template.fields,
      canMoveField,
      canMoveField
    );

    if (newFields) {
      const updatedTemplate: Template = { ...template, fields: newFields };
      onUpdate(updatedTemplate);
    }
  }

  // Get address display fields for a field
  function getAddressDisplayFields(field: Field): string[] {
    const config = field.config as AddressConfig | undefined;
    return config?.displayFields || ['gmina', 'postalCode'];
  }

  // Get date fields for a multidate field
  function getDateFields(field: Field): Array<{ key: string; label: string; required: boolean }> {
    const config = field.config as MultiDateConfig | undefined;
    return config?.dateFields || [];
  }

  // Get price config for a field
  function getPriceConfig(field: Field): PriceConfig {
    const config = field.config as PriceConfig | undefined;
    return {
      currency: config?.currency || 'PLN',
      defaultFundingSources: config?.defaultFundingSources || ['UE', 'Wnioskodawca'],
      showPercentages: config?.showPercentages ?? true,
      showTotal: config?.showTotal ?? true
    };
  }

  // Update price currency
  function updatePriceCurrency(fieldIndex: number, currency: string): void {
    const field = template.fields[fieldIndex];
    const config = getPriceConfig(field);
    updateFieldConfig(fieldIndex, { ...config, currency });
  }

  // Add funding source
  function addPriceFundingSource(fieldIndex: number): void {
    const field = template.fields[fieldIndex];
    const config = getPriceConfig(field);
    const newSources = [...config.defaultFundingSources, ''];
    updateFieldConfig(fieldIndex, { ...config, defaultFundingSources: newSources });
  }

  // Remove funding source
  function removePriceFundingSource(fieldIndex: number, sourceIndex: number): void {
    const field = template.fields[fieldIndex];
    const config = getPriceConfig(field);
    const newSources = config.defaultFundingSources.filter((_, i) => i !== sourceIndex);
    updateFieldConfig(fieldIndex, { ...config, defaultFundingSources: newSources });
  }

  // Update funding source
  function updatePriceFundingSource(fieldIndex: number, sourceIndex: number, value: string): void {
    const field = template.fields[fieldIndex];
    const config = getPriceConfig(field);
    const newSources = [...config.defaultFundingSources];
    newSources[sourceIndex] = value;
    updateFieldConfig(fieldIndex, { ...config, defaultFundingSources: newSources });
  }

  // Toggle price option
  function togglePriceOption(fieldIndex: number, option: 'showPercentages' | 'showTotal'): void {
    const field = template.fields[fieldIndex];
    const config = getPriceConfig(field);
    updateFieldConfig(fieldIndex, { ...config, [option]: !config[option] });
  }

  // Get selection config for a field
  function getSelectionConfig(field: Field): SelectionConfig {
    const config = field.config as SelectionConfig | undefined;
    return {
      mode: config?.mode || 'single',
      options: config?.options || [],
      allowCustom: config?.allowCustom ?? false,
      maxSelections: config?.maxSelections,
      maxSecondary: config?.maxSecondary,
      isCategory: config?.isCategory ?? false
    };
  }

  // Update selection mode
  function updateSelectionMode(fieldIndex: number, mode: 'single' | 'multi' | 'hierarchical'): void {
    const field = template.fields[fieldIndex];
    const config = getSelectionConfig(field);
    updateFieldConfig(fieldIndex, { ...config, mode });
  }

  // Update selection options
  function updateSelectionOptions(fieldIndex: number, options: SelectionOption[]): void {
    const field = template.fields[fieldIndex];
    const config = getSelectionConfig(field);
    updateFieldConfig(fieldIndex, { ...config, options });
  }

  // Toggle allow custom entries
  function toggleSelectionAllowCustom(fieldIndex: number): void {
    const field = template.fields[fieldIndex];
    const config = getSelectionConfig(field);
    updateFieldConfig(fieldIndex, { ...config, allowCustom: !config.allowCustom });
  }

  // Update max selections (for multi mode)
  function updateSelectionMaxSelections(fieldIndex: number, max: number | undefined): void {
    const field = template.fields[fieldIndex];
    const config = getSelectionConfig(field);
    updateFieldConfig(fieldIndex, { ...config, maxSelections: max });
  }

  // Update max secondary (for hierarchical mode)
  function updateSelectionMaxSecondary(fieldIndex: number, max: number | undefined): void {
    const field = template.fields[fieldIndex];
    const config = getSelectionConfig(field);
    updateFieldConfig(fieldIndex, { ...config, maxSecondary: max });
  }

  // Toggle isCategory flag (only one field can have it)
  function toggleSelectionIsCategory(fieldIndex: number): void {
    const field = template.fields[fieldIndex];
    const config = getSelectionConfig(field);
    const newValue = !config.isCategory;

    // If enabling, first clear isCategory from any other field
    let updatedFields = template.fields;
    if (newValue) {
      updatedFields = template.fields.map((f) => {
        if (f.fieldType === 'selection' && f.key !== field.key) {
          const fConfig = f.config as SelectionConfig | undefined;
          if (fConfig?.isCategory) {
            return { ...f, config: { ...fConfig, isCategory: false } };
          }
        }
        return f;
      });
    }

    // Update the current field
    const finalFields = updatedFields.map((f, i) =>
      i === fieldIndex ? { ...f, config: { ...config, isCategory: newValue } } : f
    );

    const updatedTemplate: Template = { ...template, fields: finalFields };
    onUpdate(updatedTemplate);
  }

  // Migration functions
  async function startMigration(fieldKey: string): Promise<void> {
    migrationError = null;

    try {
      const response = await fetch(`/api/migrate-field?fieldKey=${encodeURIComponent(fieldKey)}`);
      const data = await response.json();

      if (data.success && data.preview) {
        migrationPreview = data.preview;
        showMigrationModal = true;
      } else {
        migrationError = data.error || 'Nie udało się pobrać informacji o migracji';
      }
    } catch (error) {
      migrationError = 'Błąd połączenia z serwerem';
      console.error('Migration preview error:', error);
    }
  }

  async function confirmMigration(): Promise<void> {
    if (!migrationPreview) return;

    isMigrating = true;
    migrationError = null;

    try {
      const response = await fetch('/api/migrate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey: migrationPreview.fieldKey })
      });

      const data = await response.json();

      if (data.success) {
        // Reload the page to get the updated template
        window.location.reload();
      } else {
        migrationError = data.error || 'Migracja nie powiodła się';
        isMigrating = false;
      }
    } catch (error) {
      migrationError = 'Błąd połączenia z serwerem';
      isMigrating = false;
      console.error('Migration error:', error);
    }
  }

  function cancelMigration(): void {
    showMigrationModal = false;
    migrationPreview = null;
    migrationError = null;
  }

</script>

<div class="schema-builder">
  <!-- Header with field count -->
  <div class="schema-header">
    <span class="field-count">{fieldCount} {fieldCount === 1 ? 'pole' : fieldCount < 5 ? 'pola' : 'pól'}</span>
  </div>

  <div class="fields-container">
    {#if template?.fields && template.fields.length > 0}
      <div class="fields-list">
        {#each template.fields.filter(f => f.adminVisible) as field, i}
          {@const originalIndex = template.fields.findIndex(f => f.key === field.key)}
          {@const fieldType = field.fieldType || field.type}
          {@const isMandatory = isFieldMandatory(field)}

          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="field-row"
            class:draggable={canMoveField(field)}
            class:dragging={dragDrop.getDraggedFieldIndex() === originalIndex}
            class:drag-over={dragDrop.getDragOverIndex() === originalIndex}
            draggable={canMoveField(field)}
            ondragstart={(e) => dragDrop.startDrag(e, originalIndex)}
            ondragover={(e) => dragDrop.handleDragOver(e, originalIndex)}
            ondragleave={dragDrop.handleDragLeave}
            ondrop={(e) => handleFieldDrop(e, originalIndex)}
            role="listitem"
          >
            <!-- Left: Field label (outside card) -->
            <div class="field-label-column">
              {#if editingFieldIndex === originalIndex}
                <input
                  type="text"
                  value={field.displayLabel || field.label}
                  class="field-name-input"
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
                />
              {:else}
                <button
                  type="button"
                  class="field-label field-label-btn"
                  onclick={() => startEditingField(originalIndex)}
                >
                  {field.displayLabel || field.label}
                </button>
              {/if}
            </div>

            <!-- Right: Card with type, icons, and content -->
            <div class="field-card">
              <div class="card-header">
                <!-- Type dropdown -->
                <div class="field-type-area">
                  {#if isMandatory}
                    <span class="field-type-badge">{getFieldDisplayType(field)}</span>
                  {:else}
                    <select
                      class="field-type-select"
                      value={fieldType}
                      onchange={(e) => changeFieldType(originalIndex, e.currentTarget.value as FieldType)}
                    >
                      <option value="richtext">Tekst</option>
                      <option value="files">Pliki</option>
                      <option value="gallery">Galeria</option>
                      <option value="multidate">Data</option>
                      <option value="address">Adres</option>
                      <option value="links">Linki</option>
                      <option value="price">Kwota</option>
                      <option value="selection">Lista wyboru</option>
                      {#if fieldType === 'category' || fieldType === 'tags'}
                        <!-- Show legacy options only for existing legacy fields -->
                        <option value="category">Kategoria (legacy)</option>
                        <option value="tags">Tagi (legacy)</option>
                      {/if}
                    </select>
                  {/if}
                </div>

                <!-- Action icons -->
                <div class="field-actions">
                  <button
                    onclick={() => toggleRequired(originalIndex)}
                    disabled={isMandatory}
                    class="icon-btn"
                    class:active={field.required}
                    title={isMandatory ? 'Pole systemowe' : (field.required ? 'Wymagane' : 'Opcjonalne')}
                  >
                    <Icon name="Circle/Exclamation" size={20} />
                  </button>

                  <button
                    onclick={() => toggleVisibility(originalIndex)}
                    class="icon-btn"
                    class:inactive={!field.visible}
                    title={field.visible ? 'Widoczne' : 'Ukryte'}
                  >
                    <Icon name="Eye" size={20} />
                  </button>

                  {#if !isMandatory}
                    <button
                      onclick={() => deleteConfirmIndex === originalIndex ? removeField(originalIndex) : startDeleteField(originalIndex)}
                      class="icon-btn delete-btn"
                      class:confirm={deleteConfirmIndex === originalIndex}
                      title={deleteConfirmIndex === originalIndex ? 'Kliknij aby potwierdzić' : 'Usuń'}
                    >
                      <Icon name="Trash" size={20} />
                    </button>
                  {:else}
                    <button class="icon-btn lock-btn" disabled title="Pole systemowe">
                      <Icon name="Action/Lock" size={20} />
                    </button>
                  {/if}

                  <button class="icon-btn drag-handle" title="Przeciągnij">
                    <Icon name="Hand/Drag" size={20} />
                  </button>
                </div>

                <!-- Reorder arrows -->
                <div class="reorder-arrows">
                  <button
                    onclick={() => moveFieldUp(originalIndex)}
                    disabled={originalIndex === 0 || !canMoveField(field) || (originalIndex > 0 && (template.fields[originalIndex - 1].key === 'title' || template.fields[originalIndex - 1].key === 'name'))}
                    class="arrow-btn"
                    title="W górę"
                  >
                    <Icon name="Chevron/Up" size={16} />
                  </button>
                  <button
                    onclick={() => moveFieldDown(originalIndex)}
                    disabled={originalIndex === template.fields.length - 1 || !canMoveField(field) || (originalIndex < template.fields.length - 1 && (template.fields[originalIndex + 1].key === 'title' || template.fields[originalIndex + 1].key === 'name'))}
                    class="arrow-btn"
                    title="W dół"
                  >
                    <Icon name="Chevron/Down" size={16} />
                  </button>
                </div>
              </div>

              <!-- Card content - expanded configuration -->
              {#if fieldType === 'address'}
                <div class="card-content">
                  {#each ['gmina', 'street', 'number', 'postalCode'] as subField}
                    {@const isEnabled = getAddressDisplayFields(field).includes(subField)}
                    <button
                      class="subfield-toggle"
                      class:enabled={isEnabled}
                      onclick={() => toggleAddressField(originalIndex, subField)}
                    >
                      <span class="toggle-icon">✓</span>
                      <span class="toggle-label">{addressFieldLabels[subField]}</span>
                    </button>
                  {/each}
                </div>
              {:else if fieldType === 'multidate'}
                <div class="card-content">
                  {#each getDateFields(field) as dateField, dateIndex}
                    <div class="date-field-item">
                      <input
                        type="text"
                        class="date-label-input"
                        value={dateField.label}
                        placeholder="Nazwa daty"
                        oninput={(e) => updateDateFieldLabel(originalIndex, dateIndex, e.currentTarget.value)}
                      />
                      <button
                        class="remove-date-btn"
                        onclick={() => removeDateField(originalIndex, dateIndex)}
                        title="Usuń datę"
                      >
                        ✕
                      </button>
                    </div>
                  {/each}
                  <button class="add-date-btn" onclick={() => addDateField(originalIndex)}>
                    + Dodaj datę
                  </button>
                </div>
              {:else if fieldType === 'category' || fieldType === 'tags'}
                <div class="card-content legacy-content">
                  <div class="legacy-notice">
                    <span class="legacy-icon">⚠️</span>
                    <span class="legacy-text">Pole typu legacy</span>
                  </div>
                  <button
                    class="migrate-btn"
                    onclick={() => startMigration(field.key || field.fieldName)}
                  >
                    🔄 Konwertuj do nowego systemu
                  </button>
                  <p class="migrate-hint">
                    Konwersja zmieni to pole na "Lista wyboru" z trybem
                    {fieldType === 'category' ? 'hierarchicznym' : 'wielokrotnym'}.
                  </p>
                  {#if fieldType === 'category'}
                    <details class="tag-manager-details">
                      <summary>Zarządzaj tagami (legacy)</summary>
                      <TagManager template={template} onUpdate={onUpdate} />
                    </details>
                  {/if}
                </div>
              {:else if fieldType === 'gallery'}
                <div class="card-content gallery-placeholder">
                  <!-- Empty space for gallery config - matches design -->
                </div>
              {:else if fieldType === 'price'}
                {@const priceConfig = getPriceConfig(field)}
                <div class="card-content price-content">
                  <div class="price-columns">
                    <!-- Left column: Funding sources -->
                    <div class="price-col-sources">
                      <span class="price-label">Źródła:</span>
                      <div class="funding-sources">
                        {#each priceConfig.defaultFundingSources as source, sourceIndex}
                          <div class="funding-source-item">
                            <input
                              type="text"
                              class="funding-source-input"
                              value={source}
                              oninput={(e) => updatePriceFundingSource(originalIndex, sourceIndex, e.currentTarget.value)}
                              placeholder="Źródło"
                            />
                            <button
                              class="remove-source-btn"
                              onclick={() => removePriceFundingSource(originalIndex, sourceIndex)}
                              title="Usuń"
                            >✕</button>
                          </div>
                        {/each}
                        <button class="add-source-btn" onclick={() => addPriceFundingSource(originalIndex)}>
                          + Dodaj źródło
                        </button>
                      </div>
                    </div>
                    <!-- Right column: Currency + options -->
                    <div class="price-col-options">
                      <div class="price-currency-row">
                        <span class="price-label">Waluta:</span>
                        <input
                          type="text"
                          class="price-currency-input"
                          value={priceConfig.currency}
                          oninput={(e) => updatePriceCurrency(originalIndex, e.currentTarget.value)}
                          placeholder="PLN"
                        />
                      </div>
                      <button
                        class="price-option-toggle"
                        class:enabled={priceConfig.showPercentages}
                        onclick={() => togglePriceOption(originalIndex, 'showPercentages')}
                      >
                        <span class="toggle-icon">✓</span>
                        <span class="toggle-label">Procenty</span>
                      </button>
                      <button
                        class="price-option-toggle"
                        class:enabled={priceConfig.showTotal}
                        onclick={() => togglePriceOption(originalIndex, 'showTotal')}
                      >
                        <span class="toggle-icon">✓</span>
                        <span class="toggle-label">Suma</span>
                      </button>
                    </div>
                  </div>
                </div>
              {:else if fieldType === 'selection'}
                {@const selectionConfig = getSelectionConfig(field)}
                <div class="card-content selection-content">
                  <div class="selection-columns">
                    <!-- Left column: Options -->
                    <div class="selection-col-options">
                      <span class="selection-label">Opcje:</span>
                      <SelectionOptionsEditor
                        options={selectionConfig.options}
                        onUpdate={(opts) => updateSelectionOptions(originalIndex, opts)}
                      />
                    </div>
                    <!-- Right column: Mode + settings -->
                    <div class="selection-col-settings">
                      <div class="selection-mode-row">
                        <span class="selection-label">Tryb:</span>
                        <select
                          class="selection-mode-select"
                          value={selectionConfig.mode}
                          onchange={(e) => updateSelectionMode(originalIndex, e.currentTarget.value as 'single' | 'multi' | 'hierarchical')}
                        >
                          <option value="single">Pojedynczy</option>
                          <option value="multi">Wielokrotny</option>
                          <option value="hierarchical">Hierarchiczny</option>
                        </select>
                      </div>
                      {#if selectionConfig.mode === 'multi'}
                        <div class="selection-limit-row">
                          <span class="selection-label">Max:</span>
                          <input
                            type="number"
                            class="selection-limit-input"
                            value={selectionConfig.maxSelections || ''}
                            oninput={(e) => updateSelectionMaxSelections(originalIndex, e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined)}
                            placeholder="∞"
                            min="1"
                          />
                        </div>
                      {:else if selectionConfig.mode === 'hierarchical'}
                        <div class="selection-limit-row">
                          <span class="selection-label">Max dod.:</span>
                          <input
                            type="number"
                            class="selection-limit-input"
                            value={selectionConfig.maxSecondary || ''}
                            oninput={(e) => updateSelectionMaxSecondary(originalIndex, e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined)}
                            placeholder="∞"
                            min="1"
                          />
                        </div>
                      {/if}
                      <button
                        class="selection-option-toggle"
                        class:enabled={selectionConfig.allowCustom}
                        onclick={() => toggleSelectionAllowCustom(originalIndex)}
                      >
                        <span class="toggle-icon">✓</span>
                        <span class="toggle-label">Własne wartości</span>
                      </button>
                      <!-- Category checkbox - only one field can have this -->
                      <button
                        class="selection-option-toggle category-toggle"
                        class:enabled={selectionConfig.isCategory}
                        class:disabled={hasCategoryField && !selectionConfig.isCategory}
                        onclick={() => !(hasCategoryField && !selectionConfig.isCategory) && toggleSelectionIsCategory(originalIndex)}
                        title={(hasCategoryField && !selectionConfig.isCategory) ? 'Inne pole jest już oznaczone jako kategoria' : 'Użyj jako kategorię na mapie (kolory pinów)'}
                        disabled={hasCategoryField && !selectionConfig.isCategory}
                      >
                        <span class="toggle-icon">✓</span>
                        <span class="toggle-label">Kategoria mapy</span>
                      </button>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}

        <!-- Add new field row -->
        {#if addingNewField}
          <div class="field-row new-field-row">
            <!-- Left: Field label input -->
            <div class="field-label-column">
              <input
                type="text"
                bind:value={newFieldLabel}
                placeholder="Nazwa pola"
                class="field-name-input"
                onkeydown={(e) => {
                  if (e.key === 'Enter' && newFieldLabel.trim()) {
                    saveNewField();
                  } else if (e.key === 'Escape') {
                    cancelNewField();
                  }
                }}
              />
            </div>

            <!-- Right: Card with type and save/cancel -->
            <div class="field-card new-field-card">
              <div class="card-header">
                <div class="field-type-area">
                  <select bind:value={newFieldType} class="field-type-select">
                    <option value="richtext">Tekst</option>
                    <option value="files">Pliki</option>
                    <option value="gallery">Galeria</option>
                    <option value="multidate">Data</option>
                    <option value="address">Adres</option>
                    <option value="links">Linki</option>
                    <option value="price">Kwota</option>
                    <option value="selection">Lista wyboru</option>
                  </select>
                </div>

                <div class="field-actions">
                  <button
                    onclick={saveNewField}
                    disabled={!newFieldLabel.trim()}
                    class="icon-btn save-btn"
                    title="Zapisz"
                  >
                    <Icon name="Checkmark" size={20} />
                  </button>
                  <button
                    onclick={cancelNewField}
                    class="icon-btn cancel-btn"
                    title="Anuluj"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Add field button -->
        <button class="add-field-btn" onclick={startAddingField} disabled={addingNewField}>
          <Icon name="Brightess/Plus" size={20} />
        </button>
      </div>
    {:else}
      <div class="empty-state">
        <p>Brak zdefiniowanych pól</p>
        <button class="add-field-btn" onclick={startAddingField} disabled={addingNewField}>
          <Icon name="Brightess/Plus" size={20} />
        </button>
      </div>
    {/if}
  </div>
</div>

<!-- Migration Confirmation Modal -->
{#if showMigrationModal && migrationPreview}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="migration-modal-overlay"
    onclick={cancelMigration}
    onkeydown={(e) => e.key === 'Escape' && cancelMigration()}
    role="presentation"
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="migration-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="migration-modal-title" tabindex="-1">
      <h3 id="migration-modal-title" class="migration-modal-title">
        Konwertuj pole "{migrationPreview.fieldLabel}"
      </h3>

      <div class="migration-modal-content">
        <p class="migration-info">Co się zmieni:</p>
        <ul class="migration-changes">
          <li>
            Typ pola: <strong>{migrationPreview.fieldType}</strong> →
            <strong>lista wyboru ({migrationPreview.targetMode === 'hierarchical' ? 'hierarchiczny' : 'wielokrotny'})</strong>
          </li>
          <li>
            <strong>{migrationPreview.tagCount}</strong> tagów zostanie skopiowanych jako opcje pola
          </li>
          <li>
            <strong>{migrationPreview.pinCount}</strong> pinów zostanie zaktualizowanych
          </li>
        </ul>

        {#if migrationPreview.willRemoveTags}
          <p class="migration-warning">
            ⚠️ Nieużywane tagi zostaną usunięte z puli globalnej.
          </p>
        {/if}

        <p class="migration-irreversible">
          Ta operacja jest nieodwracalna.
        </p>

        {#if migrationError}
          <p class="migration-error">{migrationError}</p>
        {/if}
      </div>

      <div class="migration-modal-actions">
        <button class="migration-cancel-btn" onclick={cancelMigration} disabled={isMigrating}>
          Anuluj
        </button>
        <button class="migration-confirm-btn" onclick={confirmMigration} disabled={isMigrating}>
          {#if isMigrating}
            Migrowanie...
          {:else}
            Konwertuj
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .schema-builder {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .schema-header {
    padding: 4px 0;
    margin-bottom: 4px;
  }

  .field-count {
    font-size: 12px;
    color: #666;
  }

  .fields-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
  }

  .fields-container::-webkit-scrollbar {
    width: 8px;
  }

  .fields-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .fields-container::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .fields-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 100px; /* Space for labels to overflow into */
  }

  /* Field Row - card only, label positioned absolutely */
  .field-row {
    position: relative;
  }

  .field-row.draggable {
    cursor: grab;
  }

  .field-row.draggable:active {
    cursor: grabbing;
  }

  .field-row.dragging {
    opacity: 0.5;
  }

  .field-row.drag-over .field-card {
    background: rgba(0, 122, 204, 0.1);
    box-shadow: inset 0 2px 0 0 #007acc;
  }

  /* Label - absolutely positioned to the left of card */
  .field-label-column {
    position: absolute;
    right: calc(100% + 8px);
    top: 6px;
    width: 92px;
    text-align: right;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .field-label {
    font-size: 13px;
    font-weight: 500;
    color: #000;
    cursor: pointer;
    display: block;
    line-height: 1.3;
    text-align: right;
  }

  .field-label:hover {
    text-decoration: underline;
  }

  .field-label-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    width: 100%;
  }

  .field-name-input {
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 2px 4px;
    border: 1px solid #ccc;
    border-radius: 4px;
    outline: none;
    background: white;
    width: 100%;
    color: #000;
    text-align: right;
  }

  .field-name-input:focus {
    border-color: #007acc;
  }

  /* Right column: Field Card - consistent width */
  .field-card {
    background: #f5f5f5;
    border-radius: 6px;
    padding: 6px 8px;
    transition: all 0.15s ease;
  }

  .field-card:hover {
    background: #efefef;
  }

  .new-field-card {
    background: #fff;
    border: 1px dashed #ccc;
  }

  /* Card Header */
  .card-header {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Type Area */
  .field-type-area {
    flex: 0 0 auto;
  }

  .field-type-badge {
    display: inline-block;
    padding: 4px 8px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
  }

  .field-type-select {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
    background: white;
    color: #666;
    cursor: pointer;
    min-width: 80px;
  }

  .field-type-select:hover {
    border-color: #aaa;
  }

  .field-type-select:focus {
    border-color: #007acc;
  }

  /* Field Actions */
  .field-actions {
    display: flex;
    align-items: center;
    gap: 0;
    margin-left: auto;
  }

  .icon-btn {
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    transition: all 0.15s ease;
  }

  .icon-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
    color: #333;
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .icon-btn.active {
    color: #000;
  }

  .icon-btn.inactive {
    opacity: 0.4;
  }

  .icon-btn.delete-btn:hover {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }

  .icon-btn.delete-btn.confirm {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.15);
  }

  .icon-btn.lock-btn {
    color: #888;
  }

  .icon-btn.save-btn {
    color: #22c55e;
  }

  .icon-btn.save-btn:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.1);
  }

  .icon-btn.cancel-btn {
    color: #ef4444;
    font-size: 14px;
    font-weight: bold;
  }

  .icon-btn.cancel-btn:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .drag-handle {
    cursor: grab;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  /* Reorder Arrows */
  .reorder-arrows {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .arrow-btn {
    width: 20px;
    height: 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    transition: color 0.15s ease;
  }

  .arrow-btn:hover:not(:disabled) {
    color: #333;
  }

  .arrow-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Card Content (expanded config) */
  .card-content {
    margin-top: 8px;
    padding-left: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  /* Address sub-field toggles */
  .subfield-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    color: #333;
  }

  .subfield-toggle:hover {
    color: #000;
  }

  .subfield-toggle .toggle-icon {
    width: 14px;
    height: 14px;
    border: 1.5px solid #999;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    background: white;
    transition: all 0.15s ease;
  }

  .subfield-toggle:hover .toggle-icon {
    border-color: #666;
  }

  .subfield-toggle.enabled .toggle-icon {
    background: #22c55e;
    border-color: #22c55e;
    color: white;
  }

  .subfield-toggle:not(.enabled) .toggle-icon {
    color: transparent;
  }

  .subfield-toggle .toggle-label {
    color: inherit;
  }

  .subfield-toggle:not(.enabled) .toggle-label {
    color: #666;
  }

  /* Multidate fields */
  .date-field-item {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .date-label-input {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
    background: white;
    width: 180px;
  }

  .date-label-input:focus {
    border-color: #007acc;
  }

  .remove-date-btn {
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #999;
    font-size: 12px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-date-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .add-date-btn {
    display: inline-block;
    padding: 4px 8px;
    background: transparent;
    border: 1px dashed #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    color: #666;
    transition: all 0.15s ease;
  }

  .add-date-btn:hover {
    border-color: #999;
    color: #333;
    background: rgba(0, 0, 0, 0.02);
  }

  /* Category content */
  .category-content {
    margin-top: 6px;
  }

  /* Gallery placeholder */
  .gallery-placeholder {
    min-height: 40px;
  }

  /* Price field config */
  .price-content {
    display: flex;
    flex-direction: column;
  }

  .price-columns {
    display: flex;
    gap: 24px;
  }

  .price-col-sources {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .price-col-options {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .price-currency-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .price-label {
    font-size: 12px;
    color: #666;
  }

  .price-currency-input {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
    background: white;
    width: 50px;
  }

  .price-currency-input:focus {
    border-color: #007acc;
  }

  .funding-sources {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .funding-source-item {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .funding-source-input {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
    background: white;
    width: 180px;
  }

  .funding-source-input:focus {
    border-color: #007acc;
  }

  .remove-source-btn {
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #999;
    font-size: 11px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-source-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .add-source-btn {
    display: inline-block;
    padding: 4px 8px;
    background: transparent;
    border: 1px dashed #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    color: #666;
    transition: all 0.15s ease;
  }

  .add-source-btn:hover {
    border-color: #999;
    color: #333;
  }

  .price-option-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    color: #333;
  }

  .price-option-toggle:hover {
    color: #000;
  }

  .price-option-toggle .toggle-icon {
    width: 14px;
    height: 14px;
    border: 1.5px solid #999;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    background: white;
    transition: all 0.15s ease;
  }

  .price-option-toggle:hover .toggle-icon {
    border-color: #666;
  }

  .price-option-toggle.enabled .toggle-icon {
    background: #22c55e;
    border-color: #22c55e;
    color: white;
  }

  .price-option-toggle:not(.enabled) .toggle-icon {
    color: transparent;
  }

  .price-option-toggle:not(.enabled) .toggle-label {
    color: #666;
  }

  /* Selection field config */
  .selection-content {
    display: flex;
    flex-direction: column;
  }

  .selection-columns {
    display: flex;
    gap: 24px;
  }

  .selection-col-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .selection-col-settings {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 140px;
  }

  .selection-label {
    font-size: 12px;
    color: #666;
  }

  .selection-mode-row,
  .selection-limit-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .selection-mode-select {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
    background: white;
    cursor: pointer;
  }

  .selection-mode-select:focus {
    border-color: #007acc;
  }

  .selection-limit-input {
    font-family: inherit;
    font-size: 12px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
    background: white;
    width: 50px;
  }

  .selection-limit-input:focus {
    border-color: #007acc;
  }

  .selection-option-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    color: #333;
  }

  .selection-option-toggle:hover {
    color: #000;
  }

  .selection-option-toggle .toggle-icon {
    width: 14px;
    height: 14px;
    border: 1.5px solid #999;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    background: white;
    transition: all 0.15s ease;
  }

  .selection-option-toggle:hover .toggle-icon {
    border-color: #666;
  }

  .selection-option-toggle.enabled .toggle-icon {
    background: #22c55e;
    border-color: #22c55e;
    color: white;
  }

  .selection-option-toggle:not(.enabled) .toggle-icon {
    color: transparent;
  }

  .selection-option-toggle:not(.enabled) .toggle-label {
    color: #666;
  }

  .selection-option-toggle.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .selection-option-toggle.disabled:hover {
    color: #333;
  }

  .selection-option-toggle.disabled .toggle-icon {
    border-color: #ccc;
  }

  .selection-option-toggle.category-toggle.enabled .toggle-icon {
    background: #2563eb;
    border-color: #2563eb;
  }

  /* Add field button */
  .add-field-btn {
    width: 100%;
    padding: 8px;
    border: 1px dashed #ccc;
    background: transparent;
    color: #666;
    cursor: pointer;
    border-radius: 6px;
    font-family: inherit;
    font-size: 13px;
    text-align: center;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-field-btn:hover:not(:disabled) {
    border-color: #999;
    color: #333;
    background: rgba(0, 0, 0, 0.02);
  }

  .add-field-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Empty state */
  .empty-state {
    padding: 24px;
    text-align: center;
    color: #666;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .empty-state p {
    margin: 0;
    font-size: 12px;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .fields-list {
      margin-left: 0;
    }

    .field-label-column {
      position: static;
      width: auto;
      padding-bottom: 2px;
      text-align: left;
    }

    .field-label {
      text-align: left;
    }

    .field-name-input {
      text-align: left;
    }

    .field-row {
      display: flex;
      flex-direction: column;
    }

    .card-header {
      flex-wrap: wrap;
      gap: 4px;
    }

    .field-actions {
      margin-left: 0;
    }

    .reorder-arrows {
      flex-direction: row;
    }
  }

  /* Legacy field content */
  .legacy-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .legacy-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #b45309;
    font-size: 12px;
  }

  .legacy-icon {
    font-size: 14px;
  }

  .migrate-btn {
    padding: 8px 12px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    transition: background-color 0.15s;
  }

  .migrate-btn:hover {
    background: #1d4ed8;
  }

  .migrate-hint {
    font-size: 11px;
    color: #666;
    margin: 0;
    line-height: 1.4;
  }

  .tag-manager-details {
    margin-top: 8px;
  }

  .tag-manager-details summary {
    cursor: pointer;
    font-size: 11px;
    color: #666;
    padding: 4px 0;
  }

  .tag-manager-details summary:hover {
    color: #333;
  }

  /* Migration Modal */
  .migration-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .migration-modal {
    background: white;
    border: 1px solid #000;
    padding: 24px;
    max-width: 480px;
    width: 90%;
  }

  .migration-modal-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .migration-modal-content {
    margin-bottom: 20px;
  }

  .migration-info {
    margin: 0 0 8px 0;
    font-weight: 500;
  }

  .migration-changes {
    margin: 0 0 12px 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.6;
  }

  .migration-changes li {
    margin-bottom: 4px;
  }

  .migration-warning {
    padding: 8px 12px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    font-size: 12px;
    margin: 12px 0;
  }

  .migration-irreversible {
    font-size: 12px;
    color: #dc2626;
    font-weight: 500;
    margin: 12px 0 0 0;
  }

  .migration-error {
    color: #dc2626;
    font-size: 12px;
    margin: 8px 0;
    padding: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  .migration-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .migration-cancel-btn,
  .migration-confirm-btn {
    padding: 8px 16px;
    border: 1px solid #000;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .migration-cancel-btn {
    background: white;
    color: #000;
  }

  .migration-cancel-btn:hover:not(:disabled) {
    background: #f3f4f6;
  }

  .migration-confirm-btn {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .migration-confirm-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .migration-cancel-btn:disabled,
  .migration-confirm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>