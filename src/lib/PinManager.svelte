<script lang="ts">
  import type { Template, ProjectData, SavedObject } from './types.js';
  
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
        newFormData[field.key] = field.type === 'checkbox' ? false : '';
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
  
  const visibleFields = $derived(template?.fields?.filter((f) => f.visible) ?? []);
  
  async function saveObject(): Promise<void> {
    // Simple validation
    const emptyRequiredFields: any[] = [];
    
    for (const field of template.fields) {
      if (!template?.fields) return;
      
      const emptyRequiredFields = [];
      
      for (const field of template.fields) {
      if (field.required && field.visible) {
        const value = formData[field.key];
        
        if (field.type === 'checkbox') {
          continue;
        } else if (field.type === 'text') {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            emptyRequiredFields.push(field.label);
          }
        } else if (field.type === 'number') {
          if (!value || value === '') {
            emptyRequiredFields.push(field.label);
          }
        }
      }
    }
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


    if (emptyRequiredFields.length > 0) {
      alert(`Please fill in: ${emptyRequiredFields.join(', ')}`);
      return;
    }
    
    await onSave(formData);
    
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
    return value || '';
  }
  
  function getCheckboxValue(key: string): boolean {
    const value = formData[key];
    return typeof value === 'boolean' ? value : false;
  }

  function editPin(obj: SavedObject): void {
    editingObject = obj;
    formData = { ...obj.data };
  }

  function cancelEdit(): void {
    editingObject = null;
    const resetData: ProjectData = {};
    template.fields.forEach((field) => {
      resetData[field.key] = field.type === 'checkbox' ? false : '';
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
    <h3>{editingObject ? 'Edit Pin' : 'Add New Pin'}</h3>
    
    {#if selectedCoordinates}
      <div class="selected-coords">
        <strong>Selected:</strong> {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
        <button onclick={() => onClearCoordinates && onClearCoordinates()}>Clear</button>
      </div>
    {/if}
    
    {#if visibleFields.length === 0}
      <p>No visible fields. Add fields to the schema first.</p>
    {:else}
      {#each visibleFields as field}
        <div class="form-field">
          <label>
            {field.label} {field.required ? '*' : ''}
            
            {#if field.type === 'text'}
              <input 
                value={getFieldValue(field.key)} 
                oninput={(e) => handleTextInput(field.key, e)}
                required={field.required}
              >
            {:else if field.type === 'number'}
              <input 
                type="number" 
                value={getFieldValue(field.key)}
                oninput={(e) => handleNumberInput(field.key, e)}
                required={field.required}
              >
            {:else if field.type === 'checkbox'}
              <input 
                type="checkbox" 
                checked={getCheckboxValue(field.key)}
                onchange={(e) => handleCheckboxChange(field.key, e)}
              >
            {/if}
          </label>
        </div>
      {/each}
      
      <button onclick={saveObject}>
        {editingObject ? 'Update Pin' : 'Save Pin'}
      </button>

      {#if editingObject}
        <button onclick={cancelEdit}>Cancel</button>
      {/if}
    {/if}
  </div>
{/if}

<div class="pins-list">
  <h4>All Pins ({objects.length})</h4>
  {#if objects.length === 0}
    <p>No pins created yet.</p>
  {:else}
    {#each objects as obj}
      <div class="pin-item" >
        <div class="pin-content">
          <strong>{obj.data.title || 'Untitled'}</strong>
          {#if obj.data.coordinates}
            <small>{obj.data.coordinates}</small>
          {/if}
        </div>
        <button onclick={() => handlePinClick(obj)}> Focus </button>
        <div class="pin-actions">
          <button onclick={(e) => { e.stopPropagation(); editPin(obj); }}>Edit</button>
          <button onclick={(e) => { e.stopPropagation(); onDelete && onDelete(obj.id); }}>Delete</button>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .form-section {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
  }
  
  .form-field {
    margin-bottom: 15px;
  }
  
  .form-field label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
  }
  
  .form-field input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
  }
  
  .selected-coords {
    background: #e3f2fd;
    padding: 8px;
    margin-bottom: 10px;
    border-radius: 3px;
    font-size: 12px;
  }
  
  .pins-list {
    margin-top: 15px;
  }
  
  .pin-item {
    width: 100%;
    text-align: left;
    padding: 8px;
    border: 1px solid #ddd;
    margin-bottom: 5px;
    border-radius: 3px;
    background: #f9f9f9;
    cursor: pointer;
  }

  .pin-item:hover {
    background: #e9ecef;
  }
  
  .pin-item small {
    display: block;
    color: #666;
    font-size: 11px;
  }
  
  button {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 3px;
    cursor: pointer;
  }
</style>