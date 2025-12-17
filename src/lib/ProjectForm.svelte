<script lang="ts">
  import type { Template, ProjectData, Field } from './types.js';
  
  interface Props {
    template: Template;
    onSave: (data: ProjectData) => void;
    selectedCoordinates: {lat: number, lng: number} | null;
  }
  
  const { template, onSave, selectedCoordinates }: Props = $props();
  
  let formData = $state<ProjectData>({});
  
  // Initialize form data when template changes
  $effect(() => {
    if (selectedCoordinates) {
      const coordField = template.fields.find(f => f.key === 'coordinates');
      if (coordField) {
        // Force update the formData
        formData = {
          ...formData,
          [coordField.key]: `${selectedCoordinates.lat.toFixed(6)}, ${selectedCoordinates.lng.toFixed(6)}`
        };
      }
    }
  });
  
  // Get visible fields
  const visibleFields = $derived(template.fields.filter((f) => f.visible));
  
  function saveObject(): void {
    // Simple validation: only check visible, required fields that have values
    const emptyRequiredFields = [];
    
    for (const field of template.fields) {
      if (field.required && field.visible) {
        const value = formData[field.key];
        
        // Check if field is actually empty
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          emptyRequiredFields.push(field.label);
        }
      }
    }
    
    // Show error only if there are actually empty required fields
    if (emptyRequiredFields.length > 0) {
      alert(`Please fill in: ${emptyRequiredFields.join(', ')}`);
      return;
    }
    
    // Save if validation passes
    onSave(formData);
    
    // Reset form after successful save
    const resetData: ProjectData = {};
    template.fields.forEach((field) => {
      resetData[field.key] = '';
    });
    formData = resetData;
  }
  
  function handleTextInput(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      formData[key] = target.value;
    }
  }
  
  function handleNumberInput(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      formData[key] = Number(target.value);
    }
  }
  
  function handleCheckboxChange(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      formData[key] = target.checked;
    }
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
</script>

<div>
  <h3>Create Object</h3>
  
  {#if visibleFields.length === 0}
    <p>No visible fields. Add fields to the schema first.</p>
  {:else}
    {#each visibleFields as field}
      <div>
        <label>
          {field.label} {field.required ? '*' : ''}

          <!-- Modern field types only - legacy types removed -->
          <input
            value={getFieldValue(field.key)}
            oninput={(e) => handleTextInput(field.key, e)}
            required={field.required}
          >
        </label>
      </div>
    {/each}
    
    <button onclick={saveObject}>Save Object</button>
  {/if}
</div>