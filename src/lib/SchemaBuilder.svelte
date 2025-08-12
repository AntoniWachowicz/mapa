<script lang="ts">
  import type { Field, Template } from './types.js';
  
  interface Props {
    template: Template;
    onUpdate: (template: Template) => void;
  }
  
  const { template, onUpdate }: Props = $props();
  
  let label = $state('');
  let type = $state<Field['type']>('text');
  let required = $state(false);
  
  function addField(): void {
    if (label.trim() && template?.fields) {  // ADD template?.fields check
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const newField: Field = { key, label, type, required, visible: true };
      const updatedTemplate: Template = {
        fields: [...template.fields, newField]  // This is safe now
      };
      onUpdate(updatedTemplate);
      
      label = '';
      type = 'text';
      required = false;
    }
  }
  
  function removeField(index: number): void {
    const updatedTemplate: Template = {
      fields: template.fields.filter((_, i) => i !== index)
    };
    onUpdate(updatedTemplate);
  }
  
  function toggleVisibility(index: number): void {
    const updatedTemplate: Template = {
      fields: template.fields.map((field, i) => 
        i === index ? { ...field, visible: !field.visible } : field
      )
    };
    onUpdate(updatedTemplate);
  }
  
  function moveFieldUp(index: number): void {
    if (index > 0) {
      const newFields = [...template.fields];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      const updatedTemplate: Template = { fields: newFields };
      onUpdate(updatedTemplate);
    }
  }
  
  function moveFieldDown(index: number): void {
    if (index < template.fields.length - 1) {
      const newFields = [...template.fields];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      const updatedTemplate: Template = { fields: newFields };
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
</script>

<div>
  <h3>Schema Builder</h3>
  
  <div>
    <input value={label} oninput={handleLabelInput} placeholder="Field name">
    <select value={type} onchange={handleTypeChange}>
      <option value="text">Text</option>
      <option value="number">Number</option>
      <option value="checkbox">Checkbox</option>
    </select>
    <label>
      <input type="checkbox" checked={required} onchange={handleRequiredChange}> Required
    </label>
    <button onclick={addField}>Add Field</button>
  </div>
  
  <div>
    <h4>Fields:</h4>
    {#each (template?.fields ?? []) as field, i}
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px; padding: 8px; border: 1px solid #eee;">
        <div style="flex: 1;">
          <strong>{field.label}</strong> ({field.type}) 
          {field.required ? '*' : ''}
        </div>
        
        <div style="display: flex; gap: 5px;">
          <!-- Move Up/Down buttons -->
          <button 
            onclick={() => moveFieldUp(i)}
            disabled={i === 0}
            style="padding: 2px 6px; font-size: 12px;"
            title="Move Up"
          >
            ↑
          </button>
          
          <button 
            onclick={() => moveFieldDown(i)}
            disabled={i === template.fields.length - 1}
            style="padding: 2px 6px; font-size: 12px;"
            title="Move Down"
          >
            ↓
          </button>
          
          <!-- Visibility toggle -->
          <button 
            onclick={() => toggleVisibility(i)}
            style="padding: 2px 6px; font-size: 12px;"
            title={field.visible ? 'Hide Field' : 'Show Field'}
          >
            {field.visible ? '👁️' : '🚫'}
          </button>
          
          <!-- Remove button -->
          <button 
            onclick={() => removeField(i)}
            style="padding: 2px 6px; font-size: 12px; background-color: #ff6b6b; color: white; border: none;"
            title="Remove Field"
          >
            🗑️
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>