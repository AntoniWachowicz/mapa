// src/lib/types.ts
export interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'checkbox';
  required: boolean;
  visible: boolean;
}

export interface Template {
  fields: Field[];
}

export interface ProjectData {
  [key: string]: string | number | boolean;
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