<script lang="ts">
  import { onMount } from 'svelte';
  import type { SavedObject, MapConfig, MapObject } from './types.js';
  
  interface Props {
    objects: MapObject[];
    onMapClick: (coordinates: {lat: number, lng: number}) => void;
    selectedCoordinates: {lat: number, lng: number} | null;
    focusCoordinates?: {lat: number, lng: number} | null;
    mapConfig: MapConfig;  // NEW: Add map config prop
  }
  
  const { objects, onMapClick, selectedCoordinates, focusCoordinates = null, mapConfig }: Props = $props();
  
  let mapContainer: HTMLDivElement;
  let map: any;
  let L: any;
  let markers: any[] = [];
  let selectedMarker: any = null;
  let osmTileLayer: any = null;
  let customImageOverlay: any = null;
  
  onMount(async () => {
    await loadLeaflet();
    initializeMap();
    updateMarkers();
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
    // Calculate center from config
    const center = [
      (mapConfig.swLat + mapConfig.neLat) / 2,
      (mapConfig.swLng + mapConfig.neLng) / 2
    ];
    
    // Initialize map with config settings
    map = L.map(mapContainer).setView(center, mapConfig.defaultZoom);
    
    // Set bounds - users cannot pan outside this area
    const bounds = [
      [mapConfig.swLat, mapConfig.swLng], // Southwest corner
      [mapConfig.neLat, mapConfig.neLng]  // Northeast corner
    ];
    map.setMaxBounds(bounds);
    
    // Set zoom range based on configuration
    map.setMinZoom(mapConfig.defaultZoom);  // Default zoom is the furthest users can zoom out
    map.setMaxZoom(18); // Allow maximum detail zoom

    // Create OpenStreetMap tile layer (but don't add it yet)
    osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });
    
    // Create custom image overlay if image URL provided
    if (mapConfig.customImageUrl) {
      try {
        customImageOverlay = L.imageOverlay(mapConfig.customImageUrl, bounds);
      } catch (error) {
        console.error('Error loading custom image overlay:', error);
        // Fallback to OSM tiles
        osmTileLayer.addTo(map);
      }
    }
    
    // Determine which layer to show initially
    updateLayerBasedOnZoom();
    
    // Handle zoom changes for layer switching
    map.on('zoom', updateLayerBasedOnZoom);
    
    // Handle map clicks
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      onMapClick({ lat, lng });
      
      // Update selected marker
      if (selectedMarker) {
        map.removeLayer(selectedMarker);
      }
      selectedMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'selected-marker',
          html: '📍',
          iconSize: [25, 25],
          iconAnchor: [12, 25]
        })
      }).addTo(map);
    });
  }
  
  function updateLayerBasedOnZoom() {
    if (!map || !L) return;
    
    const currentZoom = map.getZoom();
    
    if (currentZoom <= mapConfig.maxCustomZoom && customImageOverlay) {
      // Show custom image overlay
      if (map.hasLayer(osmTileLayer)) {
        map.removeLayer(osmTileLayer);
      }
      if (!map.hasLayer(customImageOverlay)) {
        map.addLayer(customImageOverlay);
      }
    } else {
      // Show OpenStreetMap tiles
      if (customImageOverlay && map.hasLayer(customImageOverlay)) {
        map.removeLayer(customImageOverlay);
      }
      if (!map.hasLayer(osmTileLayer)) {
        map.addLayer(osmTileLayer);
      }
    }
  }
  
  function updateMarkers() {
    if (!map || !L) return;
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add markers for objects with coordinates
    objects.forEach(obj => {
      if (obj.coordinates) {
        const { lat, lng } = obj.coordinates;
        
        const titleField = obj.data.title || obj.data.name || Object.values(obj.data)[0];
        
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'object-marker',
            html: '📌',
            iconSize: [25, 25],
            iconAnchor: [12, 25]
          })
        })
        .bindPopup(`<strong>${titleField}</strong><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
        .addTo(map);
        
        markers.push(marker);
      }
    });
    
    // Fit map to show all markers if any exist (but respect bounds)
    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      const markerBounds = group.getBounds();
      
      // Only fit to markers if they're within our configured bounds
      const configBounds = L.latLngBounds([
        [mapConfig.swLat, mapConfig.swLng],
        [mapConfig.neLat, mapConfig.neLng]
      ]);
      
      if (configBounds.contains(markerBounds)) {
        map.fitBounds(markerBounds.pad(0.1));
      }
    }
  }
  
  // Update markers when objects change
  $effect(() => {
    updateMarkers();
  });
  
  // Clear selected marker when selectedCoordinates is null
  $effect(() => {
    if (!selectedCoordinates && selectedMarker && map) {
      map.removeLayer(selectedMarker);
      selectedMarker = null;
    }
  });
  
  // Handle focus coordinates
  $effect(() => {
    if (focusCoordinates && map && L) {
      map.setView([focusCoordinates.lat, focusCoordinates.lng], 15);
      
      L.popup()
        .setLatLng([focusCoordinates.lat, focusCoordinates.lng])
        .setContent('Focused Pin')
        .openOn(map);
    }
  });
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
  }
  
  :global(.object-marker) {
    background: none;
    border: none;
    font-size: 20px;
  }
  
  :global(.selected-marker) {
    background: none;
    border: none;
    font-size: 20px;
    filter: hue-rotate(120deg);
  }
</style>