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
 * Register SmoothWheelZoom handler on Leaflet
 * Based on projektpro-leaflet-smoothwheelzoom (MIT)
 * Must be called after loadLeaflet() since it depends on L being available
 */
export function registerSmoothWheelZoom(): void {
  const L = (window as any).L;
  if (!L || L.Map.SmoothWheelZoom) return; // already registered or no Leaflet

  L.Map.mergeOptions({
    smoothWheelZoom: true,
    smoothSensitivity: 1
  });

  L.Map.SmoothWheelZoom = L.Handler.extend({
    addHooks: function () {
      L.DomEvent.on(this._map._container, 'wheel', this._onWheelScroll, this);
    },
    removeHooks: function () {
      L.DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this);
    },
    _onWheelScroll: function (e: WheelEvent) {
      if (!this._isWheeling) this._onWheelStart(e);
      this._onWheeling(e);
    },
    _onWheelStart: function (e: WheelEvent) {
      const map = this._map;
      this._isWheeling = true;
      this._wheelMousePosition = map.mouseEventToContainerPoint(e);
      this._centerPoint = map.getSize()._divideBy(2);
      this._startLatLng = map.containerPointToLatLng(this._centerPoint);
      this._wheelStartLatLng = map.containerPointToLatLng(this._wheelMousePosition);
      this._startZoom = map.getZoom();
      this._moved = false;
      this._zooming = true;

      map._stop();
      if (map._panAnim) map._panAnim.stop();

      this._goalZoom = map.getZoom();
      this._prevCenter = map.getCenter();
      this._prevZoom = map.getZoom();

      this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
    },
    _onWheeling: function (e: WheelEvent) {
      const map = this._map;

      this._goalZoom = this._goalZoom - e.deltaY * 0.003 * map.options.smoothSensitivity;
      if (this._goalZoom < map.getMinZoom() || this._goalZoom > map.getMaxZoom()) {
        this._goalZoom = map._limitZoom(this._goalZoom);
      }
      this._wheelMousePosition = map.mouseEventToContainerPoint(e);

      clearTimeout(this._timeoutId);
      this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 200);

      L.DomEvent.preventDefault(e);
      L.DomEvent.stopPropagation(e);
    },
    _onWheelEnd: function () {
      this._isWheeling = false;
      cancelAnimationFrame(this._zoomAnimationId);
      this._map.fire('zoomend');
    },
    _updateWheelZoom: function () {
      const map = this._map;

      if (!map.getCenter().equals(this._prevCenter) || map.getZoom() !== this._prevZoom)
        return;

      this._zoom = map.getZoom() + (this._goalZoom - map.getZoom()) * 0.3;
      this._zoom = Math.floor(this._zoom * 100) / 100;

      const delta = this._wheelMousePosition.subtract(this._centerPoint);
      if (delta.x === 0 && delta.y === 0) return;

      if (map.options.smoothWheelZoom === 'center') {
        this._center = this._startLatLng;
      } else {
        this._center = map.unproject(
          map.project(this._wheelStartLatLng, this._zoom).subtract(delta),
          this._zoom
        );
      }

      if (!this._moved) {
        map._moveStart(true, false);
        this._moved = true;
      }

      map._move(this._center, this._zoom);
      this._prevCenter = map.getCenter();
      this._prevZoom = map.getZoom();

      map.fire('viewreset');

      this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
    }
  });

  L.Map.addInitHook('addHandler', 'smoothWheelZoom', L.Map.SmoothWheelZoom);
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
