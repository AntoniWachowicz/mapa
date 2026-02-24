/**
 * Leaflet Map Utilities
 * Provides utilities for Leaflet map initialization and configuration.
 */

export interface TileProvider {
  url: string;
  attribution: string;
  maxZoom?: number;
}

/**
 * Available tile provider configurations
 */
export const TILE_PROVIDERS: Record<string, TileProvider> = {
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

/**
 * Load Leaflet library dynamically
 * Injects CSS and JS into the document head
 * @returns Promise that resolves with the Leaflet global object
 */
export async function loadLeaflet(): Promise<any> {
  // Add CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);

  // Add JS and wait for load
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = (window as any).L;
      resolve(L);
    };
    document.head.appendChild(script);
  });
}

/**
 * Load MarkerCluster plugin for Leaflet
 * Must be called after loadLeaflet() since it depends on L being available
 * @returns Promise that resolves when the plugin is loaded
 */
export async function loadMarkerCluster(): Promise<void> {
  // Add MarkerCluster CSS
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
  document.head.appendChild(css);

  const defaultCss = document.createElement('link');
  defaultCss.rel = 'stylesheet';
  defaultCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
  document.head.appendChild(defaultCss);

  // Add MarkerCluster JS and wait for load
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * Get tile provider configuration by key
 */
export function getTileProvider(providerKey: string): TileProvider {
  return TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.osm;
}

/**
 * Create a tile layer for Leaflet map
 */
export function createTileLayer(L: any, providerKey: string = 'osm'): any {
  const provider = getTileProvider(providerKey);
  return L.tileLayer(provider.url, {
    attribution: provider.attribution,
    maxZoom: provider.maxZoom || 18
  });
}
