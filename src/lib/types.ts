// src/lib/types.ts

// ============================================================================
// Auth types — used in JWT payload and App.Locals
// ============================================================================

export type UserRole = 'superadmin' | 'admin' | 'viewer';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface AuthUser {
  userId: string;
  tenantId: string | null; // null for superadmin (platform-level role, no tenant)
  role: UserRole;
  email: string;
}

// ============================================================================
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
  | 'tags'       // Tag selection (legacy - use 'selection' for new fields)
  | 'price'      // Funding breakdown with percentages
  | 'category'   // Category selection (legacy - use 'selection' for new fields)
  | 'selection'; // Unified selection list (single, multi, or hierarchical)

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

// Selection Field Configuration (unified replacement for category/tags)
export type SelectionMode = 'single' | 'multi' | 'hierarchical';

export interface SelectionOption {
  id: string;           // Unique identifier within this field
  value: string;        // Display value
  color?: string;       // Optional color for badges
  order: number;        // Sort order
  archived?: boolean;   // Soft delete (hidden but data preserved)
}

export interface SelectionConfig {
  mode: SelectionMode;
  options: SelectionOption[];
  allowCustom: boolean;          // Allow users to add one-off values per pin
  maxSelections?: number;        // For 'multi' mode - max allowed selections
  maxSecondary?: number;         // For 'hierarchical' mode - max secondary selections
  isCategory?: boolean;          // Use as category field for map display (only one per schema)
}

export type FieldConfig =
  | RichTextConfig
  | FilesConfig
  | GalleryConfig
  | MultiDateConfig
  | AddressConfig
  | LinksConfig
  | TagConfig
  | PriceConfig
  | SelectionConfig;

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

// Selection field data (stored in pins)
export interface SelectionFieldData {
  selected?: string | null;      // For 'single' mode - option ID or custom value
  selections?: string[];         // For 'multi' mode - array of option IDs or custom values
  primary?: string | null;       // For 'hierarchical' mode - primary selection
  secondary?: string[];          // For 'hierarchical' mode - secondary selections
  customEntries?: string[];      // Per-pin custom values (not in field options)
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
  key: string;            // Made required for backward compatibility
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
  | PriceData             // price
  | SelectionFieldData;   // selection

export interface ProjectData {
  [fieldName: string]: FieldValue;
}

export interface SavedObject {
  id: string;
  schemaVersion?: number;           // Which schema version created this pin
  location?: GeoJSON.Point | null;  // Optional - null for incomplete imports without coordinates
  locationAddressSync?: 'synced' | 'unverified' | 'mismatch'; // Sync status
  data: ProjectData;
  hasIncompleteData?: boolean;      // Flag for incomplete imports (missing coordinates, etc.)
  missingFields?: string[];         // List of field names that are missing/incomplete (e.g., ['location'])
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
  baseLayerStyle?: 'osm' | 'watercolor' | 'satellite' | 'terrain'; // Base map tile style
}

export interface User {
  username: string;
}