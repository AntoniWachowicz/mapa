<script lang="ts">
  import type { SavedObject, Template, CategoryFieldData, TagsFieldData, Tag } from './types.js';
  import Icon from './Icon.svelte';
  
  interface Props {
    objects: SavedObject[];
    template: Template;
    onEdit?: (obj: SavedObject) => void;
    onDelete?: (id: string) => void;
    onFocus?: (coordinates: {lat: number, lng: number}) => void;
    showActions?: boolean;
    compact?: boolean;
  }
  
  const { 
    objects, 
    template, 
    onEdit, 
    onDelete, 
    onFocus, 
    showActions = true, 
    compact = false 
  }: Props = $props();
  
  // Get available tags (visible ones)
  const availableTags = $derived((template.tags || []).filter(t => t.visible).sort((a, b) => a.order - b.order));
  
  function handlePinClick(obj: SavedObject): void {
    if (onFocus) {
      const coordField = template.fields.find(f => f.key === 'coordinates');
      if (coordField && obj.data[coordField.key]) {
        const coordString = obj.data[coordField.key] as string;
        const parts = coordString.split(',').map(s => s.trim());
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            onFocus({lat, lng});
          }
        }
      }
    }
  }
  
  function formatFieldValue(field: any, value: any): string {
    if (field.type === 'checkbox') {
      return value ? 'Tak' : 'Nie';
    } else if (field.type === 'category' || field.type === 'tags') {
      return ''; // Category and tags are handled separately
    } else if (field.type === 'currency') {
      return value ? `${Number(value).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł` : '';
    } else if (field.type === 'percentage') {
      return value ? `${value}%` : '';
    } else if (field.type === 'url') {
      return value ? value : '';
    } else if (field.type === 'email') {
      return value ? value : '';
    } else if (field.type === 'date') {
      if (!value) return '';
      try {
        const date = new Date(value);
        return date.toLocaleDateString('pl-PL');
      } catch {
        return value?.toString() || '';
      }
    } else if (field.type === 'number') {
      return value?.toString() || '';
    } else {
      return value?.toString() || '';
    }
  }

  // Helper function to extract YouTube video ID from various URL formats
  function getYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
</script>

<div class="pin-list" class:compact>
  <div class="pin-list-header">
    <h4>Wszystkie Pinezki ({objects.length})</h4>
  </div>
  
  {#if objects.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📍</div>
      <p class="empty-text">Nie utworzono jeszcze pinezek.</p>
      <small class="empty-subtitle">Kliknij na mapę aby dodać pierwszą pinezkę</small>
    </div>
  {:else}
    <div class="pins-grid">
      {#each objects as obj}
        <div class="pin-card" class:incomplete={obj.hasIncompleteData}>
          <div class="pin-header">
            {#if obj.hasIncompleteData}
              <span class="incomplete-badge" title="Pinezka ma niekompletne dane - wymaga uzupełnienia">⚠️</span>
            {/if}
            <h5 class="pin-title">{obj.data.title || 'Bez tytułu'}</h5>
            {#if onFocus}
              <button 
                class="focus-btn" 
                onclick={() => handlePinClick(obj)}
                title="Pokaż na mapie"
              >
<Icon name="Eye" size={14} />
              </button>
            {/if}
          </div>

          <!-- Display category if category field exists -->
          {#each template.fields.filter(f => f.type === 'category') as categoryField}
            {#if obj.data[categoryField.key]}
              {@const categoryData = obj.data[categoryField.key] as CategoryFieldData}
            <div class="pin-tags">
              {#if categoryData.majorTag}
                {@const majorTag = availableTags.find(t => t.id === categoryData.majorTag)}
                {#if majorTag}
                  <span class="pin-tag major" style="background-color: {majorTag.color}">
                    {majorTag.displayName || majorTag.name}
                  </span>
                {/if}
              {/if}

              {#if categoryData.minorTags && categoryData.minorTags.length > 0}
                {#each categoryData.minorTags as minorTagId}
                  {@const minorTag = availableTags.find(t => t.id === minorTagId)}
                  {#if minorTag}
                    <span class="pin-tag minor" style="background-color: {minorTag.color}; opacity: 0.8">
                      {minorTag.displayName || minorTag.name}
                    </span>
                  {/if}
                {/each}
              {/if}
            </div>
            {/if}
          {/each}

          <!-- Display tags if tags field exists (simple list without visual styling) -->
          {#each template.fields.filter(f => f.type === 'tags') as tagsField}
            {#if obj.data[tagsField.key]}
              {@const tagsData = obj.data[tagsField.key] as TagsFieldData}
            <div class="pin-tags simple-tags">
              {#if tagsField.tagConfig?.allowMultiple !== false}
                <!-- Multiple selection mode -->
                {#if tagsData.selectedTags && tagsData.selectedTags.length > 0}
                  {#each tagsData.selectedTags as tagId}
                    {@const tag = availableTags.find(t => t.id === tagId)}
                    {#if tag}
                      <span class="pin-tag simple">
                        {tag.displayName || tag.name}
                      </span>
                    {:else}
                      <span class="pin-tag simple">
                        {tagId}
                      </span>
                    {/if}
                  {/each}
                {/if}
              {:else}
                <!-- Single selection mode -->
                {#if tagsData.selectedTag}
                  {@const tag = availableTags.find(t => t.id === tagsData.selectedTag)}
                  {#if tag}
                    <span class="pin-tag simple">
                      {tag.displayName || tag.name}
                    </span>
                  {:else}
                    <span class="pin-tag simple">
                      {tagsData.selectedTag}
                    </span>
                  {/if}
                {/if}
              {/if}
            </div>
            {/if}
          {/each}
          
          <!-- Display key fields -->
          <div class="pin-details">
            {#each template.fields.filter(f => f.visible && f.key !== 'title' && f.type !== 'category' && f.type !== 'tags') as field}
              {@const value = obj.data[field.key]}
              {#if value && value !== ''}
                <div class="pin-field" class:media-field={field.type === 'image' || field.type === 'youtube'}>
                  <span class="field-label">{field.displayLabel || field.label}:</span>
                  {#if field.type === 'url'}
                    <a href={String(value)} target="_blank" class="field-link">{value}</a>
                  {:else if field.type === 'email'}
                    <a href="mailto:{String(value)}" class="field-link">{value}</a>
                  {:else if field.type === 'image'}
                    <div class="image-display">
                      <img src={String(value)} alt={field.displayLabel || field.label} loading="lazy" />
                    </div>
                  {:else if field.type === 'youtube'}
                    {@const videoId = getYouTubeVideoId(String(value))}
                    {#if videoId}
                      <div class="youtube-display">
                        <iframe
                          src="https://www.youtube.com/embed/{videoId}"
                          title="YouTube video"
                          frameborder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowfullscreen
                        ></iframe>
                      </div>
                    {:else}
                      <a href={String(value)} target="_blank" class="field-link">{value}</a>
                    {/if}
                  {:else}
                    <span class="field-value">{formatFieldValue(field, value)}</span>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
          
          <!-- Actions -->
          {#if showActions && (onEdit || onDelete)}
            <div class="pin-actions">
              {#if onEdit}
                <button 
                  class="action-btn edit-btn" 
                  onclick={(e) => { e.stopPropagation(); onEdit(obj); }}
                  title="Edytuj pinezkę"
                >
<Icon name="Pen" size={14} />
                </button>
              {/if}
              {#if onDelete}
                <button 
                  class="action-btn delete-btn" 
                  onclick={(e) => { e.stopPropagation(); onDelete(obj.id); }}
                  title="Usuń pinezkę"
                >
<Icon name="Trash" size={14} />
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .pin-list {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .pin-list.compact {
    font-size: 14px;
  }
  
  .pin-list-header {
    padding: 16px 0 12px 0;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 16px;
  }
  
  .pin-list-header h4 {
    margin: 0;
    color: #1f2937;
    font-size: 18px;
    font-weight: 600;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #6b7280;
    background: #f9fafb;
    border-radius: 12px;
    border: 2px dashed #d1d5db;
  }
  
  .empty-icon {
    font-size: 32px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  
  .empty-text {
    margin: 0 0 8px 0;
    font-weight: 500;
    color: #374151;
  }
  
  .empty-subtitle {
    color: #9ca3af;
    font-style: italic;
  }
  
  .pins-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    overflow-y: auto;
  }
  
  .pin-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  .pin-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  .pin-card.incomplete {
    background: #fef3c7;
    border-color: #f59e0b;
    position: relative;
  }

  .pin-card.incomplete:hover {
    background: #fde68a;
    border-color: #d97706;
  }
  
  .pin-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .pin-title {
    margin: 0;
    color: #1f2937;
    font-size: 16px;
    font-weight: 600;
    flex: 1;
  }
  
  .focus-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }
  
  .focus-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .pin-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }
  
  .pin-field {
    display: flex;
    align-items: start;
    gap: 8px;
  }

  .pin-field.media-field {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .pin-field.media-field .field-label {
    min-width: auto;
    margin-bottom: 4px;
  }
  
  .field-label {
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
    min-width: 80px;
    flex-shrink: 0;
  }
  
  .field-value {
    color: #374151;
    font-size: 13px;
    flex: 1;
    word-break: break-word;
  }

  .field-link {
    color: #3b82f6;
    font-size: 13px;
    flex: 1;
    word-break: break-word;
    text-decoration: none;
    border-bottom: 1px dotted #3b82f6;
  }

  .field-link:hover {
    color: #2563eb;
    border-bottom-style: solid;
  }

  .image-display {
    border-radius: 8px;
    overflow: hidden;
    max-width: 100%;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .image-display img {
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: cover;
    display: block;
  }

  .youtube-display {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .youtube-display iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  
  .pin-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
    margin-top: 4px;
  }
  
  .pin-tag {
    display: inline-block;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }
  
  .pin-tag.major {
    border: 2px solid rgba(255, 255, 255, 0.3);
  }
  
  .pin-tag.minor {
    font-size: 10px;
    padding: 2px 6px;
  }

  .pin-tag.simple {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    font-size: 10px;
    padding: 2px 6px;
  }

  .simple-tags {
    margin-bottom: 12px;
  }
  
  .pin-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    border-top: 1px solid #f3f4f6;
    padding-top: 12px;
    margin-top: 12px;
  }
  
  .action-btn {
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }
  
  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .edit-btn {
    border-color: #3b82f6;
    color: #3b82f6;
  }
  
  .edit-btn:hover {
    background: #3b82f6;
    color: white;
  }
  
  .delete-btn {
    border-color: #ef4444;
    color: #ef4444;
  }
  
  .delete-btn:hover {
    background: #ef4444;
    color: white;
  }

  .incomplete-badge {
    background: #f59e0b;
    color: white;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 50%;
    margin-right: 8px;
    font-weight: bold;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>