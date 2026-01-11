<script lang="ts">
  import type { CategoryFieldData, Tag, Field } from '$lib/types.js';

  interface Props {
    value: CategoryFieldData;
    availableTags: Tag[];
    field: Field;
    onchange: (newValue: CategoryFieldData) => void;
  }

  const { value, availableTags, field, onchange }: Props = $props();

  const maxMinorTags = $derived(field.tagConfig?.maxMinorTags || 3);

  function handleMajorTagChange(newMajorTag: string | null) {
    onchange({ ...value, majorTag: newMajorTag });
  }

  function handleMinorTagToggle(tagId: string, checked: boolean) {
    let newMinorTags = [...value.minorTags];

    if (checked) {
      if (!newMinorTags.includes(tagId)) {
        newMinorTags.push(tagId);
      }
    } else {
      newMinorTags = newMinorTags.filter(id => id !== tagId);
    }

    onchange({ ...value, minorTags: newMinorTags });
  }
</script>

<div class="tag-field">
  <!-- Major Tag Selection -->
  <div class="sub-field">
    <span class="sub-field-label">Główny tag (wymagany)</span>
    <select
      value={value.majorTag || ''}
      onchange={(e) => {
        const target = e.target as HTMLSelectElement;
        handleMajorTagChange(target.value || null);
      }}
      class="tag-select"
      required={field.required}
    >
      <option value="">Wybierz główny tag...</option>
      {#each availableTags as tag}
        <option value={tag.id}>{tag.displayName || tag.name}</option>
      {/each}
    </select>

    {#if value.majorTag}
      {@const selectedTag = availableTags.find(t => t.id === value.majorTag)}
      {#if selectedTag}
        <div class="tag-preview major" style="background-color: {selectedTag.color}">
          {selectedTag.displayName || selectedTag.name}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Minor Tags Selection -->
  <div class="minor-tags-section">
    <div class="sub-field">
      <span class="sub-field-label">Dodatkowe tagi (max {maxMinorTags})</span>
      <div class="minor-tags-container">
        <div class="minor-tags-grid">
          {#each availableTags as tag}
            {@const isSelected = value.minorTags.includes(tag.id)}
            {@const isMajor = value.majorTag === tag.id}
            {@const canSelect = !isMajor && (isSelected || value.minorTags.length < maxMinorTags)}

            <label class="tag-checkbox" class:disabled={!canSelect}>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={!canSelect}
                onchange={(e) => {
                  const target = e.target as HTMLInputElement;
                  handleMinorTagToggle(tag.id, target.checked);
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
          {value.minorTags.length} / {maxMinorTags} wybranych
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .tag-field {
    margin-top: 8px;
    padding: 12px;
    background: #FAFAFA;
    border: 1px solid #000000;
    border-radius: 0;
  }

  .sub-field {
    margin-bottom: 12px;
  }

  .sub-field:last-child {
    margin-bottom: 0;
  }

  .sub-field-label {
    display: block;
    margin-bottom: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #333;
  }

  .minor-tags-container {
    width: 100%;
  }

  .tag-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #000000;
    border-radius: 0;
    background: #FFFFFF;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .tag-select:focus {
    outline: none;
    border-color: #000000;
    box-shadow: 0 0 0 1px #000000;
  }

  .tag-preview {
    padding: 6px 12px;
    border-radius: 0;
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    display: inline-block;
    margin-top: 6px;
  }

  .tag-preview.major {
    border: 2px solid rgba(0, 0, 0, 0.3);
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
    border-radius: 0;
    line-height: 1;
    font-family: 'DM Sans', sans-serif;
  }

  .minor-tags-section {
    margin-top: 12px;
  }

  .minor-tags-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .tag-checkbox {
    display: flex !important;
    align-items: center;
    cursor: pointer;
    margin: 0 !important;
    padding: 6px;
    border-radius: 0;
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
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    color: #666;
    text-align: right;
  }
</style>
