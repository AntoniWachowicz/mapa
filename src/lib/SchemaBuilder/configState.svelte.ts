/**
 * Configuration State Module
 * Manages field configuration state for SchemaBuilder.
 * Provides reactive state for all field type configurations.
 */

/**
 * Date field configuration for multi-date fields
 */
export interface DateField {
  key: string;
  label: string;
  required: boolean;
}

/**
 * Creates and manages configuration state for schema field types.
 * Uses Svelte 5 runes for reactive state management.
 */
export function createConfigState() {
  // Rich Text Configuration
  let richTextMaxLength = $state(5000);
  let richTextFormatting = $state(['bold', 'italic', 'underline', 'lists', 'links']);

  // Files Configuration
  let filesAllowedTypes = $state(['pdf', 'docx', 'xlsx']);
  let filesMaxSize = $state(10); // MB
  let filesMaxCount = $state(5);

  // Gallery Configuration
  let galleryStyle = $state<'carousel' | 'grid' | 'masonry'>('carousel');
  let galleryAllowImages = $state(true);
  let galleryAllowVideos = $state(true);
  let galleryMaxItems = $state(10);

  // Multi-Date Configuration
  let multiDateFields = $state<DateField[]>([
    { key: 'submitted', label: 'Data złożenia', required: false }
  ]);
  let multiDateLayout = $state<'horizontal' | 'vertical'>('horizontal');

  // Address Configuration
  let addressDisplayFields = $state(['street', 'number', 'postalCode', 'city']);
  let addressRequiredFields = $state(['city']);
  let addressEnableGeocoding = $state(true);

  // Links Configuration
  let linksMaxCount = $state(10);

  // Price Configuration
  let priceCurrency = $state('PLN');
  let priceFundingSources = $state(['UE', 'Wnioskodawca']);
  let priceShowPercentages = $state(true);
  let priceShowTotal = $state(true);

  /**
   * Resets all configuration values to their defaults.
   */
  function reset(): void {
    richTextMaxLength = 5000;
    richTextFormatting = ['bold', 'italic', 'underline', 'lists', 'links'];
    filesAllowedTypes = ['pdf', 'docx', 'xlsx'];
    filesMaxSize = 10;
    filesMaxCount = 5;
    galleryStyle = 'carousel';
    galleryAllowImages = true;
    galleryAllowVideos = true;
    galleryMaxItems = 10;
    multiDateFields = [{ key: 'submitted', label: 'Data złożenia', required: false }];
    multiDateLayout = 'horizontal';
    addressDisplayFields = ['street', 'number', 'postalCode', 'city'];
    addressRequiredFields = ['city'];
    addressEnableGeocoding = true;
    linksMaxCount = 10;
    priceCurrency = 'PLN';
    priceFundingSources = ['UE', 'Wnioskodawca'];
    priceShowPercentages = true;
    priceShowTotal = true;
  }

  // Array helper functions
  function addDateField(): void {
    multiDateFields = [...multiDateFields, { key: '', label: '', required: false }];
  }

  function removeDateField(index: number): void {
    multiDateFields = multiDateFields.filter((_, i) => i !== index);
  }

  function addFundingSource(): void {
    priceFundingSources = [...priceFundingSources, ''];
  }

  function removeFundingSource(index: number): void {
    priceFundingSources = priceFundingSources.filter((_, i) => i !== index);
  }

  // Return reactive state and methods
  return {
    // Rich Text
    get richTextMaxLength() { return richTextMaxLength; },
    set richTextMaxLength(value: number) { richTextMaxLength = value; },
    get richTextFormatting() { return richTextFormatting; },
    set richTextFormatting(value: string[]) { richTextFormatting = value; },

    // Files
    get filesAllowedTypes() { return filesAllowedTypes; },
    set filesAllowedTypes(value: string[]) { filesAllowedTypes = value; },
    get filesMaxSize() { return filesMaxSize; },
    set filesMaxSize(value: number) { filesMaxSize = value; },
    get filesMaxCount() { return filesMaxCount; },
    set filesMaxCount(value: number) { filesMaxCount = value; },

    // Gallery
    get galleryStyle() { return galleryStyle; },
    set galleryStyle(value: 'carousel' | 'grid' | 'masonry') { galleryStyle = value; },
    get galleryAllowImages() { return galleryAllowImages; },
    set galleryAllowImages(value: boolean) { galleryAllowImages = value; },
    get galleryAllowVideos() { return galleryAllowVideos; },
    set galleryAllowVideos(value: boolean) { galleryAllowVideos = value; },
    get galleryMaxItems() { return galleryMaxItems; },
    set galleryMaxItems(value: number) { galleryMaxItems = value; },

    // Multi-Date
    get multiDateFields() { return multiDateFields; },
    set multiDateFields(value: DateField[]) { multiDateFields = value; },
    get multiDateLayout() { return multiDateLayout; },
    set multiDateLayout(value: 'horizontal' | 'vertical') { multiDateLayout = value; },

    // Address
    get addressDisplayFields() { return addressDisplayFields; },
    set addressDisplayFields(value: string[]) { addressDisplayFields = value; },
    get addressRequiredFields() { return addressRequiredFields; },
    set addressRequiredFields(value: string[]) { addressRequiredFields = value; },
    get addressEnableGeocoding() { return addressEnableGeocoding; },
    set addressEnableGeocoding(value: boolean) { addressEnableGeocoding = value; },

    // Links
    get linksMaxCount() { return linksMaxCount; },
    set linksMaxCount(value: number) { linksMaxCount = value; },

    // Price
    get priceCurrency() { return priceCurrency; },
    set priceCurrency(value: string) { priceCurrency = value; },
    get priceFundingSources() { return priceFundingSources; },
    set priceFundingSources(value: string[]) { priceFundingSources = value; },
    get priceShowPercentages() { return priceShowPercentages; },
    set priceShowPercentages(value: boolean) { priceShowPercentages = value; },
    get priceShowTotal() { return priceShowTotal; },
    set priceShowTotal(value: boolean) { priceShowTotal = value; },

    // Methods
    reset,
    addDateField,
    removeDateField,
    addFundingSource,
    removeFundingSource
  };
}

export type ConfigState = ReturnType<typeof createConfigState>;
