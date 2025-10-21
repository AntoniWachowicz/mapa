<script lang="ts">
  import type { SavedObject, Template, Field } from './types.js';
  
  interface Props {
    objects: SavedObject[];
    template: Template;
    onDelete: (id: string) => void;
  }
  
  const { objects, template, onDelete }: Props = $props();
  
  const visibleFields = $derived(template.fields.filter((f) => f.visible));
</script>

<div>
  <h3>Saved Objects</h3>
  
  {#if objects.length === 0}
    <p>No objects saved yet.</p>
  {:else}
    {#each objects as object}
      <div>
        <div>
          {#each visibleFields as field}
            <strong>{field.label}:</strong>
            {field.key ? (object.data[field.key] || 'N/A') : 'N/A'} |
          {/each}
        </div>
        <button onclick={() => onDelete(object.id)}>Delete</button>
        <hr>
      </div>
    {/each}
  {/if}
</div>