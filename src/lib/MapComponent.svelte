<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SavedObject, MapConfig, MapObject, GeoJSON } from './types.js';
  
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
  let boundsOverlay: any = null;
  let boundaryPolygon: any = null;
  
  onMount(async () => {
    await loadLeaflet();
    initializeMap();
    updateMarkers();
  });

  onDestroy(() => {
    if (boundsOverlay && map) {
      map.removeLayer(boundsOverlay);
    }
    if (boundaryPolygon && map) {
      map.removeLayer(boundaryPolygon);
    }
  });

  // Check if coordinates are within the configured bounds
  function isWithinBounds(lat: number, lng: number): boolean {
    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      return isPointInPolygon(lat, lng, mapConfig.polygonBoundary);
    }

    // Default rectangle boundary check
    return lat >= mapConfig.swLat && lat <= mapConfig.neLat &&
           lng >= mapConfig.swLng && lng <= mapConfig.neLng;
  }

  // Point-in-polygon algorithm using ray casting
  function isPointInPolygon(lat: number, lng: number, polygon: GeoJSON.Polygon): boolean {
    const coordinates = polygon.coordinates[0]; // Use outer ring
    let isInside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const xi = coordinates[i][0]; // longitude
      const yi = coordinates[i][1]; // latitude
      const xj = coordinates[j][0]; // longitude
      const yj = coordinates[j][1]; // latitude

      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        isInside = !isInside;
      }
    }

    return isInside;
  }

  // Create overlay to darken area outside bounds
  function createBoundsOverlay() {
    if (!map || !L || boundsOverlay) return;

    const mapBounds = map.getBounds();
    const worldBounds = [
      [mapBounds.getSouth() - 10, mapBounds.getWest() - 10],
      [mapBounds.getNorth() + 10, mapBounds.getEast() + 10]
    ];

    // Create outer ring (world bounds)
    const outerRing = [
      [worldBounds[0][0], worldBounds[0][1]], // SW
      [worldBounds[1][0], worldBounds[0][1]], // NW
      [worldBounds[1][0], worldBounds[1][1]], // NE
      [worldBounds[0][0], worldBounds[1][1]], // SE
      [worldBounds[0][0], worldBounds[0][1]]  // back to SW
    ];

    let innerRing;

    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      // Use polygon coordinates for the inner hole
      innerRing = mapConfig.polygonBoundary.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
    } else {
      // Use rectangle bounds for the inner hole
      innerRing = [
        [mapConfig.swLat, mapConfig.swLng], // SW
        [mapConfig.neLat, mapConfig.swLng], // NW
        [mapConfig.neLat, mapConfig.neLng], // NE
        [mapConfig.swLat, mapConfig.neLng], // SE
        [mapConfig.swLat, mapConfig.swLng]  // back to SW
      ];
    }

    boundsOverlay = L.polygon([outerRing, innerRing], {
      color: 'transparent',
      weight: 0,
      fillColor: '#000000',
      fillOpacity: 0.3,
      interactive: false  // Allow clicks to pass through
    }).addTo(map);

    // Add visible boundary outline for polygon boundaries
    if (mapConfig.boundaryType === 'polygon' && mapConfig.polygonBoundary) {
      createBoundaryPolygon();
    }
  }

  // Create visible boundary polygon outline
  function createBoundaryPolygon() {
    if (!map || !L || !mapConfig.polygonBoundary || boundaryPolygon) return;

    const coordinates = mapConfig.polygonBoundary.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]

    boundaryPolygon = L.polygon([coordinates], {
      color: '#007bff',
      weight: 3,
      fillOpacity: 0,
      interactive: false
    }).addTo(map);
  }


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

    // Handle map view changes to update bounds overlay
    map.on('moveend zoomend', () => {
      if (boundsOverlay) {
        map.removeLayer(boundsOverlay);
        boundsOverlay = null;
      }
      if (boundaryPolygon) {
        map.removeLayer(boundaryPolygon);
        boundaryPolygon = null;
      }
      createBoundsOverlay();
    });

    // Create bounds overlay to show restricted areas
    createBoundsOverlay();

    // Handle map clicks
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;

      // Check if click is within bounds before allowing pin placement
      if (!isWithinBounds(lat, lng)) {
        return;
      }

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