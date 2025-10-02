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
  let customTileLayer: any = null;
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

    // Use breakpoint - 3 as default zoom (close but can see the custom map)
    const calculatedDefaultZoom = Math.max(
      mapConfig.defaultZoom,
      Math.min(mapConfig.maxCustomZoom - 3, 14) // 3 zoom levels below breakpoint for good view
    );

    // Initialize map with calculated zoom
    map = L.map(mapContainer).setView(center, calculatedDefaultZoom);

    // Expand bounds by 5% margin to match the custom tiles
    const latRange = mapConfig.neLat - mapConfig.swLat;
    const lngRange = mapConfig.neLng - mapConfig.swLng;
    const marginLat = latRange * 0.05;
    const marginLng = lngRange * 0.05;

    const bounds = [
      [mapConfig.swLat - marginLat, mapConfig.swLng - marginLng], // SW with margin
      [mapConfig.neLat + marginLat, mapConfig.neLng + marginLng]  // NE with margin
    ];
    map.setMaxBounds(bounds);

    // Set zoom range - allow zooming out to see custom tiles but not too far
    map.setMinZoom(Math.max(10, mapConfig.maxCustomZoom - 6));  // Can zoom out to see custom map
    map.setMaxZoom(18); // Allow maximum detail zoom

    // Create OpenStreetMap tile layer (but don't add it yet)
    osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    });

    // Create custom layer if URL provided
    if (mapConfig.customImageUrl) {
      try {
        // Check if it's a tile URL pattern (contains {z}, {x}, {y})
        if (mapConfig.customImageUrl.includes('{z}') && mapConfig.customImageUrl.includes('{x}') && mapConfig.customImageUrl.includes('{y}')) {
          // Use tile layer for tile-based custom maps
          customTileLayer = L.tileLayer(mapConfig.customImageUrl, {
            maxZoom: mapConfig.maxCustomZoom,
            maxNativeZoom: mapConfig.maxCustomZoom,
            minZoom: 8,
            tileSize: 256,
            zoomOffset: 0,
            attribution: 'Custom Map',
            errorTileUrl: '',
            crossOrigin: false,
            opacity: 1
          });
        } else {
          // Use image overlay for single static images
          customImageOverlay = L.imageOverlay(mapConfig.customImageUrl, bounds);
        }
      } catch (error) {
        console.error('Error loading custom map layer:', error);
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
    const fadeStart = mapConfig.maxCustomZoom - 1; // Start fading at breakpoint - 1

    // Always show OSM tiles as base layer (for transparency to work)
    if (!map.hasLayer(osmTileLayer)) {
      map.addLayer(osmTileLayer);
      osmTileLayer.setZIndex(100); // OSM tiles on bottom
    }

    // Add custom layer if it exists and isn't already added
    if (customTileLayer && !map.hasLayer(customTileLayer)) {
      map.addLayer(customTileLayer);
      customTileLayer.setZIndex(200); // Custom tiles on top
    } else if (customImageOverlay && !map.hasLayer(customImageOverlay)) {
      map.addLayer(customImageOverlay);
    }

    // Simple opacity control - show or hide based on zoom
    if (customTileLayer) {
      const container = customTileLayer.getContainer();
      if (container) {
        // Set transition once
        container.style.transition = 'opacity 0.3s ease';

        // Simple logic: show below fadeStart, hide at/above fadeStart
        if (currentZoom < fadeStart) {
          container.style.opacity = '1';
        } else {
          container.style.opacity = '0';
        }
      }
    } else if (customImageOverlay) {
      const container = customImageOverlay.getElement();
      if (container) {
        container.style.transition = 'opacity 0.3s ease';

        if (currentZoom < fadeStart) {
          container.style.opacity = '1';
        } else {
          container.style.opacity = '0';
        }
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