<script lang="ts">
  import { onMount } from 'svelte';
  import type { MapConfig, GeoJSON } from '$lib/types.js';
  import { ZYWIECKI_RAJ_BOUNDARY, calculatePolygonBounds, BOUNDARY_REGISTRY, getBoundaryById } from '$lib/boundaries.js';
  import { createDatabaseManager } from '$lib/features/admin/databaseManager.svelte.js';
  import { createWorldBoundsOverlay } from '$lib/features/admin/boundaryHelpers.js';
  import { createMarkerManager } from '$lib/features/admin/markerManager.svelte.js';
  import CoordinateDisplay from '$lib/components/admin/CoordinateDisplay.svelte';
  
  interface PageData {
    mapConfig: MapConfig;
  }
  
  interface Props {
    data: PageData;
  }
  
  const { data }: Props = $props();

  let config = $state<MapConfig>({
    ...data.mapConfig,
    overlayEnabled: data.mapConfig.overlayEnabled ?? true // Ensure default value
  });
  let saving = $state(false);
  let message = $state('');

  // Selected boundary ID (derived from current config)
  let selectedBoundaryId = $state<string | null>(
    config.boundaryType === 'polygon' ? 'zywiecki-raj' : null
  );
  
  // Map setup
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;
  let boundsRectangle: any = null;
  let boundsOverlay: any = null;

  // Template export state
  let exportingTemplate = $state(false);
  let exportMessage = $state('');

  // Custom map upload state
  let uploadingMap = $state(false);
  let uploadMessage = $state('');
  let uploadFileInput: HTMLInputElement;

  // Database operations manager
  const dbManager = createDatabaseManager();

  // Marker manager
  const markerManager = createMarkerManager();

  // Custom overlay toggle
  let showCustomOverlay = $state(true);
  let customTileLayer: any = null;
  let osmTileLayer: any = null;

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
    // Load object count for seeding UI
    fetchObjectCount();
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
  
  // Tile provider configurations (same as MapComponent)
  const tileProviders: Record<string, { url: string; attribution: string; maxZoom?: number }> = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    watercolor: {
      url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
      attribution: '© Stamen Design, © OpenStreetMap contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      maxZoom: 19
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap contributors, © OpenStreetMap contributors'
    }
  };

  function initializeMap() {
    // Initialize map centered on current bounds
    map = L.map(mapContainer).setView([center.lat, center.lng], config.defaultZoom);

    // Add base tile layer using selected style (default to OSM)
    const selectedProvider = tileProviders[config.baseLayerStyle || 'osm'];
    osmTileLayer = L.tileLayer(selectedProvider.url, {
      attribution: selectedProvider.attribution,
      maxZoom: selectedProvider.maxZoom || 18
    }).addTo(map);

    // Add custom tile layer if configured
    if (config.customImageUrl && config.customImageUrl.includes('{z}')) {
      customTileLayer = L.tileLayer(config.customImageUrl, {
        maxZoom: config.maxCustomZoom,
        maxNativeZoom: config.maxCustomZoom,
        minZoom: 8,
        errorTileUrl: '',
        opacity: 1
      });
      if (showCustomOverlay) {
        customTileLayer.addTo(map);
      }
    }

    // Disable map clicks for corner setting
    // map.on('click', handleMapClick);

    // Track zoom changes for real-time feedback
    map.on('zoom', () => {
      currentZoom = map.getZoom();
      const hasCustomUrl = !!config.customImageUrl;
      showingCustomImage = currentZoom <= config.maxCustomZoom && hasCustomUrl;
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
    if (!map || !L) {
      return;
    }

    // Clear existing visualizations
    if (boundsRectangle) {
      map.removeLayer(boundsRectangle);
      boundsRectangle = null;
    }
    if (boundsOverlay) {
      map.removeLayer(boundsOverlay);
      boundsOverlay = null;
    }
    if (centerMarker) map.removeLayer(centerMarker);
    if (swMarker) map.removeLayer(swMarker);
    if (neMarker) map.removeLayer(neMarker);
    if (nwMarker) map.removeLayer(nwMarker);
    if (seMarker) map.removeLayer(seMarker);

    const bounds = [
      [config.swLat, config.swLng],
      [config.neLat, config.neLng]
    ];

    // Create overlay to darken area outside bounds
    const { outerRing } = createWorldBoundsOverlay(map);

    // Draw boundary based on type
    if (config.boundaryType === 'polygon' && config.polygonBoundary) {
      if (config.polygonBoundary.type === 'Polygon') {
        // Single polygon
        const polygonCoordinates = config.polygonBoundary.coordinates[0].map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );

        // Draw the precise polygon boundary
        boundsRectangle = L.polygon([polygonCoordinates], {
          color: '#007bff',
          weight: 3,
          fillOpacity: 0,
          interactive: false
        }).addTo(map);

        // Create overlay with polygon hole
        boundsOverlay = L.polygon([outerRing, polygonCoordinates], {
          color: 'transparent',
          weight: 0,
          fillColor: '#000000',
          fillOpacity: 0.2,
          interactive: false
        }).addTo(map);
      } else if (config.polygonBoundary.type === 'MultiPolygon') {
        // Multiple polygons
        const allPolygonCoords: any[] = [];
        const overlayHoles: any[] = [];

        config.polygonBoundary.coordinates.forEach((polygonCoords: number[][][]) => {
          const converted = polygonCoords[0].map(
            (coord: [number, number]) => [coord[1], coord[0]]
          );
          allPolygonCoords.push(converted);
          overlayHoles.push(converted);
        });

        // Draw all polygons
        boundsRectangle = L.polygon(allPolygonCoords, {
          color: '#007bff',
          weight: 3,
          fillOpacity: 0,
          interactive: false
        }).addTo(map);

        // Create overlay with multiple holes
        boundsOverlay = L.polygon([outerRing, ...overlayHoles], {
          color: 'transparent',
          weight: 0,
          fillColor: '#000000',
          fillOpacity: 0.2,
          interactive: false
        }).addTo(map);
      }
    } else {
      // Use rectangle boundary
      boundsRectangle = L.rectangle(bounds, {
        color: '#000000',
        weight: 2,
        fillOpacity: 0,
        fillColor: 'transparent'
      }).addTo(map);

      // Create rectangular hole for overlay
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

      // Add draggable corner markers only in rectangle mode
      markerManager.initializeMarkers(
        L,
        map,
        config.swLat,
        config.swLng,
        config.neLat,
        config.neLng,
        () => {}, // onDragStart
        (corner, lat, lng) => updateBoundsFromCorner(corner, lat, lng), // onDrag
        () => updateMapVisualization() // onDragEnd
      );
    }

    // Add center marker
    const centerMkr = L.marker([center.lat, center.lng], {
      icon: L.divIcon({
        className: 'center-marker',
        html: '🎯',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    markerManager.setCenterMarker(centerMkr);

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
      const { outerRing } = createWorldBoundsOverlay(map);

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
    markerManager.updateMarkerPositions(
      config.swLat,
      config.swLng,
      config.neLat,
      config.neLng,
      center.lat,
      center.lng,
      corner
    );

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
      customImageUrl: undefined,
      boundaryType: 'rectangle'
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

  function selectBoundary(boundaryId: string | null): void {
    selectedBoundaryId = boundaryId;

    if (boundaryId === null) {
      // Switch to rectangle mode
      config.boundaryType = 'rectangle';
      config.polygonBoundary = undefined;
    } else {
      // Switch to polygon mode with selected boundary
      config.boundaryType = 'polygon';
      const boundary = getBoundaryById(boundaryId);

      if (boundary) {
        config.polygonBoundary = boundary.polygon;

        // Calculate and update rectangle bounds from polygon
        const bounds = calculatePolygonBounds(boundary.polygon);
        config.swLat = bounds.swLat;
        config.swLng = bounds.swLng;
        config.neLat = bounds.neLat;
        config.neLng = bounds.neLng;
      }
    }

    updateMapVisualization();
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
      const hasCustomUrl = !!config.customImageUrl;
      showingCustomImage = currentZoom <= config.maxCustomZoom && hasCustomUrl;
    }
  });

  // Update tile layer when base style changes
  $effect(() => {
    if (map && osmTileLayer && config.baseLayerStyle) {
      const selectedProvider = tileProviders[config.baseLayerStyle];

      // Remove old tile layer
      map.removeLayer(osmTileLayer);

      // Create and add new tile layer with selected style
      osmTileLayer = L.tileLayer(selectedProvider.url, {
        attribution: selectedProvider.attribution,
        maxZoom: selectedProvider.maxZoom || 18
      }).addTo(map);
    }
  });

  // Template export function
  async function exportMapTemplate() {
    exportingTemplate = true;
    exportMessage = '';

    try {
      const response = await fetch('/api/export-map-template', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to export template');
      }

      // Download the image
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `map-template-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      exportMessage = 'Template exported successfully!';
    } catch (error) {
      exportMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      exportingTemplate = false;
    }
  }

  // Custom map upload function
  async function handleCustomMapUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    uploadingMap = true;
    uploadMessage = '';

    try {
      const formData = new FormData();
      formData.append('customMap', file);

      const response = await fetch('/api/upload-custom-map', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload custom map');
      }

      uploadMessage = `Custom map uploaded successfully! Generated tiles for zoom levels 8-${result.breakpointZoom}. Reloading page...`;

      // Reload page after 2 seconds to refresh config
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      uploadMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      uploadingMap = false;
      // Reset file input
      if (uploadFileInput) {
        uploadFileInput.value = '';
      }
    }
  }

  function triggerFileUpload() {
    uploadFileInput?.click();
  }

  // Toggle custom overlay
  function toggleCustomOverlay() {
    showCustomOverlay = !showCustomOverlay;

    if (map && customTileLayer) {
      if (showCustomOverlay) {
        customTileLayer.addTo(map);
      } else {
        map.removeLayer(customTileLayer);
      }
    }
  }

</script>

<svelte:head>
  <title>Konfiguracja Mapy - Admin</title>
</svelte:head>

<div class="config-container">
  <div class="map-view">
    <div class="map-container" bind:this={mapContainer}>
      <!-- Zoom level counter -->
      <!-- <div class="zoom-counter">
        Zoom: {currentZoom} / {config.maxCustomZoom}
      </div> -->

      <!-- Custom overlay toggle -->
      {#if config.customImageUrl}
        <div class="overlay-toggle">
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={showCustomOverlay} onchange={toggleCustomOverlay} />
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">Custom Overlay</span>
        </div>
      {/if}

      <!-- Dynamic coordinate displays that follow corners - only in rectangle mode -->
      {#if config.boundaryType !== 'polygon'}
        <CoordinateDisplay
          label="SW"
          x={coordinateIndicators.sw.x}
          y={coordinateIndicators.sw.y}
          transform="translate(-100%, 0)"
          lat={config.swLat}
          lng={config.swLng}
          disabled={saving}
          onLatChange={(value) => config.swLat = value}
          onLngChange={(value) => config.swLng = value}
        />

        <CoordinateDisplay
          label="NE"
          x={coordinateIndicators.ne.x}
          y={coordinateIndicators.ne.y}
          transform="translate(0, -100%)"
          lat={config.neLat}
          lng={config.neLng}
          disabled={saving}
          onLatChange={(value) => config.neLat = value}
          onLngChange={(value) => config.neLng = value}
        />

        <CoordinateDisplay
          label="NW"
          x={coordinateIndicators.nw.x}
          y={coordinateIndicators.nw.y}
          transform="translate(-100%, -100%)"
          lat={config.neLat}
          lng={config.swLng}
          disabled={saving}
          onLatChange={(value) => config.neLat = value}
          onLngChange={(value) => config.swLng = value}
        />

        <CoordinateDisplay
          label="SE"
          x={coordinateIndicators.se.x}
          y={coordinateIndicators.se.y}
          transform="translate(0, 0)"
          lat={config.swLat}
          lng={config.neLng}
          disabled={saving}
          onLatChange={(value) => config.swLat = value}
          onLngChange={(value) => config.neLng = value}
        />
      {/if}
    </div>

    <div class="map-controls">
      <div class="boundary-controls">
        <label for="boundary-select">Select Boundary:</label>
        <select
          id="boundary-select"
          bind:value={selectedBoundaryId}
          onchange={() => selectBoundary(selectedBoundaryId)}
          class="boundary-select"
          disabled={saving}
        >
          <option value={null}>Rectangle (Manual)</option>

          <optgroup label="LGD (Local Action Groups)">
            {#each BOUNDARY_REGISTRY.filter(b => b.category === 'lgd') as boundary}
              <option value={boundary.id}>{boundary.name}</option>
            {/each}
          </optgroup>

          <optgroup label="Gminas">
            {#each BOUNDARY_REGISTRY.filter(b => b.category === 'gmina') as boundary}
              <option value={boundary.id}>{boundary.name}</option>
            {/each}
          </optgroup>
        </select>
      </div>

      <div class="boundary-controls">
        <label for="map-style-select">Map Style:</label>
        <select
          id="map-style-select"
          bind:value={config.baseLayerStyle}
          class="boundary-select"
          disabled={saving}
        >
          <option value="osm">Standard (OpenStreetMap)</option>
          <option value="watercolor">Watercolor (Artistic)</option>
          <option value="satellite">Satellite View</option>
          <option value="terrain">Terrain/Topographic</option>
        </select>
      </div>

      <button onclick={fitToCurrentBounds} class="btn" disabled={saving}>
        Dopasuj widok do granic
      </button>

      <div class="custom-map-section">
        <div class="custom-map-status">
          {#if config.customImageUrl}
            <span class="status-indicator active">
              <img src="/icons/Checkmark.svg" alt="" style="width: 14px; height: 14px; margin-right: 4px;" />
              Custom map active
            </span>
          {:else}
            <span class="status-indicator inactive">
              <img src="/icons/Circle.svg" alt="" style="width: 14px; height: 14px; margin-right: 4px;" />
              Using default OSM tiles
            </span>
          {/if}
        </div>

        {#if config.customImageUrl}
          <div class="overlay-toggle">
            <label>
              <input
                type="checkbox"
                bind:checked={config.overlayEnabled}
                disabled={saving}
              />
              Show overlay on map
            </label>
          </div>
        {/if}

        <button onclick={exportMapTemplate} class="btn btn-secondary" disabled={exportingTemplate || saving}>
          {exportingTemplate ? 'Exporting...' : 'Export Map Template'}
        </button>

        <button onclick={triggerFileUpload} class="btn btn-secondary" disabled={uploadingMap || saving}>
          {uploadingMap ? 'Uploading...' : 'Upload Custom Map'}
        </button>

        <button onclick={dbManager.cleanupUnusedTiles} class="btn btn-warning" disabled={dbManager.cleaningUp || saving}>
          {dbManager.cleaningUp ? 'Cleaning...' : 'Cleanup Unused Tiles'}
        </button>

        <button onclick={dbManager.initiateSeed} class="btn btn-success" disabled={dbManager.seeding || saving}>
          {dbManager.seeding ? 'Generowanie...' : 'Załaduj Dane Demo LGD'}
        </button>

        <button onclick={dbManager.initiateReset} class="btn btn-danger" disabled={dbManager.resetting || saving}>
          {dbManager.resetting ? 'Resetting...' : 'Reset Database'}
        </button>
      </div>

      <input
        type="file"
        bind:this={uploadFileInput}
        onchange={handleCustomMapUpload}
        accept="image/png,image/jpeg,image/jpg"
        style="display: none;"
      />

      <button onclick={saveConfig} class="btn btn-primary" disabled={saving}>
        {saving ? 'Zapisywanie...' : 'Zapisz konfigurację'}
      </button>
    </div>

    {#if message}
      <div class="message" class:error={message.includes('Error')}>
        {message}
      </div>
    {/if}

    {#if exportMessage}
      <div class="message" class:error={exportMessage.includes('Error')}>
        {exportMessage}
      </div>
    {/if}

    {#if uploadMessage}
      <div class="message" class:error={uploadMessage.includes('Error')}>
        {uploadMessage}
      </div>
    {/if}

    {#if dbManager.cleanupMessage}
      <div class="message" class:error={dbManager.cleanupMessage.includes('Error')}>
        {dbManager.cleanupMessage}
      </div>
    {/if}

    {#if dbManager.resetMessage}
      <div class="message" class:error={dbManager.resetMessage.includes('Błąd')}>
        {dbManager.resetMessage}
      </div>
    {/if}

    {#if dbManager.seedMessage}
      <div class="message" class:error={dbManager.seedMessage.includes('Błąd')}>
        {dbManager.seedMessage}
      </div>
    {/if}
  </div>
</div>

<!-- Seed Confirmation Modal -->
{#if dbManager.showSeedConfirm}
  <div class="modal-overlay" onclick={dbManager.cancelSeed}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h2>Załaduj Dane Demo LGD Żywiecki Raj</h2>
      <p>
        Ta operacja wygeneruje <strong>160 przykładowych projektów LGD</strong> z realistycznymi danymi:
      </p>
      <ul style="text-align: left; margin: var(--space-3) 0;">
        <li>40 projektów infrastrukturalnych</li>
        <li>30 projektów turystycznych</li>
        <li>25 projektów kulturalnych</li>
        <li>25 projektów gospodarczych</li>
        <li>20 projektów rolniczych</li>
        <li>20 projektów edukacyjnych</li>
      </ul>
      {#if dbManager.objectCount !== null && dbManager.objectCount > 0}
        <p class="warning-text">
          ⚠️ Baza danych zawiera już <strong>{dbManager.objectCount} obiektów</strong>.
        </p>
        <label style="display: flex; align-items: center; gap: var(--space-2); margin: var(--space-3) 0; cursor: pointer;">
          <input
            type="checkbox"
            bind:checked={dbManager.clearBeforeSeed}
            style="width: 20px; height: 20px; cursor: pointer;"
          />
          <span>Wyczyść istniejące dane przed zasiewem</span>
        </label>
      {:else}
        <p style="color: var(--color-success);">
          ✓ Baza danych jest pusta, gotowa do załadowania danych demo.
        </p>
      {/if}
      <div class="modal-buttons">
        <button onclick={dbManager.cancelSeed} class="btn btn-secondary">
          Anuluj
        </button>
        <button onclick={dbManager.confirmSeed} class="btn btn-success">
          {dbManager.clearBeforeSeed ? 'Wyczyść i Załaduj Dane' : 'Załaduj Dane Demo'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Reset Confirmation Modal -->
{#if dbManager.showResetConfirm}
  <div class="modal-overlay" onclick={dbManager.cancelReset}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h2>Potwierdzenie Resetowania Bazy Danych</h2>
      <p class="warning-text">
        ⚠️ <strong>UWAGA:</strong> Ta operacja usunie wszystkie pinezki i zresetuje schemat do domyślnych ustawień.
      </p>
      <p>
        Ta operacja jest nieodwracalna. Czy na pewno chcesz kontynuować?
      </p>
      <div class="modal-buttons">
        <button onclick={dbManager.cancelReset} class="btn btn-secondary">
          Anuluj
        </button>
        <button onclick={dbManager.confirmReset} class="btn btn-danger">
          Tak, Resetuj Bazę Danych
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @import '$lib/styles/modal.css';

  .config-container {
    padding: var(--space-6);
    height: calc(100vh - var(--nav-height));
    width: 100%;
    margin: 0;
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

  .zoom-counter {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    padding: 8px 12px;
    border-radius: var(--radius-md);
    font-family: 'Space Mono', monospace;
    font-weight: 600;
    font-size: 14px;
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
    pointer-events: none;
  }

  .overlay-toggle {
    position: absolute;
    top: 50px;
    right: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    padding: 8px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toggle-label {
    font-size: 12px;
    font-weight: 500;
    user-select: none;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 20px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: var(--color-primary);
  }

  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(20px);
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
    align-items: center;
    flex-wrap: wrap;
  }

  .boundary-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .boundary-controls label {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .boundary-select {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    border-radius: var(--radius-base);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 250px;
  }

  .boundary-select:hover:not(:disabled) {
    border-color: var(--color-accent);
  }

  .boundary-select:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .boundary-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .boundary-toggles {
    display: flex;
    gap: var(--space-1);
  }

  .boundary-btn {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    border-radius: var(--radius-base);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    transition: all 0.2s ease;
  }

  .boundary-btn:hover {
    background: var(--color-surface-hover);
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

  .custom-map-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-surface-alt);
    border-radius: var(--radius-base);
    border: 1px solid var(--color-border);
  }

  .custom-map-status {
    font-size: var(--text-sm);
    margin-bottom: var(--space-2);
  }

  .overlay-toggle {
    margin-bottom: var(--space-2);
  }

  .overlay-toggle label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .overlay-toggle input[type="checkbox"] {
    cursor: pointer;
  }

  .status-indicator {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: var(--text-xs);
  }

  .status-indicator.active {
    background: var(--color-success);
    color: white;
  }

  .status-indicator.inactive {
    background: var(--color-border);
    color: var(--color-text-secondary);
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

  /* Danger button */
  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }

  /* Success button */
  .btn-success {
    background: #16a34a;
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    background: #15803d;
  }

  /* Modal styles */
  /* Modal Styles - Base styles from modal.css, component-specific overrides below */
  .modal-overlay {
    --modal-z-index: 10000; /* Higher z-index for admin modals */
  }

  .modal-content {
    padding: var(--space-6);
    max-width: 500px;
  }

  .modal-content h2 {
    margin: 0 0 var(--space-4) 0;
    font-size: var(--text-xl);
    color: var(--color-text-primary);
  }

  .modal-content p {
    margin: 0 0 var(--space-3) 0;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  .warning-text {
    color: #dc2626;
    font-weight: 600;
    background: #fef2f2;
    padding: var(--space-3);
    border-radius: var(--radius-base);
    border-left: 4px solid #dc2626;
  }

  .modal-buttons {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-top: var(--space-4);
  }
</style>