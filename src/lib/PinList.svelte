<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
</svelte:head>

<script lang="ts">
  import type { SavedObject, Template, CategoryFieldData, TagsFieldData, Tag, SelectionConfig, SelectionFieldData, AddressData, PriceData, LinkData, FileData, GalleryData, MultiDateData } from './types.js';
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
  function formatListItemValue(field: any, value: any): string {
    if (!value && value !== 0) return '';

    const fieldType = field.fieldType || field.type;

    switch (fieldType) {
      case 'category':
      case 'tags':
        return ''; // Handled separately

      case 'address':
        if (typeof value === 'object') {
          const a = value as AddressData;
          const parts = [];
          if (a.street) parts.push(a.street + (a.number ? ' ' + a.number : ''));
          if (a.postalCode || a.city) parts.push([a.postalCode, a.city].filter(Boolean).join(' '));
          if (a.gmina) parts.push('gm. ' + a.gmina);
          return parts.join(', ');
        }
        return '';

      case 'price':
        if (typeof value === 'object' && 'currency' in value) {
          const p = value as PriceData;
          if (p.total) return `${Number(p.total).toLocaleString('pl-PL')} ${p.currency || 'PLN'}`;
          if (p.funding?.length) {
            const total = p.funding.reduce((sum, f) => sum + (f.amount || 0), 0);
            return `${total.toLocaleString('pl-PL')} ${p.currency || 'PLN'}`;
          }
        }
        return '';

      case 'links':
        if (Array.isArray(value)) return (value as LinkData[]).map(l => l.text || l.url).join(', ');
        return '';

      case 'files':
        if (Array.isArray(value)) return (value as FileData[]).map(f => f.originalName || f.filename).join(', ');
        return '';

      case 'gallery':
        if (typeof value === 'object' && 'items' in value) {
          const g = value as GalleryData;
          if (g.items?.length) return `${g.items.length} ${g.items.length === 1 ? 'element' : 'elementy'}`;
        }
        return '';

      case 'multidate':
        if (typeof value === 'object') {
          const dates = Object.values(value as MultiDateData)
            .filter((d): d is Date => d !== null)
            .map(d => { try { return new Date(d).toLocaleDateString('pl-PL'); } catch { return ''; } })
            .filter(Boolean);
          return dates.join(', ');
        }
        return '';

      case 'selection':
        if (typeof value === 'object') {
          const s = value as SelectionFieldData;
          const config = field.config as SelectionConfig | undefined;
          const options = config?.options || [];
          const ids: string[] = [];
          if (s.selected) ids.push(s.selected);
          else if (s.primary) { ids.push(s.primary); if (s.secondary) ids.push(...s.secondary); }
          else if (s.selections) ids.push(...s.selections);
          return ids.map(id => { const opt = options.find(o => o.id === id); return opt ? opt.value : id; }).join(', ');
        }
        return '';

      case 'richtext':
        if (typeof value === 'string') {
          const stripped = value.replace(/<[^>]*>/g, '');
          return stripped.length > 100 ? stripped.substring(0, 100) + '...' : stripped;
        }
        return '';

      case 'date':
        try { return new Date(value).toLocaleDateString('pl-PL'); } catch { return String(value); }

      case 'currency':
        return `${Number(value).toLocaleString('pl-PL')} zł`;

      default:
        if (typeof value === 'object') return '';
        return String(value);
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

  // Get category info from either legacy category field or selection field with isCategory
  function getCategoryInfo(obj: SavedObject): { color: string; label: string; secondaryItems: { color: string; label: string }[] } {
    // Find category field: legacy 'category' or selection with isCategory
    const categoryField = template.fields.find(f =>
      f.fieldType === 'category' ||
      f.type === 'category' ||
      (f.fieldType === 'selection' && (f.config as SelectionConfig | undefined)?.isCategory)
    );

    if (!categoryField) {
      return { color: '#E57373', label: 'Kategoria', secondaryItems: [] };
    }

    const fieldKey = categoryField.key || categoryField.fieldName;
    const fieldData = obj.data[fieldKey];

    // Legacy category field - uses template.tags
    if (categoryField.fieldType === 'category' || categoryField.type === 'category') {
      const catData = fieldData as CategoryFieldData | undefined;
      if (!catData?.majorTag) {
        return { color: '#E57373', label: 'Kategoria', secondaryItems: [] };
      }

      const majorTag = availableTags.find(t => t.id === catData.majorTag || t.name === catData.majorTag);
      const secondaryItems = (catData.minorTags || [])
        .map(tagId => availableTags.find(t => t.id === tagId || t.name === tagId))
        .filter((t): t is Tag => t !== undefined)
        .map(t => ({ color: t.color, label: t.displayName || t.name }));

      return {
        color: majorTag?.color || '#E57373',
        label: majorTag?.displayName || majorTag?.name || 'Kategoria',
        secondaryItems
      };
    }

    // Selection field with isCategory - uses field.config.options
    if (categoryField.fieldType === 'selection') {
      const config = categoryField.config as SelectionConfig | undefined;
      const options = config?.options || [];
      const mode = config?.mode || 'single';
      const selData = fieldData as SelectionFieldData | undefined;

      if (!selData) {
        return { color: '#E57373', label: 'Kategoria', secondaryItems: [] };
      }

      let primaryId: string | null = null;
      let secondaryIds: string[] = [];

      if (mode === 'single' && selData.selected) {
        primaryId = selData.selected;
      } else if (mode === 'hierarchical') {
        primaryId = selData.primary || null;
        secondaryIds = selData.secondary || [];
      } else if (mode === 'multi' && selData.selections && selData.selections.length > 0) {
        primaryId = selData.selections[0];
        secondaryIds = selData.selections.slice(1);
      }

      const primaryOption = primaryId ? options.find(o => o.id === primaryId) : null;
      const secondaryItems = secondaryIds
        .map(id => options.find(o => o.id === id))
        .filter((o): o is typeof options[0] => o !== undefined)
        .map(o => ({ color: o.color || '#6b7280', label: o.value }));

      return {
        color: primaryOption?.color || '#E57373',
        label: primaryOption?.value || 'Kategoria',
        secondaryItems
      };
    }

    return { color: '#E57373', label: 'Kategoria', secondaryItems: [] };
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
        {@const catInfo = getCategoryInfo(obj)}
        {@const categoryColor = catInfo.color}
        {@const categoryLabel = catInfo.label}

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
              {#each template.fields.filter(f => f.visible && f.key !== 'title' && f.type !== 'category' && f.fieldType !== 'category' && f.type !== 'tags' && f.fieldType !== 'tags' && f.key !== 'location' && !((f.fieldType === 'selection' || f.type === 'selection') && (f.config as SelectionConfig | undefined)?.isCategory)) as field}
                {@const value = field.key ? obj.data[field.key] : undefined}
                {#if value && value !== '' && field.type !== 'gallery'}
                  <div class="field-row">
                    <span class="field-label">{field.displayLabel || field.label}:</span>
                    <span class="field-value">{formatListItemValue(field, value)}</span>
                  </div>
                {/if}
              {/each}
            </div>

            <!-- Secondary tags/selections -->
            {#if catInfo.secondaryItems.length > 0}
              <div class="card-tags">
                {#each catInfo.secondaryItems.slice(0, 3) as item}
                  <span class="tag" style="background-color: {item.color};">
                    {item.label}
                  </span>
                {/each}
                {#if catInfo.secondaryItems.length > 3}
                  <span class="tag-more">+{catInfo.secondaryItems.length - 3}</span>
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