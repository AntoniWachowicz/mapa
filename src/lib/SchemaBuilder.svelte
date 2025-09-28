<script lang="ts">
  import type { Field, Template } from './types.js';
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
  
  interface Props {
    template: Template;
    onUpdate: (template: Template) => void;
  }
  
  const { template, onUpdate }: Props = $props();
  
  let label = $state('');
  let type = $state<Field['type']>('text');
  let required = $state(false);
  let maxMinorTags = $state(3); // For tags field type
  let selectOptions = $state(''); // For select field type (comma-separated)
  let addressSync = $state(false); // For address field type (auto-sync with coordinates)
  let editingFieldIndex = $state<number | null>(null);
  let addingNewField = $state(false);
  let newFieldLabel = $state('');
  let newFieldType = $state<Field['type']>('text');
  let newFieldRequired = $state(false);
  
  // Check if tags field already exists
  const hasTagsField = $derived(template?.fields?.some(f => f.type === 'tags') ?? false);
  const canAddTagsField = $derived(!hasTagsField && type === 'tags');
  
  function addField(): void {
    if (label.trim() && template?.fields) {
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      // Check if trying to add second tags field
      if (type === 'tags' && template.fields.some(f => f.type === 'tags')) {
        return; // Prevent adding multiple tags fields
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
        ...(type === 'tags' && { tagConfig: { maxMinorTags } }),
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
    if (newFieldLabel.trim() && template?.fields) {
      const key = newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
      // Check if trying to add second tags field
      if (newFieldType === 'tags' && template.fields.some(f => f.type === 'tags')) {
        return; // Prevent adding multiple tags fields
      }

      const newField: Field = {
        key,
        label: newFieldLabel,
        displayLabel: newFieldLabel,
        type: newFieldType,
        required: newFieldRequired,
        visible: true,
        protected: false,
        adminVisible: true
      };
      const updatedTemplate: Template = {
        ...template,
        fields: [...template.fields, newField]
      };
      onUpdate(updatedTemplate);

      addingNewField = false;
    }
  }

  function cancelNewField(): void {
    addingNewField = false;
  }
  
  function removeField(index: number): void {
    const field = template.fields[index];

    // Don't allow removal of protected fields or mandatory fields (title, coordinates)
    if (field.protected || field.key === 'title' || field.key === 'coordinates') {
      return;
    }

    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.filter((_, i) => i !== index)
    };
    onUpdate(updatedTemplate);
  }

  function toggleRequired(index: number): void {
    const field = template.fields[index];

    // Don't allow changing required state of protected fields or mandatory fields
    if (field.protected || field.key === 'title' || field.key === 'coordinates') {
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
    return field.protected || field.key === 'title' || field.key === 'coordinates';
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
    if (index > 0) {
      const newFields = [...template.fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      const updatedTemplate: Template = { ...template, fields: newFields };
      onUpdate(updatedTemplate);
    }
  }
  
  function moveFieldDown(index: number): void {
    if (index < template.fields.length - 1) {
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

  function getFieldTypeDisplayName(fieldType: Field['type']): string {
    const typeNames: Record<Field['type'], string> = {
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
      'address': 'adres',
      'checkbox': 'tak/nie',
      'tags': 'tagi'
    };
    return typeNames[fieldType] || fieldType;
  }
</script>

<div class="schema-builder">
  <div class="fields-container">
    {#if template?.fields && template.fields.length > 0}
      <div class="fields-list">
        {#each template.fields.filter(f => f.adminVisible) as field, i}
          {@const originalIndex = template.fields.findIndex(f => f.key === field.key)}
          <div class="field-row">
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
              <span class="field-type-label">{getFieldTypeDisplayName(field.type)}</span>
            </div>

            <div class="field-actions">
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

              <button
                onclick={() => removeField(originalIndex)}
                disabled={isFieldMandatory(field)}
                class="icon-button delete-button"
                title={isFieldMandatory(field) ? 'Nie można usunąć obowiązkowego pola' : 'Usuń pole'}
              >
                {@html TrashIcon()}
              </button>

              <button
                onclick={() => moveFieldUp(originalIndex)}
                disabled={originalIndex === 0 || field.protected}
                class="icon-button move-button"
                title="Przenieś w górę"
              >
                {@html ChevronUpIcon()}
              </button>

              <button
                onclick={() => moveFieldDown(originalIndex)}
                disabled={originalIndex === template.fields.length - 1 || field.protected}
                class="icon-button move-button"
                title="Przenieś w dół"
              >
                {@html ChevronDownIcon()}
              </button>
            </div>
          </div>
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
                <option value="text">tekst</option>
                <option value="textarea">długi tekst</option>
                <option value="number">liczba</option>
                <option value="currency">kwota</option>
                <option value="percentage">procent</option>
                <option value="email">email</option>
                <option value="url">adres www</option>
                <option value="date">data</option>
                <option value="select">lista</option>
                <option value="image">obraz</option>
                <option value="youtube">youtube</option>
                <option value="address">adres</option>
                <option value="checkbox">tak/nie</option>
                <option value="tags" disabled={hasTagsField}>tagi {hasTagsField ? '(już istnieje)' : ''}</option>
              </select>
            </div>

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
                ✓
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


  <!-- Tag Manager - only show if there's a tags field -->
  {#if template?.fields?.some(f => f.type === 'tags')}
    <div class="tag-manager-section">
      <TagManager template={template} onUpdate={onUpdate} />
    </div>
  {/if}
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
    overflow: auto;
  }

  .fields-list {
    display: flex;
    flex-direction: column;
  }

  .field-row {
    display: grid;
    grid-template-columns: 2fr 1fr auto;
    align-items: center;
    padding: 8px 0;
    min-height: 40px;
    transition: background-color 0.1s ease;
    gap: 12px;
  }

  .field-row:hover:not(.new-field-row) {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .new-field-row {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .field-name {
    display: flex;
    align-items: center;
    font-size: 16px;
    color: #000;
  }

  .field-type {
    display: flex;
    align-items: center;
    font-size: 16px;
    color: #999;
    text-align: left;
    justify-self: start;
  }

  .field-actions {
    display: flex;
    gap: 4px;
    justify-self: end;
    align-items: center;
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
    border: 1px dashed #ccc;
    background: transparent;
    color: #000;
    cursor: pointer;
    border-radius: 5px;
    font-family: inherit;
    font-size: 16px;
    text-align: center;
    transition: all 0.1s ease;
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-field-bar:hover:not(:disabled) {
    border-color: #007acc;
    color: #007acc;
    background: rgba(0, 122, 204, 0.02);
  }

  .add-field-bar:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }


  .tag-manager-section {
    border-top: 1px solid #e0e0e0;
    padding-top: 16px;
    margin-top: 16px;
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
  }
</style>