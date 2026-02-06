<script lang="ts">
  import type { Tag, Template } from './types.js';
  
  interface Props {
    template: Template;
    onUpdate: (template: Template) => void;
  }
  
  const { template, onUpdate }: Props = $props();
  
  let showAddForm = $state(false);
  let newTagName = $state('');
  let newTagDisplayName = $state('');
  let newTagColor = $state('#3b82f6');
  let showArchived = $state(false);
  let editingTag = $state<Tag | null>(null);
  let deleteWarning = $state<{ tag: Tag; affectedPins: string[] } | null>(null);
  
  const visibleTags = $derived((template.tags || []).filter(t => t.visible).sort((a, b) => a.order - b.order));
  const archivedTags = $derived((template.tags || []).filter(t => !t.visible));
  
  function addTag(): void {
    if (!newTagName.trim() || !newTagDisplayName.trim()) return;
    
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      displayName: newTagDisplayName.trim(),
      color: newTagColor,
      order: visibleTags.length,
      visible: true
    };
    
    const updatedTemplate: Template = {
      ...template,
      tags: [...(template.tags || []), newTag]
    };
    
    onUpdate(updatedTemplate);
    
    // Reset form
    newTagName = '';
    newTagDisplayName = '';
    newTagColor = '#3b82f6';
    showAddForm = false;
  }
  
  function updateTag(tagId: string, updates: Partial<Tag>): void {
    const updatedTemplate: Template = {
      ...template,
      tags: (template.tags || []).map(tag => 
        tag.id === tagId ? { ...tag, ...updates } : tag
      )
    };
    onUpdate(updatedTemplate);
  }
  
  function archiveTag(tag: Tag): void {
    // TODO: Check if tag is in use as major tag
    // For now, just archive it
    updateTag(tag.id, { visible: false });
  }
  
  function restoreTag(tagId: string): void {
    updateTag(tagId, { visible: true });
  }
  
  function moveTagUp(index: number): void {
    if (index === 0) return;
    
    const reorderedTags = [...visibleTags];
    [reorderedTags[index - 1], reorderedTags[index]] = [reorderedTags[index], reorderedTags[index - 1]];
    
    // Update order values
    const updatedTags = reorderedTags.map((tag, i) => ({ ...tag, order: i }));
    
    const updatedTemplate: Template = {
      ...template,
      tags: [
        ...updatedTags,
        ...archivedTags
      ]
    };
    
    onUpdate(updatedTemplate);
  }
  
  function moveTagDown(index: number): void {
    if (index === visibleTags.length - 1) return;
    
    const reorderedTags = [...visibleTags];
    [reorderedTags[index], reorderedTags[index + 1]] = [reorderedTags[index + 1], reorderedTags[index]];
    
    // Update order values
    const updatedTags = reorderedTags.map((tag, i) => ({ ...tag, order: i }));
    
    const updatedTemplate: Template = {
      ...template,
      tags: [
        ...updatedTags,
        ...archivedTags
      ]
    };
    
    onUpdate(updatedTemplate);
  }
  
  function startEdit(tag: Tag): void {
    editingTag = { ...tag };
  }
  
  function saveEdit(): void {
    if (!editingTag) return;
    updateTag(editingTag.id, editingTag);
    editingTag = null;
  }
  
  function cancelEdit(): void {
    editingTag = null;
  }
</script>

<div class="tag-manager">
  
  <div class="tags-list">
    {#if visibleTags.length > 0}
      {#each visibleTags as tag, i}
        <div class="tag-item">
          {#if editingTag && editingTag.id === tag.id}
            <!-- Edit mode -->
            <div class="tag-edit-form">
              <div class="tag-preview" style="background-color: {editingTag.color}"></div>
              <div class="edit-inputs">
                <input 
                  bind:value={editingTag.name}
                  class="tag-edit-input"
                  placeholder="Nazwa (EN)"
                >
                <input 
                  bind:value={editingTag.displayName}
                  class="tag-edit-input"
                  placeholder="Nazwa (PL)"
                >
                <input 
                  type="color" 
                  bind:value={editingTag.color}
                  class="color-input small"
                >
              </div>
              <div class="edit-actions">
                <button onclick={saveEdit} class="save-button small">
                  <img src="/icons/Checkmark.svg" alt="Save" style="width: 14px; height: 14px;" />
                </button>
                <button onclick={cancelEdit} class="cancel-button small">
                  <img src="/icons/Close.svg" alt="Cancel" style="width: 14px; height: 14px;" />
                </button>
              </div>
            </div>
          {:else}
            <!-- Display mode -->
            <div class="tag-info">
              <div class="tag-preview" style="background-color: {tag.color}"></div>
              <div class="tag-names">
                <span class="tag-display-name">{tag.displayName}</span>
                <span class="tag-db-name">({tag.name})</span>
              </div>
            </div>

            <div class="tag-actions">
              <button
                onclick={() => startEdit(tag)}
                class="icon-button"
                title="Edytuj kategorię"
              >
                <img src="/icons/Pen.svg" alt="Edit" style="width: 14px; height: 14px;" />
              </button>

              <button
                onclick={() => archiveTag(tag)}
                class="icon-button"
                title="Usuń kategorię"
              >
                <img src="/icons/Trash.svg" alt="Delete" style="width: 14px; height: 14px;" />
              </button>

              <button
                onclick={() => moveTagUp(i)}
                disabled={i === 0}
                class="icon-button"
                title="Przenieś w górę"
              >
                <img src="/icons/Chevron/Up.svg" alt="Up" style="width: 14px; height: 14px;" />
              </button>

              <button
                onclick={() => moveTagDown(i)}
                disabled={i === visibleTags.length - 1}
                class="icon-button"
                title="Przenieś w dół"
              >
                <img src="/icons/Chevron/Down.svg" alt="Down" style="width: 14px; height: 14px;" />
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Add category button at the bottom -->
  {#if !showAddForm}
    <button
      onclick={() => showAddForm = true}
      class="add-category-btn"
    >
      <img src="/icons/Circle/Add.svg" alt="Add" style="width: 18px; height: 18px; margin-right: 4px;" />
      Dodaj Kategorię
    </button>
  {:else}
    <div class="add-tag-form">
      <div class="form-row">
        <div class="form-group">
          <label>
            <span class="label-text">Nazwa (EN):</span>
            <input
              bind:value={newTagName}
              placeholder="np. social_infrastructure"
              class="tag-input"
            >
          </label>
        </div>
        <div class="form-group">
          <label>
            <span class="label-text">Nazwa (PL):</span>
            <input
              bind:value={newTagDisplayName}
              placeholder="np. Infrastruktura społeczna"
              class="tag-input"
            >
          </label>
        </div>
        <div class="form-group">
          <label>
            <span class="label-text">Kolor:</span>
            <input
              type="color"
              bind:value={newTagColor}
              class="color-input"
            >
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button onclick={addTag} class="save-button">
          <img src="/icons/Checkmark.svg" alt="Save" style="width: 16px; height: 16px; margin-right: 6px;" />
          Zapisz
        </button>
        <button onclick={() => showAddForm = false} class="cancel-button">
          <img src="/icons/Close.svg" alt="Cancel" style="width: 16px; height: 16px; margin-right: 6px;" />
          Anuluj
        </button>
      </div>
    </div>
  {/if}

  {#if archivedTags.length > 0}
    <div class="archived-section">
      <button
        onclick={() => showArchived = !showArchived}
        class="archived-toggle"
      >
        {showArchived ? '▼' : '▶'} Zarchiwizowane kategorie ({archivedTags.length})
      </button>

      {#if showArchived}
        <div class="archived-tags">
          {#each archivedTags as tag}
            <div class="archived-tag-item">
              <div class="tag-info">
                <div class="tag-preview archived" style="background-color: {tag.color}"></div>
                <div class="tag-names">
                  <span class="tag-display-name">{tag.displayName}</span>
                  <span class="tag-db-name">({tag.name})</span>
                </div>
              </div>
              <button
                onclick={() => restoreTag(tag.id)}
                class="restore-button"
                title="Przywróć kategorię"
              >
                🔄 Przywróć
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tag-manager {
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
  }
  
  .add-category-btn {
    width: 100%;
    padding: 2px 0;
    background: transparent;
    color: #666;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'Space Mono', monospace;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-top: 0;
  }

  .add-category-btn:hover {
    background: rgba(0, 0, 0, 0.02);
    color: #000;
  }
  
  .add-tag-form {
    background: transparent;
    padding: 0;
    border-radius: 0;
    border: none;
    margin-bottom: 20px;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 16px;
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
  }

  .tag-input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    font-size: 12px;
    background: white;
  }

  .tag-input:focus {
    outline: none;
    border-color: #000;
  }

  .color-input {
    width: 60px;
    height: 38px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    cursor: pointer;
  }
  
  .color-input.small {
    width: 40px;
    height: 30px;
  }
  
  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .save-button {
    padding: 4px 8px;
    background: #000000;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'Space Mono', monospace;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
  }

  .save-button:hover {
    background: #1a1a1a;
  }

  .save-button.small {
    padding: 3px 6px;
    font-size: 11px;
  }

  .cancel-button {
    padding: 4px 8px;
    background: transparent;
    color: #666;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    font-size: 12px;
    font-family: 'Space Mono', monospace;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
  }

  .cancel-button:hover {
    background: rgba(0, 0, 0, 0.02);
    border-color: #000;
  }

  .cancel-button.small {
    padding: 3px 6px;
    font-size: 11px;
  }
  
  .tag-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0;
    margin-bottom: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    transition: all 0.2s ease;
  }

  .tag-item:hover {
    background: rgba(0, 0, 0, 0.02);
  }
  
  .tag-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  
  .tag-preview {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .tag-preview.archived {
    opacity: 0.5;
  }

  .tag-names {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 4px;
  }

  .tag-display-name {
    font-weight: 500;
    color: #1f2937;
    font-size: 12px;
  }

  .tag-db-name {
    font-size: 11px;
    color: #6b7280;
  }

  .tag-actions {
    display: flex;
    gap: 2px;
  }

  .icon-button {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
  }

  .icon-button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
  }

  .icon-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .tag-edit-form {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  
  .edit-inputs {
    display: flex;
    gap: 8px;
    flex: 1;
  }
  
  .tag-edit-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    font-size: 13px;
    background: white;
  }

  .tag-edit-input:focus {
    outline: none;
    border-color: #000;
  }
  
  .edit-actions {
    display: flex;
    gap: 4px;
  }
  
  .archived-section {
    margin-top: 32px;
    padding-top: 0;
  }
  
  .archived-toggle {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 12px;
    padding: 6px 0;
  }

  .archived-toggle:hover {
    color: #374151;
  }

  .archived-tags {
    margin-top: 8px;
  }

  .archived-tag-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    margin-bottom: 2px;
    background: transparent;
    border: none;
    border-radius: 0;
  }

  .restore-button {
    padding: 4px 8px;
    background: #000000;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .restore-button:hover {
    background: #1a1a1a;
  }
  
  .no-tags {
    padding: 24px 0;
    text-align: center;
    color: #999;
    font-style: italic;
    background: transparent;
    border: none;
    border-radius: 0;
  }
</style>