<script lang="ts">
  import type { Template, ProjectData, SavedObject, TagFieldData, Tag } from './types.js';
  import PinList from './PinList.svelte';
  
  interface Props {
    template: Template;
    objects: SavedObject[];
    selectedCoordinates?: {lat: number, lng: number} | null;
    onSave: (data: ProjectData) => Promise<void>;
    onUpdate?: (id: string, data: ProjectData) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    showForm?: boolean;
    onClearCoordinates?: () => void;
    onFocusPin?: (coordinates: {lat: number, lng: number}) => void;
  }
  
  const { template, objects, selectedCoordinates = null, onSave, onDelete, onUpdate, showForm = true, onClearCoordinates, onFocusPin }: Props = $props();
  
  let formData = $state<ProjectData>({});
  let editingObject = $state<SavedObject | null>(null);

  // Initialize form data when template changes
  $effect(() => {
    if (template?.fields) {
      const newFormData: ProjectData = {};
      template.fields.forEach((field) => {
        if (field.type === 'checkbox') {
          newFormData[field.key] = false;
        } else if (field.type === 'tags') {
          newFormData[field.key] = { majorTag: null, minorTags: [] } as TagFieldData;
        } else {
          newFormData[field.key] = '';
        }
      });
      formData = newFormData;
    }
  });
  
  // Auto-fill coordinates when selected
  $effect(() => {
    if (selectedCoordinates && template?.fields) {
      const coordField = template.fields.find(f => f.key === 'coordinates');
      if (coordField) {
        formData = {
          ...formData,
          [coordField.key]: `${selectedCoordinates.lat.toFixed(6)}, ${selectedCoordinates.lng.toFixed(6)}`
        };
      }
    }
  });

  // Clear coordinates from form data
  function clearCoordinates(): void {
    if (onClearCoordinates) {
      onClearCoordinates();
    }
    const coordField = template?.fields?.find(f => f.key === 'coordinates');
    if (coordField) {
      formData = {
        ...formData,
        [coordField.key]: ''
      };
    }
  }
  
  const visibleFields = $derived(template?.fields?.filter((f) => f.visible) ?? []);
  
  async function saveObject(): Promise<void> {
    if (!template?.fields) return;
    
    // Robust validation
    const emptyRequiredFields: string[] = [];
    
    for (const field of template.fields) {
      if (field.required && field.visible) {
        const value = formData[field.key];
        
        if (field.type === 'checkbox') {
          continue; // Checkboxes don't need validation
        } else if (['text', 'textarea', 'email', 'url', 'date', 'select', 'image', 'youtube'].includes(field.type)) {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        } else if (['number', 'currency', 'percentage'].includes(field.type)) {
          if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        } else if (field.type === 'tags') {
          const tagData = value as TagFieldData;
          if (!tagData || !tagData.majorTag) {
            emptyRequiredFields.push(field.displayLabel || field.label);
          }
        }
      }
    }
    
    if (emptyRequiredFields.length > 0) {
      alert(`Proszę wypełnić: ${emptyRequiredFields.join(', ')}`);
      return;
    }
    
    if (editingObject && onUpdate) {
      // Update existing object
      console.log('Updating object:', editingObject.id, formData); // ADD DEBUG
      await onUpdate(editingObject.id, formData);
      editingObject = null;
    } else {
      // Create new object
      console.log('Creating new object:', formData); // ADD DEBUG
      await onSave(formData);
    }
    
    // Reset form
    const resetData: ProjectData = {};
    template.fields.forEach((field) => {
      resetData[field.key] = field.type === 'checkbox' ? false : '';
    });
    formData = resetData;

    
  }
  
  function handleTextInput(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) formData[key] = target.value;
  }
  
  function handleNumberInput(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) formData[key] = Number(target.value);
  }
  
  function handleCheckboxChange(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) formData[key] = target.checked;
  }
  
  function getFieldValue(key: string): string | number {
    const value = formData[key];
    if (typeof value === 'boolean') return '';
    if (typeof value === 'object') return ''; // Handle TagFieldData
    return value || '';
  }
  
  function getCheckboxValue(key: string): boolean {
    const value = formData[key];
    return typeof value === 'boolean' ? value : false;
  }
  
  function getTagValue(key: string): TagFieldData {
    const value = formData[key] as TagFieldData;
    return value || { majorTag: null, minorTags: [] };
  }
  
  function handleTagChange(key: string, tagData: TagFieldData): void {
    formData = {
      ...formData,
      [key]: tagData
    };
  }
  
  // Get available tags (visible ones)
  const availableTags = $derived((template.tags || []).filter(t => t.visible).sort((a, b) => a.order - b.order));

  function editPin(obj: SavedObject): void {
    editingObject = obj;
    formData = { ...obj.data };
  }

  function cancelEdit(): void {
    editingObject = null;
    const resetData: ProjectData = {};
    template.fields.forEach((field) => {
      if (field.type === 'checkbox') {
        resetData[field.key] = false;
      } else if (field.type === 'tags') {
        resetData[field.key] = { majorTag: null, minorTags: [] } as TagFieldData;
      } else {
        resetData[field.key] = '';
      }
    });
    formData = resetData;
  }


  function handlePinClick(obj: SavedObject): void {
  if (onFocusPin) {
    const coordField = template.fields.find(f => f.key === 'coordinates');
    if (coordField && obj.data[coordField.key]) {
      const coordString = obj.data[coordField.key] as string;
      const parts = coordString.split(',').map(s => s.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          onFocusPin({lat, lng});
        }
      }
    }
  }
}
</script>

{#if showForm}
  <div class="form-section">
    <h3>{editingObject ? 'Edytuj Pinezkę' : 'Dodaj Nową Pinezkę'}</h3>
    
    {#if visibleFields.length === 0}
      <p>Brak widocznych pól. Dodaj najpierw pola do schematu.</p>
    {:else}
      {#each visibleFields as field}
        <div class="form-field">
          <label>
            {field.displayLabel || field.label} {field.required ? '*' : ''}
            
            {#if field.type === 'text'}
              {#if field.key === 'coordinates'}
                <div class="input-with-button">
                  <input 
                    value={getFieldValue(field.key)} 
                    oninput={(e) => handleTextInput(field.key, e)}
                    required={field.required}
                    placeholder="Kliknij na mapę aby wybrać lokalizację"
                    readonly
                  >
                  <button 
                    type="button"
                    onclick={clearCoordinates}
                    disabled={!getFieldValue(field.key)}
                    class="clear-coords-btn"
                    title="Wyczyść współrzędne"
                  >
                    ✕
                  </button>
                </div>
              {:else}
                <input 
                  value={getFieldValue(field.key)} 
                  oninput={(e) => handleTextInput(field.key, e)}
                  required={field.required}
                >
              {/if}
            {:else if field.type === 'number'}
              <input 
                type="number" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleNumberInput(field.key, e)}
                required={field.required}
              >
            {:else if field.type === 'currency'}
              <div class="currency-field">
                <input 
                  type="number" 
                  step="0.01"
                  value={getFieldValue(field.key)}
                  oninput={(e) => handleNumberInput(field.key, e)}
                  required={field.required}
                  placeholder="0.00"
                >
                <span class="currency-symbol">zł</span>
              </div>
            {:else if field.type === 'percentage'}
              <div class="percentage-field">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={getFieldValue(field.key)}
                  oninput={(e) => handleNumberInput(field.key, e)}
                  required={field.required}
                  placeholder="0"
                >
                <span class="percentage-symbol">%</span>
              </div>
            {:else if field.type === 'email'}
              <input 
                type="email" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="nazwa@example.com"
              >
            {:else if field.type === 'url'}
              <input 
                type="url" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="https://example.com"
              >
            {:else if field.type === 'date'}
              <input 
                type="date" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
              >
            {:else if field.type === 'textarea'}
              <textarea 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="Wprowadź dłuższy tekst..."
                rows="4"
              ></textarea>
            {:else if field.type === 'select'}
              <select 
                value={getFieldValue(field.key)}
                onchange={(e) => handleTextInput(field.key, e)}
                required={field.required}
              >
                <option value="">Wybierz opcję...</option>
                {#each field.selectConfig?.options || [] as option}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            {:else if field.type === 'image'}
              <input 
                type="url" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="https://example.com/obraz.jpg"
              >
              {#if getFieldValue(field.key)}
                <div class="image-preview">
                  <img src={String(getFieldValue(field.key))} alt="Podgląd" loading="lazy" />
                </div>
              {/if}
            {:else if field.type === 'youtube'}
              <input 
                type="url" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID lub https://youtu.be/VIDEO_ID"
              >
              {#if getFieldValue(field.key)}
                <div class="youtube-preview">
                  <small class="help-text">Film YouTube zostanie wyświetlony na liście pinezek</small>
                </div>
              {/if}
            {:else if field.type === 'checkbox'}
              <input 
                type="checkbox" 
                checked={getCheckboxValue(field.key)}
                onchange={(e) => handleCheckboxChange(field.key, e)}
              >
            {:else if field.type === 'tags'}
              <!-- Tag Selection UI -->
              {@const tagData = getTagValue(field.key)}
              {@const maxMinorTags = field.tagConfig?.maxMinorTags || 3}
              
              <div class="tag-field">
                <!-- Major Tag Selection -->
                <div class="major-tag-section">
                  <label class="tag-section-label">Główny tag (wymagany):</label>
                  <select 
                    value={tagData.majorTag || ''}
                    onchange={(e) => {
                      const target = e.target as HTMLSelectElement;
                      const newTagData = { ...tagData, majorTag: target.value || null };
                      handleTagChange(field.key, newTagData);
                    }}
                    class="tag-select"
                    required={field.required}
                  >
                    <option value="">Wybierz główny tag...</option>
                    {#each availableTags as tag}
                      <option value={tag.id}>{tag.displayName || tag.name}</option>
                    {/each}
                  </select>
                  
                  {#if tagData.majorTag}
                    {@const selectedTag = availableTags.find(t => t.id === tagData.majorTag)}
                    {#if selectedTag}
                      <div class="tag-preview major" style="background-color: {selectedTag.color}">
                        {selectedTag.displayName || selectedTag.name}
                      </div>
                    {/if}
                  {/if}
                </div>
                
                <!-- Minor Tags Selection -->
                <div class="minor-tags-section">
                  <label class="tag-section-label">Dodatkowe tagi (max {maxMinorTags}):</label>
                  <div class="minor-tags-grid">
                    {#each availableTags as tag}
                      {@const isSelected = tagData.minorTags.includes(tag.id)}
                      {@const isMajor = tagData.majorTag === tag.id}
                      {@const canSelect = !isMajor && (isSelected || tagData.minorTags.length < maxMinorTags)}
                      
                      <label class="tag-checkbox" class:disabled={!canSelect}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onchange={(e) => {
                            const target = e.target as HTMLInputElement;
                            let newMinorTags = [...tagData.minorTags];
                            
                            if (target.checked) {
                              if (!newMinorTags.includes(tag.id)) {
                                newMinorTags.push(tag.id);
                              }
                            } else {
                              newMinorTags = newMinorTags.filter(id => id !== tag.id);
                            }
                            
                            const newTagData = { ...tagData, minorTags: newMinorTags };
                            handleTagChange(field.key, newTagData);
                          }}
                        >
                        <div class="tag-preview minor" style="background-color: {tag.color}" class:major={isMajor}>
                          {tag.displayName || tag.name}
                          {#if isMajor}
                            <span class="major-indicator">Główny</span>
                          {/if}
                        </div>
                      </label>
                    {/each}
                  </div>
                  
                  <div class="tag-counter">
                    {tagData.minorTags.length} / {maxMinorTags} wybranych
                  </div>
                </div>
              </div>
            {/if}
          </label>
        </div>
      {/each}
      
      <button onclick={saveObject}>
        {editingObject ? 'Aktualizuj Pinezkę' : 'Zapisz Pinezkę'}
      </button>

      {#if editingObject}
        <button type="button" class="cancel-btn" onclick={cancelEdit}>Anuluj</button>
      {/if}
    {/if}
  </div>
{/if}

<PinList 
  {objects}
  {template}
  onEdit={editPin}
  onDelete={onDelete}
  onFocus={onFocusPin}
  showActions={true}
/>

<style>
  .form-section {
    margin-bottom: 32px;
    padding: 24px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
  }
  
  .form-section h3 {
    margin: 0 0 24px 0;
    color: #1f2937;
    font-size: 20px;
    font-weight: 600;
    padding-bottom: 12px;
    border-bottom: 2px solid #f3f4f6;
  }
  
  .form-field {
    margin-bottom: 20px;
  }
  
  .form-field label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #374151;
    font-size: 14px;
  }
  
  .form-field input, .form-field select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background: #ffffff;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .form-field input:focus, .form-field select:focus {
    outline: none;
    border-color: #6b7280;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
  }

  .form-field input[readonly] {
    background: #f9fafb;
    color: #6b7280;
  }

  .form-field textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background: #ffffff;
    transition: all 0.2s ease;
    box-sizing: border-box;
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
  }

  .form-field textarea:focus {
    outline: none;
    border-color: #6b7280;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
  }

  .currency-field, .percentage-field {
    display: flex;
    align-items: center;
    position: relative;
  }

  .currency-field input, .percentage-field input {
    padding-right: 40px;
  }

  .currency-symbol, .percentage-symbol {
    position: absolute;
    right: 12px;
    color: #6b7280;
    font-weight: 600;
    pointer-events: none;
  }

  .image-preview {
    margin-top: 8px;
    border-radius: 8px;
    overflow: hidden;
    max-width: 300px;
    border: 1px solid #e5e7eb;
  }

  .image-preview img {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: cover;
    display: block;
  }

  .youtube-preview {
    margin-top: 8px;
    padding: 8px 12px;
    background: #f3f4f6;
    border-radius: 6px;
    border: 1px solid #d1d5db;
  }

  .help-text {
    color: #6b7280;
    font-size: 12px;
    font-style: italic;
    margin: 0;
  }

  .input-with-button {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .input-with-button input {
    flex: 1;
  }

  .clear-coords-btn {
    padding: 8px 12px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .clear-coords-btn:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .clear-coords-btn:disabled {
    background: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
  
  
  button:not(.clear-coords-btn):not(.cancel-btn) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  button:not(.clear-coords-btn):not(.cancel-btn):hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.2);
  }

  .cancel-btn {
    background: #6b7280;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s ease;
    margin-left: 12px;
  }

  .cancel-btn:hover {
    background: #4b5563;
    transform: translateY(-1px);
  }
  
  /* Tag field styles */
  .tag-field {
    margin-top: 8px;
    padding: 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }
  
  .major-tag-section {
    margin-bottom: 20px;
  }
  
  .tag-section-label {
    display: block !important;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }
  
  .tag-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .tag-select:focus {
    outline: none;
    border-color: #6b7280;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
  }
  
  .tag-preview {
    padding: 6px 12px;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    display: inline-block;
    margin-top: 4px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  
  .tag-preview.major {
    border: 2px solid rgba(255, 255, 255, 0.8);
  }
  
  .tag-preview.minor {
    font-size: 12px;
    padding: 4px 8px;
    position: relative;
  }
  
  .tag-preview.minor.major {
    opacity: 0.5;
    position: relative;
  }
  
  .major-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #dc2626;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
  }
  
  .minor-tags-section {
    border-top: 1px solid #e5e7eb;
    padding-top: 16px;
  }
  
  .minor-tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .tag-checkbox {
    display: flex !important;
    align-items: center;
    cursor: pointer;
    margin: 0 !important;
    padding: 4px;
    border-radius: 6px;
    transition: background-color 0.2s;
  }
  
  .tag-checkbox:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .tag-checkbox.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .tag-checkbox.disabled:hover {
    background: none;
  }
  
  .tag-checkbox input[type="checkbox"] {
    margin-right: 8px;
    width: auto !important;
  }
  
  .tag-counter {
    font-size: 12px;
    color: #6b7280;
    text-align: right;
  }
  
</style>