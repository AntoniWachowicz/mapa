<script lang="ts">
  import { page } from '$app/stores';
  import MapComponent from '$lib/MapComponent.svelte';
  import PinDetailPanel from '$lib/PinDetailPanel.svelte';
  import PinList from '$lib/PinList.svelte';
  import Icon from '$lib/Icon.svelte';
  import type { Template, SavedObject, MapObject, MapConfig, CategoryFieldData } from '$lib/types.js';

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

  // URL parameters for customization
  const params = $derived(() => $page.url.searchParams);

  // Customization options from URL parameters
  const showList = $derived(() => params().get('showList') !== 'false'); // Default true
  const showFilters = $derived(() => params().get('showFilters') === 'true'); // Default false
  const accentColor = $derived(() => params().get('accentColor') || '#3B82F6');
  const backgroundColor = $derived(() => params().get('backgroundColor') || '#FFFFFF');
  const listWidth = $derived(() => parseInt(params().get('listWidth') || '350'));
  const mapStyle = $derived(() => params().get('mapStyle') || 'osm'); // osm, watercolor, satellite, terrain

  // State variables
  let focusCoordinates = $state<{lat: number, lng: number} | null>(null);
  let selectedObject = $state<SavedObject | null>(null);
  let detailPanelEl = $state<HTMLDivElement | null>(null);
  let mapViewEl = $state<HTMLDivElement | null>(null);
  let connectionLine = $state({ x1: 0, y1: 0, x2: 0, y2: 0 });
  let lightboxImageUrl = $state<string | null>(null);
  let filterText = $state('');
  let filteredObjects = $state<SavedObject[]>([]);

  // Initialize filtered objects
  filteredObjects = objects;
  $effect(() => {
    filteredObjects = [...objects];
  });

  function handleFilter(): void {
    let filtered = objects;

    if (filterText.trim()) {
      filtered = filtered.filter(obj => {
        const searchTerm = filterText.toLowerCase();
        return template.fields.some(field => {
          if (!field.key) return false;
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

  function focusOnPin(coordinates: {lat: number, lng: number}): void {
    focusCoordinates = coordinates;
    setTimeout(() => {
      focusCoordinates = null;
    }, 100);
  }

  function handlePinClickWithPan(obj: MapObject): void {
    selectedObject = obj;

    setTimeout(() => {
      if (panToPinCallback) {
        panToPinCallback();
      }
      setTimeout(updateConnectionLine, 100);
    }, 10);
  }

  let panToPinCallback = $state<(() => void) | null>(null);

  function closeDetailPanel(): void {
    selectedObject = null;
    panToPinCallback = null;
  }

  function openImageLightbox(imageUrl: string): void {
    lightboxImageUrl = imageUrl;
  }

  function closeLightbox(): void {
    lightboxImageUrl = null;
  }

  function handlePinPositionUpdate(x: number, y: number): void {
    if (!detailPanelEl || !mapViewEl) return;

    const panelRect = detailPanelEl.getBoundingClientRect();
    const mapViewRect = mapViewEl.getBoundingClientRect();

    const x1 = panelRect.right - mapViewRect.left;
    const y1 = panelRect.bottom - mapViewRect.top;

    const x2 = x;
    const y2 = y;

    connectionLine = { x1, y1, x2, y2 };
  }

  function updateConnectionLine(): void {
    if (!selectedObject || !detailPanelEl || !mapViewEl) return;

    const panelRect = detailPanelEl.getBoundingClientRect();
    const mapViewRect = mapViewEl.getBoundingClientRect();

    const x1 = panelRect.right - mapViewRect.left;
    const y1 = panelRect.bottom - mapViewRect.top;

    connectionLine = { x1, y1, x2: connectionLine.x2, y2: connectionLine.y2 };
  }

  // Filter objects that have valid GeoJSON location
  const validMapObjects = $derived(() => {
    if (!template?.fields) return [];

    const result: MapObject[] = [];
    for (const obj of filteredObjects) {
      if (obj.location && obj.location.type === 'Point' &&
          obj.location.coordinates && obj.location.coordinates.length === 2) {
        result.push(obj as MapObject);
      }
    }
    return result;
  });

  // Update filters when inputs change
  $effect(() => {
    handleFilter();
  });

  // Override map style from URL parameter
  $effect(() => {
    if (mapStyle() !== 'osm' && mapConfig.baseLayerStyle !== mapStyle()) {
      mapConfig = { ...mapConfig, baseLayerStyle: mapStyle() as MapConfig['baseLayerStyle'] };
    }
  });
</script>

<svelte:head>
  <title>Mapa - Embed</title>
  <style>
    :root {{
      --color-accent: {accentColor()};
      --embed-bg: {backgroundColor()};
      --embed-list-width: {listWidth()}px;
    }}
  </style>
</svelte:head>

<div class="embed-container" style="background: var(--embed-bg);">
  {#if showList()}
    <div class="sidebar" style="width: var(--embed-list-width);">
      {#if showFilters()}
        <div class="filters">
          <input
            type="text"
            bind:value={filterText}
            placeholder="Wyszukaj..."
            class="filter-input"
          >
        </div>
      {/if}

      <div class="list-container">
        <PinList
          objects={filteredObjects}
          {template}
          onFocus={focusOnPin}
          showActions={false}
        />
      </div>
    </div>
  {/if}

  <div class="map-view" bind:this={mapViewEl}>
    <MapComponent
      objects={validMapObjects()}
      onMapClick={() => {}}
      selectedCoordinates={null}
      {focusCoordinates}
      {mapConfig}
      onPinClick={handlePinClickWithPan}
      selectedObjectId={selectedObject?.id || null}
      onPinPositionUpdate={handlePinPositionUpdate}
      bind:panToPinCallback
      tags={template.tags || []}
      fields={template.fields || []}
    />

    <!-- Detail Panel -->
    {#if selectedObject}
      <div class="detail-container" bind:this={detailPanelEl}>
        <PinDetailPanel
          object={selectedObject}
          {template}
          onClose={closeDetailPanel}
          onImageClick={openImageLightbox}
        />

        <button class="external-close-btn" onclick={closeDetailPanel} type="button">
          <Icon name="Close" size={16} />
        </button>
      </div>

      <!-- Connection Line -->
      <svg class="connection-line">
        <line
          x1={connectionLine.x1}
          y1={connectionLine.y1}
          x2={connectionLine.x2}
          y2={connectionLine.y2}
          stroke="var(--color-accent)"
          stroke-width="2"
          opacity="0.6"
        />
      </svg>
    {/if}
  </div>
</div>

<!-- Image Lightbox -->
{#if lightboxImageUrl}
  <div class="lightbox-overlay" onclick={closeLightbox} role="dialog" aria-modal="true" aria-label="Powiększony obraz" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && closeLightbox()}>
    <button class="lightbox-close" onclick={closeLightbox} type="button">
      <Icon name="Close" size={32} />
    </button>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="lightbox-content" role="document" onkeydown={(e) => e.stopPropagation()} onclick={(e) => e.stopPropagation()}>
      <img src={lightboxImageUrl} alt="Powiększone zdjęcie" />
    </div>
  </div>
{/if}

<style>
  .embed-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .sidebar {
    background: var(--color-background);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    height: 100vh;
    overflow: hidden;
    max-width: 35%;
  }

  .filters {
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
  }

  .filter-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    background: var(--color-background);
    transition: border-color var(--transition-fast);
  }

  .filter-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .list-container {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .map-view {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .detail-container {
    position: absolute;
    left: 20px;
    top: 20px;
    z-index: 1000;
  }

  .external-close-btn {
    position: absolute;
    top: 0;
    right: -40px;
    width: 40px;
    height: 40px;
    background: #FFFFFF;
    border: 1px solid #000000;
    border-radius: 0;
    cursor: pointer;
    color: #666;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .external-close-btn:hover {
    background: #F5F5F5;
    color: #000;
  }

  .connection-line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999;
  }

  .lightbox-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20000;
    padding: 40px;
    backdrop-filter: blur(4px);
  }

  .lightbox-content {
    background: white;
    border-radius: 12px;
    padding: 20px;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .lightbox-content img {
    max-width: 100%;
    max-height: calc(90vh - 40px);
    width: auto;
    height: auto;
    display: block;
    border-radius: 8px;
  }

  .lightbox-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    z-index: 20001;
  }

  .lightbox-close:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .embed-container {
      flex-direction: column;
    }

    .sidebar {
      width: 100% !important;
      height: 40vh;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
    }

    .map-view {
      height: 60vh;
    }
  }
</style>
