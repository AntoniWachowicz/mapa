<script lang="ts">
  import type { Field, Template } from './types.js';
  import TagManager from './TagManager.svelte';
  
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
  
  function removeField(index: number): void {
    const field = template.fields[index];
    
    // Don't allow removal of protected fields
    if (field.protected) {
      return;
    }
    
    const updatedTemplate: Template = {
      ...template,
      fields: template.fields.filter((_, i) => i !== index)
    };
    onUpdate(updatedTemplate);
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
  <h3>Kreator Schematu</h3>
  
  <div class="add-field-form">
    <div class="form-group">
      <label for="field-name">Nazwa pola:</label>
      <input 
        id="field-name"
        value={label} 
        oninput={handleLabelInput} 
        placeholder="Wpisz nazwę pola"
        class="field-input"
      >
    </div>
    
    <div class="form-group">
      <label for="field-type">Typ:</label>
      <select id="field-type" value={type} onchange={handleTypeChange} class="field-select">
        <option value="text">Tekst</option>
        <option value="textarea">Długi tekst</option>
        <option value="number">Liczba</option>
        <option value="currency">Kwota pieniężna</option>
        <option value="percentage">Procent</option>
        <option value="email">Email</option>
        <option value="url">Adres www</option>
        <option value="date">Data</option>
        <option value="select">Lista wyboru</option>
        <option value="image">Obraz</option>
        <option value="youtube">Film YouTube</option>
        <option value="address">Adres</option>
        <option value="checkbox">Tak/Nie</option>
        <option value="tags" disabled={hasTagsField}>Tagi {hasTagsField ? '(już istnieje)' : ''}</option>
      </select>
    </div>
    
    {#if type === 'tags'}
      <div class="form-group">
        <label for="max-minor-tags">Maksymalna liczba dodatkowych tagów na pinezkę:</label>
        <input 
          id="max-minor-tags"
          type="number" 
          min="0" 
          max="10" 
          bind:value={maxMinorTags}
          class="field-input"
        >
        <small class="help-text">Każda pinezka musi mieć jeden główny tag i może mieć do {maxMinorTags} dodatkowych tagów.</small>
      </div>
    {/if}
    
    {#if type === 'select'}
      <div class="form-group">
        <label for="select-options">Opcje do wyboru (oddziel przecinkami):</label>
        <input 
          id="select-options"
          value={selectOptions}
          oninput={(e) => selectOptions = (e.target as HTMLInputElement).value}
          placeholder="Opcja 1, Opcja 2, Opcja 3"
          class="field-input"
        >
        <small class="help-text">Np: Planowany, W trakcie, Ukończony, Wstrzymany</small>
      </div>
    {/if}
    
    {#if type === 'address'}
      <div class="form-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            bind:checked={addressSync}
            class="field-checkbox"
          >
          Automatyczna synchronizacja z współrzędnymi
        </label>
        <small class="help-text">
          Gdy włączone: wpisanie adresu automatycznie znajdzie współrzędne na mapie, 
          a kliknięcie na mapę automatycznie wypełni adres.
        </small>
      </div>
    {/if}
    
    <div class="form-group checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" checked={required} onchange={handleRequiredChange}>
        <span>Pole wymagane</span>
      </label>
    </div>
    
    <button onclick={addField} class="add-button">Dodaj Pole</button>
  </div>
  
  <div class="fields-list">
    <h4>Obecne pola:</h4>
    {#if template?.fields && template.fields.length > 0}
      <!-- Visible fields -->
      {#each template.fields.filter(f => f.adminVisible) as field, i}
        {@const originalIndex = template.fields.findIndex(f => f === field)}
        <div class="field-item" class:protected={field.protected}>
          <div class="field-info">
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
              <span class="field-name" onclick={() => startEditingField(originalIndex)} title="Kliknij aby edytować nazwę">
                {field.displayLabel || field.label}
              </span>
            {/if}
            <span class="field-meta">({getFieldTypeDisplayName(field.type)}){field.required ? ' *' : ''}</span>
            {#if field.type === 'tags' && field.tagConfig}
              <span class="field-badge tag-config-badge">Max {field.tagConfig.maxMinorTags} dodatkowych</span>
            {/if}
            {#if field.type === 'select' && field.selectConfig}
              <span class="field-badge select-config-badge">{field.selectConfig.options.length} opcji</span>
            {/if}
            {#if field.protected}
              <span class="field-badge protected-badge">Chronione</span>
            {/if}
            <span class="field-status" class:hidden={!field.visible}>
              {field.visible ? 'Widoczne' : 'Ukryte'}
            </span>
          </div>
          
          <div class="field-actions">
            <button 
              onclick={() => moveFieldUp(originalIndex)}
              disabled={originalIndex === 0 || field.protected}
              class="action-button move-button"
              title="Przenieś w górę"
            >
              ↑
            </button>
            
            <button 
              onclick={() => moveFieldDown(originalIndex)}
              disabled={originalIndex === template.fields.length - 1 || field.protected}
              class="action-button move-button"
              title="Przenieś w dół"
            >
              ↓
            </button>
            
            <button 
              onclick={() => toggleVisibility(originalIndex)}
              class="action-button visibility-button"
              class:hidden={!field.visible}
              title={field.visible ? 'Ukryj pole' : 'Pokaż pole'}
            >
              {field.visible ? '👁️' : '🚫'}
            </button>
            
            <button 
              onclick={() => toggleAdminVisibility(originalIndex)}
              class="action-button admin-visibility-button"
              title="Ukryj z panelu admina"
            >
              💼
            </button>
            
            <button 
              onclick={() => removeField(originalIndex)}
              disabled={field.protected}
              class="action-button remove-button"
              class:disabled={field.protected}
              title={field.protected ? 'Pole chronione - nie można usunąć' : 'Usuń pole'}
            >
              {field.protected ? '🔒' : '🗑️'}
            </button>
          </div>
        </div>
      {/each}
      
      <!-- Hidden fields section -->
      {#if template.fields.some(f => !f.adminVisible)}
        <div class="hidden-fields-section">
          <h5>Ukryte pola (kliknij aby przywrócić):</h5>
          {#each template.fields.filter(f => !f.adminVisible) as field}
            {@const originalIndex = template.fields.findIndex(f => f === field)}
            <button 
              class="hidden-field-item"
              onclick={() => toggleAdminVisibility(originalIndex)}
              title="Kliknij aby przywrócić pole"
            >
              <span class="field-name">{field.displayLabel || field.label}</span>
              <span class="field-meta">({getFieldTypeDisplayName(field.type)})</span>
              {#if field.protected}
                <span class="field-badge protected-badge">Chronione</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="no-fields">Brak pól w schemacie. Dodaj pierwsze pole powyżej.</div>
    {/if}
  </div>
  
  <!-- Tag Manager - only show if there's a tags field -->
  {#if template?.fields?.some(f => f.type === 'tags')}
    <TagManager template={template} onUpdate={onUpdate} />
  {/if}
</div>

<style>
  .schema-builder {
    max-width: 100%;
  }
  
  .add-field-form {
    background: #f9fafb;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    margin-bottom: 32px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #374151;
    font-size: 14px;
  }
  
  .field-input, .field-select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background: #ffffff;
    transition: border-color 0.2s ease;
  }
  
  .field-input:focus, .field-select:focus {
    outline: none;
    border-color: #6b7280;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
  }
  
  .checkbox-group {
    margin: 20px 0;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 400;
  }
  
  .checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
  }
  
  .add-button {
    background: #1f2937;
    color: #ffffff;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .add-button:hover {
    background: #111827;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .fields-list h4 {
    color: #1f2937;
    margin-bottom: 16px;
    font-size: 18px;
  }
  
  .field-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    margin-bottom: 8px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .field-item.protected {
    background: #fef3c7;
    border-color: #f59e0b;
  }
  
  .field-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .field-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .field-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 15px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .field-name:hover {
    background-color: #f3f4f6;
  }

  .field-name-edit {
    font-weight: 600;
    color: #1f2937;
    font-size: 15px;
    background: #ffffff;
    border: 2px solid #3b82f6;
    border-radius: 4px;
    padding: 2px 6px;
    min-width: 120px;
    outline: none;
  }
  
  .field-meta {
    color: #6b7280;
    font-size: 13px;
  }
  
  .field-status {
    padding: 4px 8px;
    background: #d1fae5;
    color: #065f46;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .field-status.hidden {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .field-actions {
    display: flex;
    gap: 4px;
  }
  
  .action-button {
    width: 32px;
    height: 32px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all 0.2s ease;
  }
  
  .action-button:hover:not(:disabled) {
    border-color: #9ca3af;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .action-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .remove-button {
    background: #fee2e2;
    border-color: #fecaca;
    color: #dc2626;
  }
  
  .remove-button:hover:not(:disabled) {
    background: #fca5a5;
    border-color: #f87171;
  }
  
  .visibility-button.hidden {
    background: #fee2e2;
    border-color: #fecaca;
    color: #dc2626;
  }
  
  .field-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }
  
  .protected-badge {
    background: #fbbf24;
    color: #92400e;
  }
  
  .tag-config-badge {
    background: #e0e7ff;
    color: #3730a3;
  }

  .select-config-badge {
    background: #d1fae5;
    color: #047857;
  }
  
  .admin-visibility-button {
    background: #ddd6fe;
    border-color: #c4b5fd;
    color: #6d28d9;
  }
  
  .admin-visibility-button:hover:not(:disabled) {
    background: #c4b5fd;
    border-color: #a78bfa;
  }
  
  .action-button.disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }
  
  .hidden-fields-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 2px dashed #d1d5db;
  }
  
  .hidden-fields-section h5 {
    color: #6b7280;
    margin-bottom: 12px;
    font-size: 14px;
  }
  
  .hidden-field-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: #f9fafb;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .hidden-field-item:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }
  
  .help-text {
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
    display: block;
  }
  
  .no-fields {
    padding: 32px;
    text-align: center;
    color: #6b7280;
    font-style: italic;
    background: #f9fafb;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
  }
</style>