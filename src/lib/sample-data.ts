import type { ProjectData } from './types.js';

/**
 * Sample data for schema preview
 * Contains realistic Polish data for all supported field types
 */
export const sampleData: ProjectData = {
  // Basic text fields
  title: 'Kamienica Śląska 15',
  name: 'Jan Kowalski',
  description: 'Zabytkowa kamienica z początku XX wieku. Znajduje się w centrum miasta, w pobliżu głównego rynku. Budynek został odnowiony w 2018 roku i zachował swój historyczny charakter.',
  address: 'ul. Śląska 15, 50-086 Wrocław',
  notes: 'Uwagi: Wymaga drobnych napraw elewacji. Kontakt z administratorem w godzinach 9-17.',

  // Contact information
  email: 'j.kowalski@example.pl',
  phone: '+48 123 456 789',
  website: 'https://kamienica-slaska.pl',

  // Numbers and financial
  price: 850000,
  area: 120.5,
  rooms: 4,
  floor: 2,
  year: 1923,
  rent: 3500,
  deposit: 7000,
  commission: 2.5,

  // Percentage fields
  percentage: 15.5,
  discount: 10,
  tax: 8,

  // Currency fields (Polish złoty)
  monthly_cost: 1200,
  utilities: 350,
  maintenance: 180,

  // Boolean/checkbox fields
  parking: true,
  balcony: true,
  elevator: false,
  furnished: true,
  pets_allowed: false,
  smoking_allowed: false,
  internet: true,
  heating: true,

  // Date fields
  available_from: '2024-03-15',
  contract_end: '2025-03-14',
  last_renovation: '2018-06-20',
  inspection_date: '2024-01-10',

  // Textarea fields
  amenities: 'Klimatyzacja, ogrzewanie centralne, internet światłowodowy, monitoring, ochrona 24h, miejsce parkingowe w garażu podziemnym.',
  terms: 'Umowa najmu na rok z możliwością przedłużenia. Wymagana kaucja w wysokości dwumiesięcznego czynszu. Zwierzęta niedozwolone.',

  // Location coordinates
  coordinates: '51.1079,17.0385',

  // Selection/dropdown
  type: 'wynajem',
  condition: 'bardzo_dobry',
  district: 'srodmiescie',

  // Image fields
  main_image: '/sample-images/kamienica-front.jpg',
  gallery_1: '/sample-images/salon.jpg',
  gallery_2: '/sample-images/kuchnia.jpg',
  gallery_3: '/sample-images/sypialnia.jpg',
  floor_plan: '/sample-images/plan.jpg',

  // YouTube videos
  video_tour: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  neighborhood_video: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',

  // Category field structure (with visual impact - major/minor tags)
  category: {
    majorTag: 'residential',
    minorTags: ['premium', 'central']
  },

  // Tags field structure (simple multi-select without visual impact)
  tags: {
    selectedTags: ['investment_plan_a', 'major_investor_kowalski', 'downtown_project'],
    selectedTag: 'investment_plan_a' // For single selection mode
  }
};

/**
 * Field-specific sample values for different contexts
 */
export const sampleFieldValues: Record<string, any> = {
  // Real estate specific
  property_type: 'Apartament',
  building_type: 'Kamienica',
  ownership: 'Własność',
  legal_status: 'Księga wieczysta',

  // Commercial
  business_type: 'Restauracja',
  license_number: 'DG-4521/2023',
  opening_hours: 'Pn-Pt: 8:00-22:00, Sb-Nd: 10:00-24:00',

  // Personal
  company: 'Kowalski Development Sp. z o.o.',
  position: 'Kierownik Projektu',
  experience: '8 lat doświadczenia',

  // Technical
  energy_class: 'B',
  heating_type: 'Centralne gazowe',
  internet_speed: 'Do 1 Gb/s',

  // Location details
  metro_distance: '5 minut pieszo',
  school_distance: '200m',
  shopping_distance: '3 minuty pieszo',

  // Investment
  roi: '6.2%',
  rental_yield: '5.8%',
  appreciation: '12% rocznie',

  // Additional amenities
  security: 'System alarmowy + monitoring',
  storage: 'Piwnica 8m²',
  garden: 'Ogród 50m²',

  // Dates
  move_in: '2024-04-01',
  lease_expires: '2025-12-31',
  built_year: '1925',

  // Financial details
  admin_fee: 450,
  insurance: 180,
  property_tax: 220,

  // Measurements
  ceiling_height: '3.2m',
  plot_size: '800m²',
  usable_area: '95.5m²',

  // Status fields
  availability: 'Dostępne natychmiast',
  condition_detail: 'Po remoncie generalnym',
  occupancy: 'Wolne',

  // Contact preferences
  preferred_contact: 'Telefon',
  best_time: 'Popołudnie (14-18)',
  language: 'Polski/Angielski'
};

/**
 * Get sample value for a specific field type and key
 */
export function getSampleValue(fieldKey: string, fieldType: string): any {
  // First try to get specific value for this field key
  if (fieldKey in sampleData) {
    return sampleData[fieldKey as keyof ProjectData];
  }

  // If not found, try field-specific values
  if (fieldKey in sampleFieldValues) {
    return sampleFieldValues[fieldKey];
  }

  // Fall back to type-based defaults
  switch (fieldType) {
    case 'text':
      return 'Przykładowy tekst';
    case 'textarea':
      return 'To jest przykład dłuższego tekstu, który może zawierać więcej szczegółów i informacji o danym elemencie.';
    case 'number':
      return 123;
    case 'email':
      return 'przyklad@example.pl';
    case 'url':
      return 'https://example.pl';
    case 'date':
      return '2024-03-15';
    case 'checkbox':
      return true;
    case 'currency':
      return 2500;
    case 'percentage':
      return 15.5;
    case 'select':
      return 'Opcja przykładowa';
    case 'image':
      return '/sample-images/placeholder.jpg';
    case 'youtube':
      return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    case 'category':
      return {
        majorTag: 'sample',
        minorTags: ['example', 'preview']
      };
    case 'tags':
      return {
        selectedTags: ['plan_basic', 'investor_example', 'central_location'],
        selectedTag: 'plan_basic' // For single selection mode
      };
    default:
      return 'Wartość przykładowa';
  }
}