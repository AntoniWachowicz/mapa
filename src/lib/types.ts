// src/lib/types.ts
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
}

export interface SelectConfig {
  options: string[]; // Available dropdown options
}

export interface TagFieldData {
  majorTag: string | null; // tag ID
  minorTags: string[]; // array of tag IDs
}

export interface Field {
  key: string;
  label: string;
  displayLabel?: string; // Polish display label
  type: 'text' | 'number' | 'checkbox' | 'tags' | 'email' | 'url' | 'date' | 'textarea' | 'select' | 'currency' | 'percentage' | 'image' | 'youtube';
  required: boolean;
  visible: boolean;
  protected: boolean; // Cannot be deleted
  adminVisible: boolean; // Can be hidden from admin interface
  tagConfig?: TagConfig; // For tags field type only
  selectConfig?: SelectConfig; // For select field type only
}

export interface Template {
  fields: Field[];
  tags: Tag[]; // Global tag definitions
}

export interface ProjectData {
  [key: string]: string | number | boolean | TagFieldData;
}

export interface SavedObject {
  id: string;
  data: ProjectData;
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
}

export interface User {
  username: string;
}