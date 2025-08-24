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
  <div class="tag-manager-header">
    <h4>Zarządzanie Tagami</h4>
    <button 
      onclick={() => showAddForm = !showAddForm}
      class="add-tag-button"
      class:active={showAddForm}
    >
      {showAddForm ? '✕ Anuluj' : '+ Dodaj Tag'}
    </button>
  </div>
  
  {#if showAddForm}
    <div class="add-tag-form">
      <div class="form-row">
        <div class="form-group">
          <label>Nazwa (EN):</label>
          <input 
            bind:value={newTagName}
            placeholder="np. education"
            class="tag-input"
          >
        </div>
        <div class="form-group">
          <label>Nazwa (PL):</label>
          <input 
            bind:value={newTagDisplayName}
            placeholder="np. Edukacja"
            class="tag-input"
          >
        </div>
        <div class="form-group">
          <label>Kolor:</label>
          <input 
            type="color" 
            bind:value={newTagColor}
            class="color-input"
          >
        </div>
      </div>
      <div class="form-actions">
        <button onclick={addTag} class="save-button">Dodaj Tag</button>
        <button onclick={() => showAddForm = false} class="cancel-button">Anuluj</button>
      </div>
    </div>
  {/if}
  
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
                <button onclick={saveEdit} class="save-button small">✓</button>
                <button onclick={cancelEdit} class="cancel-button small">✕</button>
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
                onclick={() => moveTagUp(i)}
                disabled={i === 0}
                class="action-button"
                title="Przenieś w górę"
              >
                ↑
              </button>
              
              <button 
                onclick={() => moveTagDown(i)}
                disabled={i === visibleTags.length - 1}
                class="action-button"
                title="Przenieś w dół"
              >
                ↓
              </button>
              
              <button 
                onclick={() => startEdit(tag)}
                class="action-button edit-button"
                title="Edytuj tag"
              >
                ✏️
              </button>
              
              <button 
                onclick={() => archiveTag(tag)}
                class="action-button archive-button"
                title="Archiwizuj tag"
              >
                📦
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="no-tags">
        Brak tagów. Dodaj pierwszy tag powyżej.
      </div>
    {/if}
  </div>
  
  {#if archivedTags.length > 0}
    <div class="archived-section">
      <button 
        onclick={() => showArchived = !showArchived}
        class="archived-toggle"
      >
        {showArchived ? '▼' : '▶'} Zarchiwizowane tagi ({archivedTags.length})
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
                title="Przywróć tag"
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
    margin-top: 24px;
    padding: 24px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
  }
  
  .tag-manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .tag-manager-header h4 {
    color: #1f2937;
    margin: 0;
    font-size: 16px;
  }
  
  .add-tag-button {
    padding: 8px 16px;
    background: #1f2937;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .add-tag-button:hover {
    background: #111827;
    transform: translateY(-1px);
  }
  
  .add-tag-button.active {
    background: #dc2626;
  }
  
  .add-tag-form {
    background: white;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    margin-bottom: 16px;
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
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }
  
  .tag-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
  }
  
  .tag-input:focus {
    outline: none;
    border-color: #6b7280;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
  }
  
  .color-input {
    width: 60px;
    height: 38px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
  }
  
  .color-input.small {
    width: 40px;
    height: 30px;
  }
  
  .form-actions {
    display: flex;
    gap: 12px;
  }
  
  .save-button {
    padding: 8px 16px;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .save-button:hover {
    background: #047857;
  }
  
  .save-button.small {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .cancel-button {
    padding: 8px 16px;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .cancel-button:hover {
    background: #4b5563;
  }
  
  .cancel-button.small {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .tag-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 8px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .tag-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .tag-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  
  .tag-preview {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .tag-preview.archived {
    opacity: 0.5;
  }
  
  .tag-names {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .tag-display-name {
    font-weight: 500;
    color: #1f2937;
    font-size: 14px;
  }
  
  .tag-db-name {
    font-size: 12px;
    color: #6b7280;
  }
  
  .tag-actions {
    display: flex;
    gap: 4px;
  }
  
  .action-button {
    width: 32px;
    height: 32px;
    border: 1px solid #d1d5db;
    background: white;
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
  
  .edit-button {
    background: #dbeafe;
    border-color: #bfdbfe;
    color: #1d4ed8;
  }
  
  .archive-button {
    background: #fef3c7;
    border-color: #fed7aa;
    color: #d97706;
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
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
  }
  
  .edit-actions {
    display: flex;
    gap: 4px;
  }
  
  .archived-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
  }
  
  .archived-toggle {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 14px;
    padding: 8px 0;
  }
  
  .archived-toggle:hover {
    color: #374151;
  }
  
  .archived-tags {
    margin-top: 12px;
  }
  
  .archived-tag-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: #f3f4f6;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
  }
  
  .restore-button {
    padding: 6px 12px;
    background: #059669;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .restore-button:hover {
    background: #047857;
  }
  
  .no-tags {
    padding: 32px;
    text-align: center;
    color: #6b7280;
    font-style: italic;
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
  }
</style>