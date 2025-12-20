<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
</svelte:head>

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
    if (onFocus && obj.location && obj.location.coordinates) {
      const [lng, lat] = obj.location.coordinates;
      onFocus({lat, lng});
    }
  }
  
  // Format field value for compact list item display
  // NOTE: Returns empty string (not '—') for missing values to save space
  // NOTE: Category/tags excluded as they're rendered separately in this component
  function formatListItemValue(field: any, value: any): string {
    if (field.type === 'category' || field.type === 'tags') {
      return ''; // Category and tags are handled separately
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
  {#if objects.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📍</div>
      <p class="empty-text">Nie utworzono jeszcze pinezek.</p>
      <small class="empty-subtitle">Kliknij na mapę aby dodać pierwszą pinezkę</small>
    </div>
  {:else}
    <div class="pins-grid">
      {#each objects as obj}
        {@const categoryField = template.fields.find(f => f.type === 'category')}
        {@const categoryData = categoryField?.key ? obj.data[categoryField.key] as CategoryFieldData : null}
        {@const majorTag = categoryData?.majorTag ? availableTags.find(t => t.id === categoryData.majorTag || t.name === categoryData.majorTag) : null}
        {@const categoryColor = majorTag?.color || '#E57373'}
        {@const categoryLabel = majorTag?.displayName || majorTag?.name || 'Kategoria'}

        <div class="list-card" class:incomplete={obj.hasIncompleteData}>
          <!-- Main content -->
          <div class="card-main">
            <div class="card-header">
              {#if obj.hasIncompleteData}
                <span class="incomplete-icon" title="Niekompletne dane">⚠️</span>
              {/if}
              <h3 class="card-title">{obj.data.title || 'Bez tytułu'}</h3>
            </div>

            <!-- Location -->
            {#if obj.location && obj.location.coordinates}
              <div class="card-location">
                {obj.location.coordinates[1].toFixed(6)}, {obj.location.coordinates[0].toFixed(6)}
              </div>
            {/if}

            <!-- Data fields as simple text -->
            <div class="card-fields">
              {#each template.fields.filter(f => f.visible && f.key !== 'title' && f.type !== 'category' && f.type !== 'tags' && f.key !== 'location') as field}
                {@const value = field.key ? obj.data[field.key] : undefined}
                {#if value && value !== '' && field.type !== 'gallery'}
                  <div class="field-row">
                    <span class="field-label">{field.displayLabel || field.label}:</span>
                    <span class="field-value">{formatListItemValue(field, value)}</span>
                  </div>
                {/if}
              {/each}
            </div>

            <!-- Minor tags -->
            {#if categoryData?.minorTags && categoryData.minorTags.length > 0}
              <div class="card-tags">
                {#each categoryData.minorTags.slice(0, 3) as minorTagId}
                  {@const minorTag = availableTags.find(t => t.id === minorTagId)}
                  {#if minorTag}
                    <span class="tag" style="background-color: {minorTag.color};">
                      {minorTag.displayName || minorTag.name}
                    </span>
                  {/if}
                {/each}
                {#if categoryData.minorTags.length > 3}
                  <span class="tag-more">+{categoryData.minorTags.length - 3}</span>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Category bar on right -->
          <div class="category-bar" style="background-color: {categoryColor};">
            {categoryLabel}
          </div>

          <!-- Action buttons at bottom right -->
          <div class="card-actions">
            {#if onFocus && obj.location && obj.location.coordinates}
              <button class="action-btn" onclick={() => handlePinClick(obj)} title="Pokaż na mapie" type="button">
                <Icon name="Eye" size={16} />
              </button>
            {:else if onFocus && obj.hasIncompleteData}
              <button class="action-btn incomplete-marker" disabled title="Brak lokalizacji - edytuj aby dodać" type="button">
                <Icon name="MapPin" size={16} />
              </button>
            {/if}
            {#if showActions && onEdit}
              <button class="action-btn edit" onclick={(e) => { e.stopPropagation(); onEdit(obj); }} title="Edytuj" type="button">
                <Icon name="Pen" size={16} />
              </button>
            {/if}
            {#if showActions && onDelete}
              <button class="action-btn delete" onclick={(e) => { e.stopPropagation(); onDelete(obj.id); }} title="Usuń" type="button">
                <Icon name="Trash" size={16} />
              </button>
            {/if}
          </div>
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
    font-family: 'DM Sans', sans-serif;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #666;
    background: #FAFAFA;
    border: 2px solid #000000;
    margin-top: 16px;
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-text {
    margin: 0 0 8px 0;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    color: #000000;
    font-size: 16px;
  }

  .empty-subtitle {
    font-family: 'DM Sans', sans-serif;
    color: #666;
    font-style: italic;
    font-size: 13px;
  }

  .pins-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .pins-grid::-webkit-scrollbar {
    display: none;
  }

  /* List card - simplified structure matching detail panel */
  .list-card {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #000000;
    display: flex;
    transition: all 0.2s ease;
  }

  .list-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .list-card.incomplete {
    border-color: #f59e0b;
    border-width: 2px;
  }

  /* Category bar on right - like detail panel */
  .category-bar {
    width: 22px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    font-family: 'Space Grotesk', sans-serif;
    font-style: italic;
    font-size: 11px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0;
    flex-shrink: 0;
  }

  /* Main content area */
  .card-main {
    flex: 1;
    padding: 12px 14px 44px 8px;
    min-width: 0;
  }

  /* Header with title */
  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 8px;
  }

  .incomplete-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .card-title {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 16px;
    line-height: 1.2;
    color: #000000;
    word-break: break-word;
  }

  /* Location */
  .card-location {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #666;
    margin-bottom: 8px;
  }

  /* Data fields */
  .card-fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .field-row {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }

  .field-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: #666;
    flex-shrink: 0;
  }

  .field-value {
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    color: #000000;
    word-break: break-word;
  }

  .field-value.link {
    color: #2563EB;
    text-decoration: underline;
  }

  .field-value.link:hover {
    text-decoration: none;
  }

  /* Tags */
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .tag {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    color: white;
    white-space: nowrap;
  }

  .tag-more {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px;
    color: #666;
  }

  /* Action buttons - positioned at bottom left */
  .card-actions {
    position: absolute;
    bottom: 8px;
    left: 14px;
    display: flex;
    gap: 6px;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #000000;
    background: #FFFFFF;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    background: #000000;
    color: white;
  }

  .action-btn.edit:hover {
    background: #059669;
    border-color: #059669;
  }

  .action-btn.delete:hover {
    background: #ef4444;
    border-color: #ef4444;
  }

  .action-btn.incomplete-marker {
    background: #FEF3C7;
    border-color: #F59E0B;
    cursor: not-allowed;
    opacity: 0.8;
  }

  .action-btn.incomplete-marker:hover {
    background: #FEF3C7;
    border-color: #F59E0B;
  }
</style>