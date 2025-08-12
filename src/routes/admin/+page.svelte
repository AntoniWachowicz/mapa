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
  let centerMarker: any = null;
  let swMarker: any = null;
  let neMarker: any = null;
  
  // Corner selection state
  let settingCorner = $state<'sw' | 'ne' | null>(null);
  
  // Calculated center for display
  const center = $derived(({
    lat: (config.swLat + config.neLat) / 2,
    lng: (config.swLng + config.neLng) / 2
  }));
  
  onMount(async () => {
    await loadLeaflet();
    initializeMap();
    updateMapVisualization();
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
    
    // Handle map clicks for setting corners
    map.on('click', handleMapClick);
  }
  
  function handleMapClick(e: any) {
    const { lat, lng } = e.latlng;
    
    if (settingCorner === 'sw') {
      config.swLat = lat;
      config.swLng = lng;
      settingCorner = null;
      updateMapVisualization();
    } else if (settingCorner === 'ne') {
      config.neLat = lat;
      config.neLng = lng;
      settingCorner = null;
      updateMapVisualization();
    }
  }
  
  function startSettingCorner(corner: 'sw' | 'ne') {
    settingCorner = corner;
    message = corner === 'sw' ? 'Click on the map to set Southwest corner' : 'Click on the map to set Northeast corner';
  }
  
  function updateMapVisualization() {
    if (!map || !L) return;
    
    // Clear existing visualizations
    if (boundsRectangle) map.removeLayer(boundsRectangle);
    if (centerMarker) map.removeLayer(centerMarker);
    if (swMarker) map.removeLayer(swMarker);
    if (neMarker) map.removeLayer(neMarker);
    
    // Create bounds rectangle
    const bounds = [
      [config.swLat, config.swLng],
      [config.neLat, config.neLng]
    ];
    
    boundsRectangle = L.rectangle(bounds, {
      color: '#007bff',
      weight: 2,
      fillOpacity: 0.2
    }).addTo(map);
    
    // Add corner markers
    swMarker = L.marker([config.swLat, config.swLng], {
      icon: L.divIcon({
        className: 'corner-marker sw-marker',
        html: 'SW',
        iconSize: [30, 20],
        iconAnchor: [15, 10]
      })
    }).addTo(map);
    
    neMarker = L.marker([config.neLat, config.neLng], {
      icon: L.divIcon({
        className: 'corner-marker ne-marker',
        html: 'NE',
        iconSize: [30, 20],
        iconAnchor: [15, 10]
      })
    }).addTo(map);
    
    // Add center marker
    centerMarker = L.marker([center.lat, center.lng], {
      icon: L.divIcon({
        className: 'center-marker',
        html: '🎯',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    
    // Auto-adjust zoom to fit bounds with some padding
    setTimeout(() => {
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [20, 20] });
      
      // Update the zoom setting to match what looks good
      config.defaultZoom = map.getZoom();
    }, 100);
  }
  
  // Update visualization when config changes
  $effect(() => {
    if (map && L) {
      updateMapVisualization();
    }
  });
  
  async function saveConfig(): Promise<void> {
  saving = true;
  message = '';
  
  try {
    // Basic validation
    if (config.swLat >= config.neLat) {
      throw new Error('Southwest latitude must be less than northeast latitude');
    }
    if (config.swLng >= config.neLng) {
      throw new Error('Southwest longitude must be less than northeast longitude');
    }
    
    const formData = new FormData();
    formData.set('config', JSON.stringify(config));
    
    const response = await fetch('?/updateMapConfig', {
      method: 'POST',
      body: formData
    });
    
    // FIX: Don't try to parse JSON, SvelteKit actions return form responses
    if (response.ok) {
      message = 'Map configuration saved successfully!';
    } else {
      throw new Error('Failed to save configuration');
    }
  } catch (error) {
    message = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
</script>

<svelte:head>
  <title>Map Configuration - Admin</title>
</svelte:head>

<div class="admin-container">
  <h1>🗺️ Map Configuration</h1>
  
  <div class="admin-layout">
    <!-- Left Panel: Interactive Map -->
    <div class="map-panel">
      <h2>Interactive Map Setup</h2>
      <p>Click the buttons below, then click on the map to set corners:</p>
      
      <div class="map-controls">
        <button 
          onclick={() => startSettingCorner('sw')}
          class:active={settingCorner === 'sw'}
          disabled={saving}
        >
          📍 Set Southwest Corner
        </button>
        
        <button 
          onclick={() => startSettingCorner('ne')}
          class:active={settingCorner === 'ne'}
          disabled={saving}
        >
          📍 Set Northeast Corner
        </button>
        
        <button onclick={fitToCurrentBounds} disabled={saving}>
          🔍 Fit to Bounds
        </button>
      </div>
      
      <div class="map-container" bind:this={mapContainer}></div>
      
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-color sw"></span> Southwest Corner
        </div>
        <div class="legend-item">
          <span class="legend-color ne"></span> Northeast Corner
        </div>
        <div class="legend-item">
          <span class="legend-emoji">🎯</span> Auto-calculated Center
        </div>
        <div class="legend-item">
          <span class="legend-color bounds"></span> User Bounds
        </div>
      </div>
    </div>
    
    <!-- Right Panel: Configuration Form -->
    <div class="config-panel">
      <h2>Current Settings</h2>
      
      <div class="coordinate-display">
        <div class="coord-group">
          <h3>Southwest Corner</h3>
          <div class="coord-inputs">
            <label>
              Latitude:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.swLat}
                disabled={saving}
              >
            </label>
            <label>
              Longitude:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.swLng}
                disabled={saving}
              >
            </label>
          </div>
        </div>
        
        <div class="coord-group">
          <h3>Northeast Corner</h3>
          <div class="coord-inputs">
            <label>
              Latitude:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.neLat}
                disabled={saving}
              >
            </label>
            <label>
              Longitude:
              <input 
                type="number" 
                step="0.000001" 
                bind:value={config.neLng}
                disabled={saving}
              >
            </label>
          </div>
        </div>
      </div>
      
      <div class="info-display">
        <h3>Auto-calculated Center</h3>
        <p>Lat: {center.lat.toFixed(6)}, Lng: {center.lng.toFixed(6)}</p>
      </div>
      
      <h3>Zoom Settings</h3>
      
      <label>
        Default Zoom Level:
        <input 
          type="range" 
          min="1" 
          max="18" 
          bind:value={config.defaultZoom}
          disabled={saving}
        >
        <span>{config.defaultZoom}</span>
      </label>
      
      <label>
        Switch to Detail at Zoom:
        <input 
          type="range" 
          min="1" 
          max="18" 
          bind:value={config.maxCustomZoom}
          disabled={saving}
        >
        <span>{config.maxCustomZoom}</span>
      </label>
      
      <p class="help-text">
        Users will see your custom image from zoom 1 to {config.maxCustomZoom}, 
        then detailed map tiles above zoom {config.maxCustomZoom}.
      </p>
      
      <h3>Custom Image</h3>
      
      <label>
        Image URL (optional):
        <input 
          type="text" 
          bind:value={config.customImageUrl}
          placeholder="/uploads/map-images/custom-map.png"
          disabled={saving}
        >
      </label>
      
      <p class="help-text">
        Upload your custom illustration to the static folder and enter the path here.
        Image will be stretched to fit the bounds defined above.
      </p>
      
      <div class="form-actions">
        <button onclick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        
        <button onclick={resetToDefaults} disabled={saving}>
          Reset to Defaults
        </button>
      </div>
      
      {#if message}
        <div class="message" class:error={message.includes('Error')}>
          {message}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .admin-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .admin-layout {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 30px;
    margin-top: 20px;
  }
  
  .map-panel {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  
  .config-panel {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    height: fit-content;
  }
  
  .map-controls {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }
  
  .map-controls button {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
  }
  
  .map-controls button:hover:not(:disabled) {
    background: #f8f9fa;
  }
  
  .map-controls button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
  
  .map-container {
    width: 100%;
    height: 500px;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 15px;
  }
  
  .map-legend {
    display: flex;
    gap: 20px;
    font-size: 12px;
    flex-wrap: wrap;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 2px;
  }
  
  .legend-color.sw {
    background: #28a745;
  }
  
  .legend-color.ne {
    background: #dc3545;
  }
  
  .legend-color.bounds {
    background: rgba(0, 123, 255, 0.2);
    border: 2px solid #007bff;
  }
  
  .legend-emoji {
    font-size: 16px;
  }
  
  .coordinate-display {
    margin-bottom: 20px;
  }
  
  .coord-group {
    margin-bottom: 15px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #f9f9f9;
  }
  
  .coord-group h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #333;
  }
  
  .coord-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .info-display {
    background: #e3f2fd;
    padding: 15px;
    border-radius: 6px;
    margin: 20px 0;
  }
  
  .info-display h3 {
    margin-top: 0;
  }
  
  label {
    display: block;
    margin-bottom: 15px;
    font-weight: 600;
  }
  
  input[type="number"], input[type="text"] {
    width: 100%;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-top: 5px;
  }
  
  input[type="range"] {
    width: 80%;
    margin-right: 10px;
  }
  
  .help-text {
    font-size: 12px;
    color: #666;
    margin-top: 10px;
  }
  
  .form-actions {
    display: flex;
    gap: 15px;
    margin-top: 30px;
  }
  
  .form-actions button {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .form-actions button:first-child {
    background: #007bff;
    color: white;
  }
  
  .form-actions button:first-child:hover:not(:disabled) {
    background: #0056b3;
  }
  
  .form-actions button:last-child {
    background: #6c757d;
    color: white;
  }
  
  .form-actions button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .message {
    padding: 12px;
    border-radius: 4px;
    margin-top: 15px;
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .message.error {
    background: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }
  
  /* Custom marker styles */
  :global(.corner-marker) {
    background: white;
    border: 2px solid;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    font-size: 10px;
    line-height: 16px;
  }
  
  :global(.sw-marker) {
    border-color: #28a745;
    color: #28a745;
  }
  
  :global(.ne-marker) {
    border-color: #dc3545;
    color: #dc3545;
  }
  
  :global(.center-marker) {
    background: none;
    border: none;
    font-size: 20px;
  }
  
  @media (max-width: 1200px) {
    .admin-layout {
      grid-template-columns: 1fr;
    }
    
    .config-panel {
      order: -1;
    }
  }
</style>