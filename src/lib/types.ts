// src/lib/types.ts

// GeoJSON type definitions
export namespace GeoJSON {
  export interface Polygon {
    type: 'Polygon';
    coordinates: number[][][];
  }
}

export interface Tag {
  id: string;
  name: string;
  displayName?: string; // Polish display name
  color: string; // hex color
  order: number;
  visible: boolean; // Can be archived
  inUse?: boolean; // Computed: if used as major tag anywhere
}

export interface TagConfig {
  maxMinorTags: number; // Admin-configurable limit
  allowMultiple?: boolean; // For tags field - allow multiple selection (default: true)
}

export interface SelectConfig {
  options: string[]; // Available dropdown options
}

export interface CategoryFieldData {
  majorTag: string | null; // tag ID
  minorTags: string[]; // array of tag IDs
}

export interface TagsFieldData {
  selectedTags: string[]; // array of tag IDs for multiple selection
  selectedTag?: string; // single tag ID for single selection
}

export interface Field {
  key: string;
  label: string;
  displayLabel?: string; // Polish display label
  type: 'text' | 'number' | 'checkbox' | 'category' | 'tags' | 'email' | 'url' | 'date' | 'textarea' | 'select' | 'currency' | 'percentage' | 'image' | 'youtube' | 'address';
  required: boolean;
  visible: boolean;
  protected: boolean; // Cannot be deleted
  adminVisible: boolean; // Can be hidden from admin interface
  tagConfig?: TagConfig; // For category and tags field types
  selectConfig?: SelectConfig; // For select field type only
  addressSync?: boolean; // For address field type - sync with coordinates
}

export interface Template {
  fields: Field[];
  tags: Tag[]; // Global tag definitions
}

export interface ProjectData {
  [key: string]: string | number | boolean | CategoryFieldData | TagsFieldData;
}

export interface SavedObject {
  id: string;
  data: ProjectData;
  hasIncompleteData?: boolean; // Flag for objects imported with missing data
}

export interface MapObject extends SavedObject {
  coordinates: {lat: number, lng: number};
}

export interface MapConfig {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;

  defaultZoom: number;
  maxCustomZoom: number;

  customImageUrl?: string;

  boundaryType: 'rectangle' | 'polygon';
  polygonBoundary?: GeoJSON.Polygon;
}

export interface User {
  username: string;
}