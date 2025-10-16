// src/lib/types.ts

// GeoJSON type definitions
export namespace GeoJSON {
  export interface Point {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  }

  export interface Polygon {
    type: 'Polygon';
    coordinates: number[][][];
  }

  export interface MultiPolygon {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  }
}

// ============================================================================
// NEW FIELD SYSTEM - 11 Field Types
// ============================================================================

export type FieldType =
  | 'title'      // Always required, text field
  | 'location'   // Always required, GeoJSON point (map click)
  | 'richtext'   // Rich text editor (HTML)
  | 'files'      // File upload (PDF, DOCX, etc.)
  | 'gallery'    // Images + video embeds
  | 'multidate'  // Multiple labeled dates
  | 'address'    // Structured address with geocoding
  | 'links'      // Hyperlinks with labels
  | 'tags'       // Tag selection (existing system)
  | 'price'      // Funding breakdown with percentages
  | 'category';  // Category selection (existing system)

// ============================================================================
// Field Configuration Interfaces
// ============================================================================

export interface RichTextConfig {
  maxLength: number;
  allowedFormatting: string[]; // ['bold', 'italic', 'underline', 'lists', 'links']
}

export interface FilesConfig {
  allowedTypes: string[]; // ['pdf', 'docx', 'xlsx', 'doc', 'xls', 'txt', 'rtf', 'odt', 'ods']
  maxFileSize: number;    // bytes
  maxFiles: number;
}

export interface GalleryConfig {
  displayStyle: 'carousel' | 'grid' | 'masonry'; // Per-schema setting
  allowImages: boolean;
  allowVideos: boolean;
  maxItems: number;
}

export interface MultiDateConfig {
  dateFields: Array<{
    key: string;        // 'submitted', 'accepted', 'completed'
    label: string;      // Customizable per schema
    required: boolean;
  }>;
  layout: 'horizontal' | 'vertical';
}

export interface AddressConfig {
  displayFields: string[];   // ['street', 'number', 'postalCode', 'city', 'gmina']
  requiredFields: string[];  // Which fields are mandatory
  enableGeocoding: boolean;  // Enable location sync
}

export interface LinksConfig {
  maxLinks: number;
}

export interface TagConfig {
  maxMinorTags: number;
  allowMultiple?: boolean;
}

export interface PriceConfig {
  currency: string;                // 'PLN'
  defaultFundingSources: string[]; // ['UE', 'Wnioskodawca']
  showPercentages: boolean;
  showTotal: boolean;
}

export type FieldConfig =
  | RichTextConfig
  | FilesConfig
  | GalleryConfig
  | MultiDateConfig
  | AddressConfig
  | LinksConfig
  | TagConfig
  | PriceConfig;

// ============================================================================
// Field Data Structures (what gets stored in pins)
// ============================================================================

export interface FileData {
  id: string;
  filename: string;       // sanitized filename
  originalName: string;   // user's original filename
  path: string;          // server path
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;            // uploaded path or embed URL
  embedType?: 'youtube' | 'vimeo';
  caption?: string;
  order: number;
}

export interface GalleryData {
  items: GalleryItem[];
}

export interface MultiDateData {
  [key: string]: Date | null; // Dynamic keys based on schema config
}

export interface AddressData {
  street?: string;
  number?: string;
  postalCode?: string;
  city?: string;
  gmina?: string;
}

export interface LinkData {
  text: string;
  url: string;
  order: number;
}

export interface CategoryFieldData {
  majorTag: string | null;
  minorTags: string[];
}

export interface TagsFieldData {
  selectedTags: string[];
  selectedTag?: string;
}

export interface FundingSource {
  source: string;    // 'UE', 'Wnioskodawca', 'Inny'
  amount: number;
  percentage?: number; // Auto-calculated or manual override
}

export interface PriceData {
  total?: number;
  currency: string;
  funding: FundingSource[];
  showTotal: boolean;
  showBreakdown: boolean;
}

// ============================================================================
// Field Definition
// ============================================================================

export interface SelectConfig {
  options: string[];
}

export interface Field {
  id: string;
  fieldType: FieldType;
  fieldName: string;      // Internal key (e.g., 'projectFunding')
  label: string;          // Display label (e.g., 'Finansowanie projektu')
  required: boolean;      // Title & Location always required
  order: number;
  config?: FieldConfig;   // Type-specific configuration

  // Legacy fields (keep for compatibility during transition)
  key?: string;
  displayLabel?: string;
  type?: string;
  visible?: boolean;
  protected?: boolean;
  adminVisible?: boolean;
  tagConfig?: TagConfig;
  selectConfig?: SelectConfig;
  addressSync?: boolean;
}

// ============================================================================
// Tag System (unchanged from old system)
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  displayName?: string;
  color: string;
  order: number;
  visible: boolean;
  inUse?: boolean;
}

// ============================================================================
// Template/Schema
// ============================================================================

export interface Template {
  version?: number;       // Schema version (1 = legacy, 2 = new system)
  fields: Field[];
  tags: Tag[];
}

// ============================================================================
// Pin/Object Data
// ============================================================================

export type FieldValue =
  | string                 // title, richtext
  | number                 // legacy number fields
  | boolean                // legacy checkbox fields
  | FileData[]            // files
  | GalleryData           // gallery
  | MultiDateData         // multidate
  | AddressData           // address
  | LinkData[]            // links
  | TagsFieldData         // tags
  | CategoryFieldData     // category
  | PriceData;            // price

export interface ProjectData {
  [fieldName: string]: FieldValue;
}

export interface SavedObject {
  id: string;
  schemaVersion?: number;           // Which schema version created this pin
  location: GeoJSON.Point;
  locationAddressSync?: 'synced' | 'unverified' | 'mismatch'; // Sync status
  data: ProjectData;
  hasIncompleteData?: boolean;      // Legacy flag for incomplete imports
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MapObject extends SavedObject {
  // Extends SavedObject with no additional fields currently
}

// ============================================================================
// Map Configuration (unchanged)
// ============================================================================

export interface MapConfig {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  defaultZoom: number;
  maxCustomZoom: number;
  customImageUrl?: string;
  overlayEnabled?: boolean;
  boundaryType: 'rectangle' | 'polygon';
  polygonBoundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface User {
  username: string;
}