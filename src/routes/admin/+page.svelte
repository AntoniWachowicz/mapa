<script lang="ts">
  import { onMount } from 'svelte';
  import type { MapConfig } from '$lib/types.js';
  
  interface PageData {
    mapConfig: MapConfig;
  }
  
  interface Props {
    data: PageData;
  }
  
  const { data }: Props = $props();
  
  let config = $state<MapConfig>({...data.mapConfig});
  let saving = $state(false);
  let message = $state('');
  
  // Map setup
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;
  let boundsRectangle: any = null;
  let boundsOverlay: any = null;
  let centerMarker: any = null;
  let swMarker: any = null;
  let neMarker: any = null;
  let nwMarker: any = null;
  let seMarker: any = null;

  // Dragging state
  let isDragging = $state(false);
  let dragCorner = $state<'sw' | 'ne' | 'nw' | 'se' | null>(null);

  // Coordinate indicator positions
  let coordinateIndicators = $state({
    sw: { x: 0, y: 0 },
    ne: { x: 0, y: 0 },
    nw: { x: 0, y: 0 },
    se: { x: 0, y: 0 }
  });
  
  // Real-time zoom tracking
  let currentZoom = $state(12); // Will be updated when map initializes
  let showingCustomImage = $state(true);
  
  // Calculated center for display
  const center = $derived(({
    lat: (config.swLat + config.neLat) / 2,
    lng: (config.swLng + config.neLng) / 2
  }));
  
  onMount(async () => {
    await loadLeaflet();
    initializeMap();
    updateMapVisualization();
    // Set initial zoom constraints
    updateZoomLevels();
  });
  
  async function loadLeaflet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        L = (window as any).L;
        resolve(L);
      };
      document.head.appendChild(script);
    });
  }
  
  function initializeMap() {
    // Initialize map centered on current bounds
    map = L.map(mapContainer).setView([center.lat, center.lng], config.defaultZoom);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Disable map clicks for corner setting
    // map.on('click', handleMapClick);
    
    // Track zoom changes for real-time feedback
    map.on('zoom', () => {
      currentZoom = map.getZoom();
      showingCustomImage = currentZoom <= config.maxCustomZoom && !!config.customImageUrl;
      updateCoordinateIndicators();
    });

    // Track view changes (pan/zoom) to update indicators - use more responsive events
    map.on('move', updateCoordinateIndicators);
    map.on('zoom', updateCoordinateIndicators);
    map.on('moveend', updateCoordinateIndicators);
    map.on('zoomend', updateCoordinateIndicators);
    map.on('drag', updateCoordinateIndicators);
    map.on('viewreset', updateCoordinateIndicators);
  }
  
  
  function updateMapVisualization() {
    if (!map || !L) return;

    // Clear existing visualizations
    if (boundsRectangle) map.removeLayer(boundsRectangle);
    if (boundsOverlay) map.removeLayer(boundsOverlay);
    if (centerMarker) map.removeLayer(centerMarker);
    if (swMarker) map.removeLayer(swMarker);
    if (neMarker) map.removeLayer(neMarker);
    if (nwMarker) map.removeLayer(nwMarker);
    if (seMarker) map.removeLayer(seMarker);

    // Create bounds rectangle with black border
    const bounds = [
      [config.swLat, config.swLng],
      [config.neLat, config.neLng]
    ];

    boundsRectangle = L.rectangle(bounds, {
      color: '#000000',
      weight: 2,
      fillOpacity: 0,
      fillColor: 'transparent'
    }).addTo(map);

    // Create overlay to darken area outside bounds
    const mapBounds = map.getBounds();
    const worldBounds = [
      [mapBounds.getSouth() - 10, mapBounds.getWest() - 10],
      [mapBounds.getNorth() + 10, mapBounds.getEast() + 10]
    ];

    // Create a polygon with a hole for the bounds area
    const outerRing = [
      [worldBounds[0][0], worldBounds[0][1]], // SW
      [worldBounds[1][0], worldBounds[0][1]], // NW
      [worldBounds[1][0], worldBounds[1][1]], // NE
      [worldBounds[0][0], worldBounds[1][1]], // SE
      [worldBounds[0][0], worldBounds[0][1]]  // back to SW
    ];

    const innerRing = [
      [config.swLat, config.swLng], // SW
      [config.neLat, config.swLng], // NW
      [config.neLat, config.neLng], // NE
      [config.swLat, config.neLng], // SE
      [config.swLat, config.swLng]  // back to SW
    ];

    boundsOverlay = L.polygon([outerRing, innerRing], {
      color: 'transparent',
      weight: 0,
      fillColor: '#000000',
      fillOpacity: 0.2
    }).addTo(map);

    // Add draggable corner markers
    swMarker = createDraggableMarker([config.swLat, config.swLng], 'sw');
    neMarker = createDraggableMarker([config.neLat, config.neLng], 'ne');
    nwMarker = createDraggableMarker([config.neLat, config.swLng], 'nw');
    seMarker = createDraggableMarker([config.swLat, config.neLng], 'se');

    // Add center marker
    centerMarker = L.marker([center.lat, center.lng], {
      icon: L.divIcon({
        className: 'center-marker',
        html: '🎯',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      })
    }).addTo(map);

    // Update zoom levels and constraints based on bounds
    updateZoomLevels();

    // Auto-adjust zoom to fit bounds with some padding
    setTimeout(() => {
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [20, 20] });

      // Update coordinate indicators after map adjusts
      setTimeout(updateCoordinateIndicators, 100);
    }, 100);
  }

  function createDraggableMarker(position: [number, number], corner: 'sw' | 'ne' | 'nw' | 'se') {
    const marker = L.marker(position, {
      icon: L.divIcon({
        className: `corner-marker ${corner}-marker`,
        html: `<div class="corner-handle"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      }),
      draggable: true
    }).addTo(map);

    marker.on('dragstart', () => {
      isDragging = true;
      dragCorner = corner;
    });

    marker.on('drag', (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      updateBoundsFromCorner(corner, lat, lng);
    });

    marker.on('dragend', () => {
      isDragging = false;
      dragCorner = null;
      updateMapVisualization();
    });

    return marker;
  }

  function updateBoundsFromCorner(corner: 'sw' | 'ne' | 'nw' | 'se', lat: number, lng: number) {
    switch (corner) {
      case 'sw':
        config.swLat = lat;
        config.swLng = lng;
        break;
      case 'ne':
        config.neLat = lat;
        config.neLng = lng;
        break;
      case 'nw':
        config.neLat = lat;
        config.swLng = lng;
        break;
      case 'se':
        config.swLat = lat;
        config.neLng = lng;
        break;
    }

    // Update zoom levels based on new bounds
    updateZoomLevels();

    // Update bounds rectangle in real-time
    if (boundsRectangle) {
      const newBounds = [
        [config.swLat, config.swLng],
        [config.neLat, config.neLng]
      ];
      boundsRectangle.setBounds(newBounds);
    }

    // Update overlay in real-time
    if (boundsOverlay) {
      const mapBounds = map.getBounds();
      const worldBounds = [
        [mapBounds.getSouth() - 10, mapBounds.getWest() - 10],
        [mapBounds.getNorth() + 10, mapBounds.getEast() + 10]
      ];

      const outerRing = [
        [worldBounds[0][0], worldBounds[0][1]],
        [worldBounds[1][0], worldBounds[0][1]],
        [worldBounds[1][0], worldBounds[1][1]],
        [worldBounds[0][0], worldBounds[1][1]],
        [worldBounds[0][0], worldBounds[0][1]]
      ];

      const innerRing = [
        [config.swLat, config.swLng],
        [config.neLat, config.swLng],
        [config.neLat, config.neLng],
        [config.swLat, config.neLng],
        [config.swLat, config.swLng]
      ];

      boundsOverlay.setLatLngs([outerRing, innerRing]);
    }

    // Update all marker positions except the one being dragged
    if (swMarker && corner !== 'sw') swMarker.setLatLng([config.swLat, config.swLng]);
    if (neMarker && corner !== 'ne') neMarker.setLatLng([config.neLat, config.neLng]);
    if (nwMarker && corner !== 'nw') nwMarker.setLatLng([config.neLat, config.swLng]);
    if (seMarker && corner !== 'se') seMarker.setLatLng([config.swLat, config.neLng]);

    // Update center marker
    if (centerMarker) centerMarker.setLatLng([center.lat, center.lng]);

    // Update coordinate indicators
    updateCoordinateIndicators();
  }

  function updateZoomLevels() {
    if (!map || !L) return;

    const bounds = L.latLngBounds([
      [config.swLat, config.swLng],
      [config.neLat, config.neLng]
    ]);

    // Calculate zoom level that fits the bounds with some padding
    const boundsZoom = map.getBoundsZoom(bounds, false);

    // Set minimum zoom to bounds zoom (user can't zoom out further than bounds)
    config.defaultZoom = Math.max(boundsZoom - 1, 1); // Allow one level out for context
    config.maxCustomZoom = boundsZoom + 5; // Allow zooming in for detail

    // Update map zoom constraints
    map.setMinZoom(config.defaultZoom);
    map.setMaxZoom(config.maxCustomZoom);

    // If current zoom is too far out, fit to bounds
    if (map.getZoom() < config.defaultZoom) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  function updateCoordinateIndicators() {
    if (!map) return;

    const swPoint = map.latLngToContainerPoint([config.swLat, config.swLng]);
    const nePoint = map.latLngToContainerPoint([config.neLat, config.neLng]);
    const nwPoint = map.latLngToContainerPoint([config.neLat, config.swLng]);
    const sePoint = map.latLngToContainerPoint([config.swLat, config.neLng]);

    coordinateIndicators = {
      sw: { x: swPoint.x, y: swPoint.y },
      ne: { x: nePoint.x, y: nePoint.y },
      nw: { x: nwPoint.x, y: nwPoint.y },
      se: { x: sePoint.x, y: sePoint.y }
    };
  }
  
  // Update visualization when config changes
  $effect(() => {
    if (map && L) {
      updateMapVisualization();
      updateZoomLevels();
    }
  });
  
  async function saveConfig(): Promise<void> {
  saving = true;
  message = '';
  
  try {
    // Basic validation
    if (config.swLat >= config.neLat) {
      throw new Error('Szerokość geograficzna południowo-zachodnia musi być mniejsza niż północno-wschodnia');
    }
    if (config.swLng >= config.neLng) {
      throw new Error('Długość geograficzna południowo-zachodnia musi być mniejsza niż północno-wschodnia');
    }
    
    const formData = new FormData();
    formData.set('config', JSON.stringify(config));
    
    const response = await fetch('?/updateMapConfig', {
      method: 'POST',
      body: formData
    });
    
    // FIX: Don't try to parse JSON, SvelteKit actions return form responses
    if (response.ok) {
      message = 'Konfiguracja mapy została zapisana pomyślnie!';
    } else {
      throw new Error('Nie udało się zapisać konfiguracji');
    }
  } catch (error) {
    message = `Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
  } finally {
    saving = false;
  }
}
  
  function resetToDefaults(): void {
    config = {
      swLat: 40.700,
      swLng: -74.020,
      neLat: 40.720,
      neLng: -74.000,
      defaultZoom: 12,
      maxCustomZoom: 14,
      customImageUrl: undefined
    };
    updateMapVisualization();
  }
  
  function fitToCurrentBounds(): void {
    if (map && L) {
      const bounds = [
        [config.swLat, config.swLng],
        [config.neLat, config.neLng]
      ];
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [20, 20] });
    }
  }

  // Helper function to get zoom level description
  function getZoomDescription(zoom: number): string {
    if (zoom <= 3) return "Kontynent/Świat";
    if (zoom <= 6) return "Kraj";
    if (zoom <= 9) return "Region";
    if (zoom <= 12) return "Miasto";
    if (zoom <= 15) return "Dzielnica";
    if (zoom <= 18) return "Ulica/Budynek";
    return "Maksymalny szczegół";
  }

  // Update zoom tracking when config changes
  $effect(() => {
    if (map) {
      currentZoom = map.getZoom();
      showingCustomImage = currentZoom <= config.maxCustomZoom && !!config.customImageUrl;
    }
  });
</script>

<svelte:head>
  <title>Konfiguracja Mapy - Admin</title>
</svelte:head>

<div class="config-container">
  <div class="map-view">
    <div class="map-container" bind:this={mapContainer}>
      <!-- Dynamic coordinate displays that follow corners -->
      <div
        class="coordinate-overlay"
        style="left: {coordinateIndicators.sw.x}px; top: {coordinateIndicators.sw.y}px; transform: translate(-100%, 0);"
      >
        <div class="coord-display">
          <div class="coord-label">SW</div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.swLat}
              class="coord-input"
              disabled={saving}
            >
          </div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.swLng}
              class="coord-input"
              disabled={saving}
            >
          </div>
        </div>
      </div>

      <div
        class="coordinate-overlay"
        style="left: {coordinateIndicators.ne.x}px; top: {coordinateIndicators.ne.y}px; transform: translate(0, -100%);"
      >
        <div class="coord-display">
          <div class="coord-label">NE</div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.neLat}
              class="coord-input"
              disabled={saving}
            >
          </div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.neLng}
              class="coord-input"
              disabled={saving}
            >
          </div>
        </div>
      </div>

      <div
        class="coordinate-overlay"
        style="left: {coordinateIndicators.nw.x}px; top: {coordinateIndicators.nw.y}px; transform: translate(-100%, -100%);"
      >
        <div class="coord-display">
          <div class="coord-label">NW</div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.neLat}
              class="coord-input"
              disabled={saving}
            >
          </div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.swLng}
              class="coord-input"
              disabled={saving}
            >
          </div>
        </div>
      </div>

      <div
        class="coordinate-overlay"
        style="left: {coordinateIndicators.se.x}px; top: {coordinateIndicators.se.y}px; transform: translate(0, 0);"
      >
        <div class="coord-display">
          <div class="coord-label">SE</div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.swLat}
              class="coord-input"
              disabled={saving}
            >
          </div>
          <div class="coord-value">
            <input
              type="number"
              step="0.000001"
              bind:value={config.neLng}
              class="coord-input"
              disabled={saving}
            >
          </div>
        </div>
      </div>
    </div>

    <div class="map-controls">
      <button onclick={fitToCurrentBounds} class="btn" disabled={saving}>
        Fit to Bounds
      </button>

      <button onclick={saveConfig} class="btn btn-primary" disabled={saving}>
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>

    {#if message}
      <div class="message" class:error={message.includes('Error')}>
        {message}
      </div>
    {/if}
  </div>
</div>

<style>
  .config-container {
    padding: var(--space-6);
    height: calc(100vh - var(--nav-height));
    max-width: var(--content-max-width);
    margin: 0 auto;
  }

  .map-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .map-container {
    flex: 1;
    position: relative;
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--color-border);
    min-height: 0;
  }

  .coordinate-overlay {
    position: absolute;
    z-index: 1000;
    pointer-events: none;
  }

  .coord-display {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid var(--color-border);
    border-radius: 0;
    padding: 6px;
    backdrop-filter: blur(4px);
    box-shadow: var(--shadow-md);
    pointer-events: auto;
    width: fit-content;
    white-space: nowrap;
    line-height: 1;
  }

  .coord-label {
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    color: #000;
    margin: 0 0 1px 0;
    padding: 0;
    text-align: left;
    line-height: 1;
  }

  .coord-value {
    margin: 0 0 1px 0;
    padding: 0;
    line-height: 1;
  }

  .coord-value:last-child {
    margin-bottom: 0;
  }

  .coord-input {
    width: 160px;
    padding: 0;
    margin: 0;
    border: none;
    border-radius: 0;
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    font-weight: 400;
    background: transparent;
    text-align: left;
    color: #000;
    -moz-appearance: textfield;
    min-width: 0;
    line-height: 1;
    display: block;
  }

  .coord-input::-webkit-outer-spin-button,
  .coord-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .coord-input:focus {
    outline: none;
    background: rgba(0, 122, 204, 0.1);
  }

  .map-controls {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  .btn.active {
    background: var(--color-accent);
    color: white;
  }

  .message {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-base);
    background: var(--color-success);
    color: white;
    font-size: var(--text-sm);
  }

  .message.error {
    background: var(--color-error);
  }

  /* Custom marker styles */
  :global(.corner-marker) {
    background: transparent;
    border: none;
    cursor: grab;
  }

  :global(.corner-marker:active) {
    cursor: grabbing;
  }

  :global(.corner-handle) {
    width: 20px;
    height: 20px;
    background: #007bff;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  :global(.corner-handle:hover) {
    transform: scale(1.2);
    background: #0056b3;
  }

  :global(.center-marker) {
    background: none;
    border: none;
    font-size: 20px;
  }

  @media (max-width: 768px) {
    .map-controls {
      flex-direction: column;
    }

    .coord-input {
      width: 80px;
      font-size: 10px;
    }

    .coordinate-overlay {
      transform: scale(0.9);
    }
  }
</style>