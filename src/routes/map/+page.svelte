<script lang="ts">
  import MapComponent from '$lib/MapComponent.svelte';
  import type { Template, SavedObject, MapObject, MapConfig, TagFieldData } from '$lib/types.js';

  interface PageData {
    template: Template;
    objects: SavedObject[];
    mapConfig: MapConfig;
  }

  interface Props {
    data: PageData;
  }

  const { data }: Props = $props();

  let template = $state<Template>(data.template || { fields: [] });
  let objects = $state<SavedObject[]>(data.objects || []);
  let mapConfig = $state<MapConfig>(data.mapConfig);
  let focusCoordinates = $state<{lat: number, lng: number} | null>(null);

  // Filter and sort state
  let filterText = $state('');
  let sortField = $state('');
  let filteredObjects = $state<SavedObject[]>([]);

  // Initialize filtered objects
  $effect(() => {
    filteredObjects = [...objects];
  });

  function handleFilter(): void {
    let filtered = objects;

    // Text filter
    if (filterText.trim()) {
      filtered = filtered.filter(obj => {
        const searchTerm = filterText.toLowerCase();
        return template.fields.some(field => {
          const value = obj.data[field.key];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm);
          }
          return false;
        });
      });
    }

    filteredObjects = filtered;
  }

  function handleSort(): void {
    if (!sortField) return;

    filteredObjects = [...filteredObjects].sort((a, b) => {
      const aValue = a.data[sortField] || '';
      const bValue = b.data[sortField] || '';
      return String(aValue).localeCompare(String(bValue));
    });
  }

  function focusOnPin(obj: SavedObject): void {
    const coordField = template.fields.find(f => f.key === 'coordinates');
    if (coordField && obj.data[coordField.key]) {
      const coordinates = parseCoordinates(obj.data[coordField.key]);
      if (coordinates) {
        focusCoordinates = coordinates;
        setTimeout(() => {
          focusCoordinates = null;
        }, 100);
      }
    }
  }

  function formatFieldValue(field: any, value: any): string {
    if (!value && value !== 0) return '';

    if (field.type === 'currency') {
      return `${Number(value).toLocaleString('pl-PL')} zł`;
    } else if (field.type === 'date') {
      try {
        return new Date(value).toLocaleDateString('pl-PL');
      } catch {
        return String(value);
      }
    } else {
      return String(value);
    }
  }

  // Parse coordinates for map
  function parseCoordinates(coordString: string | number | boolean | TagFieldData): {lat: number, lng: number} | null {
    if (typeof coordString !== 'string') return null;
    const parts = coordString.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  }

  const validMapObjects = $derived(() => {
    const coordField = template?.fields?.find(f => f.key === 'coordinates');
    if (!coordField || !template?.fields) return [];

    const result: MapObject[] = [];
    for (const obj of filteredObjects) {
      const coordinates = parseCoordinates(obj.data[coordField.key]);
      if (coordinates !== null) {
        result.push({ ...obj, coordinates });
      }
    }
    return result;
  });

  // Update filters when inputs change
  $effect(() => {
    handleFilter();
  });

  $effect(() => {
    handleSort();
  });
</script>

<svelte:head>
  <title>Mapa</title>
</svelte:head>

<div class="map-container">
  <div class="sidebar">
    <div class="filters">
      <div class="filter-group">
        <label>Filtruj 🔽</label>
        <input
          type="text"
          bind:value={filterText}
          placeholder="Wyszukaj..."
          class="filter-input"
        >
      </div>

      <div class="filter-group">
        <label>Sortuj 🔽</label>
        <select bind:value={sortField} class="sort-select">
          <option value="">Wybierz pole...</option>
          {#each template.fields.filter(f => f.visible) as field}
            <option value={field.key}>{field.displayLabel || field.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="pin-list">
      {#each filteredObjects as obj}
        <div class="pin-item" onclick={() => focusOnPin(obj)}>
          <div class="pin-header">
            <span class="pin-title">{obj.data.title || 'Bez nazwy'}</span>
            {#if obj.hasIncompleteData}
              <span class="incomplete-badge">⚠️</span>
            {/if}
          </div>

          <div class="pin-details">
            {#each template.fields.filter(f => f.visible && f.key !== 'title' && f.key !== 'coordinates') as field}
              {@const value = obj.data[field.key]}
              {#if value}
                <div class="pin-field">
                  <span class="field-label">{field.displayLabel || field.label}:</span>
                  <span class="field-value">{formatFieldValue(field, value)}</span>
                </div>
              {/if}
            {/each}
          </div>

          <div class="pin-meta">
            <span class="pin-year">2025</span>
            <span class="pin-price">20 000PLN</span>
          </div>

          <div class="pin-indicator" style="background-color: {obj.id.includes('1') ? '#000' : obj.id.includes('2') ? '#ef4444' : '#22c55e'}"></div>
        </div>
      {/each}
    </div>
  </div>

  <div class="map-view">
    <MapComponent
      objects={validMapObjects()}
      focusCoordinates={focusCoordinates}
      mapConfig={mapConfig}
    />
  </div>
</div>

<style>
  .map-container {
    display: flex;
    height: calc(100vh - var(--nav-height));
    background: var(--color-background);
  }

  .sidebar {
    width: var(--sidebar-width);
    background: var(--color-background);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
  }

  .filters {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .filter-group {
    margin-bottom: var(--space-4);
  }

  .filter-group:last-child {
    margin-bottom: 0;
  }

  .filter-group label {
    display: block;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-2);
  }

  .filter-input,
  .sort-select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: var(--color-background);
    transition: border-color var(--transition-fast);
  }

  .filter-input:focus,
  .sort-select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .pin-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  .pin-item {
    position: relative;
    padding: var(--space-4);
    margin-bottom: var(--space-3);
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .pin-item:hover {
    background: var(--color-surface);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .pin-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-2);
  }

  .pin-title {
    font-family: var(--font-ui);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
  }

  .incomplete-badge {
    font-size: var(--text-xs);
    opacity: 0.8;
  }

  .pin-details {
    margin-bottom: var(--space-3);
  }

  .pin-field {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-1);
    font-size: var(--text-xs);
  }

  .field-label {
    font-family: var(--font-mono);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
  }

  .field-value {
    font-family: var(--font-mono);
    color: var(--color-text-primary);
  }

  .pin-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .pin-year {
    font-weight: var(--font-weight-medium);
  }

  .pin-price {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .pin-indicator {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    width: var(--space-3);
    height: var(--space-3);
    border-radius: var(--radius-full);
  }

  .map-view {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .map-container {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      height: 40vh;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
    }

    .map-view {
      height: 60vh;
    }

    .pin-list {
      padding: var(--space-2);
    }

    .pin-item {
      padding: var(--space-3);
      margin-bottom: var(--space-2);
    }
  }
</style>