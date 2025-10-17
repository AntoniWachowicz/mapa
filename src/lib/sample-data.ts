import type { ProjectData, GalleryData, MultiDateData, AddressData, LinkData, PriceData, CategoryFieldData, TagsFieldData } from './types.js';

/**
 * Sample data for schema preview - Real LGD Żywiecki Raj Investment Example
 * Based on typical EU-funded local development projects in rural Poland
 */
export const sampleData: ProjectData = {
  // Title field (always required)
  title: 'Modernizacja świetlicy wiejskiej w Koszarawie',

  // Location (GeoJSON Point - always required, handled separately in app)
  // coordinates: [19.1234, 49.5678] - handled by map component

  // Rich text field
  richtext: '<p><strong>Świetlica wiejska</strong> w Koszarawie to <em>ważny punkt</em> integracji społeczności lokalnej.</p><ul><li>Organizacja spotkań</li><li>Zajęcia dla dzieci</li><li>Wydarzenia kulturalne</li></ul>',

  // Address field (structured)
  address: {
    street: 'Główna',
    number: '45A',
    postalCode: '34-335',
    city: 'Koszarawa',
    gmina: 'Gmina Milówka'
  } as AddressData,

  // Multiple dates
  multidate: {
    submitted: new Date('2023-09-15'),
    approved: new Date('2023-11-20'),
    started: new Date('2024-02-01'),
    completed: new Date('2024-08-30')
  } as MultiDateData,

  // Links
  links: [
    { text: 'Strona gminy Milówka', url: 'https://milowka.pl', order: 0 },
    { text: 'LGD Żywiecki Raj', url: 'https://zywieckiraj.pl', order: 1 },
    { text: 'Dokumentacja projektu', url: 'https://zywieckiraj.pl/projekty/swietlica-koszarawa', order: 2 }
  ] as LinkData[],

  // Price/Funding breakdown
  price: {
    total: 285000,
    currency: 'PLN',
    funding: [
      { source: 'UE - PROW', amount: 199500, percentage: 70 },
      { source: 'Budżet gminy', amount: 57000, percentage: 20 },
      { source: 'Wkład własny', amount: 28500, percentage: 10 }
    ],
    showTotal: true,
    showBreakdown: true
  } as PriceData,

  // Gallery (images + videos)
  gallery: {
    items: [
      {
        id: 'img1',
        type: 'image',
        url: '/images/swietlica-przed.jpg',
        caption: 'Stan przed modernizacją',
        order: 0
      },
      {
        id: 'img2',
        type: 'image',
        url: '/images/swietlica-po.jpg',
        caption: 'Efekt końcowy realizacji',
        order: 1
      },
      {
        id: 'vid1',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=example123',
        embedType: 'youtube',
        caption: 'Film z otwarcia świetlicy',
        order: 2
      }
    ]
  } as GalleryData,

  // Files (documents)
  files: [
    {
      id: 'file1',
      filename: 'wniosek-o-dofinansowanie.pdf',
      originalName: 'Wniosek o dofinansowanie - Świetlica Koszarawa.pdf',
      path: '/uploads/file1.pdf',
      mimeType: 'application/pdf',
      size: 2457600,
      uploadedAt: new Date('2023-09-15')
    },
    {
      id: 'file2',
      filename: 'kosztorys.xlsx',
      originalName: 'Kosztorys inwestycji.xlsx',
      path: '/uploads/file2.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 89600,
      uploadedAt: new Date('2023-09-18')
    },
    {
      id: 'file3',
      filename: 'protokol-odbioru.pdf',
      originalName: 'Protokół odbioru końcowego.pdf',
      path: '/uploads/file3.pdf',
      mimeType: 'application/pdf',
      size: 1234567,
      uploadedAt: new Date('2024-08-30')
    }
  ],

  // Category (major tag + minor tags)
  category: {
    majorTag: 'infrastruktura_spoleczna',
    minorTags: ['kultura', 'edukacja', 'integracja_spoleczna']
  } as CategoryFieldData,

  // Tags (simple multi-select)
  tags: {
    selectedTags: ['obszar_wiejski', 'wsparcie_ue', 'realizacja_zakonczona'],
    selectedTag: 'obszar_wiejski'
  } as TagsFieldData,

  // Legacy text fields (for backward compatibility)
  name: 'Świetlica Wiejska Koszarawa',
  description: 'Projekt modernizacji świetlicy wiejskiej obejmował kompleksową renowację budynku, wymianę instalacji elektrycznej i sanitarnej, docieplenie ścian zewnętrznych, wymianę stolarki okiennej i drzwiowej oraz wyposażenie w nowe meble i sprzęt multimedialny. Inwestycja ma na celu stworzenie nowoczesnej przestrzeni dla mieszkańców, gdzie będą mogły odbywać się spotkania, zajęcia edukacyjne, warsztaty oraz wydarzenia kulturalne.',
  notes: 'Beneficjent: Gmina Milówka. Projekt realizowany w ramach działania "Podstawowe usługi i odnowa wsi na obszarach wiejskich" PROW 2014-2020. Wniosek pozytywnie zaopiniowany przez Radę LGD Żywiecki Raj.',

  // Contact
  email: 'inwestycje@milowka.pl',
  phone: '+48 33 863 90 90',
  website: 'https://milowka.pl',

  // Numbers
  area: 280,
  rooms: 4,
  capacity: 60,
  year: 1978,

  // Currency
  monthly_cost: 1200,
  maintenance: 450,

  // Percentage
  eu_funding_rate: 70,
  local_contribution: 20,
  own_contribution: 10,

  // Checkboxes
  completed: true,
  accessible: true,
  parking: true,
  heating: true,
  internet: true,

  // Dates
  available_from: '2024-09-01',
  contract_end: '2029-08-31',
  inspection_date: '2024-08-25',

  // Selection
  type: 'modernizacja',
  condition: 'bardzo_dobry',
  status: 'zrealizowany',
  priority: 'wysoki'
};

/**
 * Field-specific sample values for LGD projects
 */
export const sampleFieldValues: Record<string, any> = {
  // Project types
  project_type: 'Infrastruktura społeczna',
  investment_type: 'Modernizacja',
  category_name: 'Kultura i integracja',

  // Locations
  voivodeship: 'śląskie',
  county: 'żywiecki',
  commune: 'Gmina Milówka',
  village: 'Koszarawa',
  region: 'Beskid Żywiecki',

  // Beneficiaries
  beneficiary: 'Gmina Milówka',
  beneficiary_type: 'Jednostka samorządu terytorialnego',
  contact_person: 'Jan Kowalski - Inspektor ds. Inwestycji',
  organization: 'Urząd Gminy w Milówce',

  // Funding sources
  program: 'PROW 2014-2020',
  measure: 'Podstawowe usługi i odnowa wsi',
  sub_measure: '19.2 - Wsparcie na wdrażanie operacji',
  fund_name: 'EFRROW - Europejski Fundusz Rolny na rzecz Rozwoju Obszarów Wiejskich',

  // Financial
  total_value: 285000,
  eu_grant: 199500,
  local_budget: 57000,
  own_funds: 28500,
  unit_cost: 1017.86,

  // Technical specifications
  building_area: 280,
  plot_area: 1200,
  renovation_scope: 'Kompleksowa termomodernizacja, wymiana instalacji, nowe wyposażenie',
  energy_class: 'C',
  heating_type: 'Kotłownia gazowa',

  // Capacity and usage
  max_capacity: 60,
  daily_users: 25,
  events_per_year: 48,
  target_groups: 'Mieszkańcy wsi, dzieci, seniorzy, organizacje pozarządowe',

  // Timeline
  planning_start: '2023-06-01',
  application_date: '2023-09-15',
  approval_date: '2023-11-20',
  construction_start: '2024-02-01',
  construction_end: '2024-08-30',
  warranty_period: '5 lat',

  // Goals and impact
  main_goal: 'Poprawa jakości życia mieszkańców poprzez dostęp do nowoczesnej infrastruktury społecznej',
  expected_impact: 'Wzrost integracji społecznej, rozwój edukacji i kultury lokalnej, 300 osób rocznie korzystających',
  sustainability: 'Gmina zapewnia utrzymanie obiektu przez minimum 10 lat',

  // Documentation
  decision_number: 'LGD/ŻR/2023/127',
  contract_number: 'UM-INW/2024/015',
  permit_number: 'PB-3413-26/2023',

  // Monitoring
  progress: '100%',
  status_desc: 'Projekt zakończony i rozliczony',
  inspection_result: 'Pozytywny - bez uwag',

  // Accessibility
  wheelchair_access: 'Tak - wejście z poziomu gruntu',
  parking_spaces: 8,
  public_transport: 'Przystanek autobusowy 150m',

  // Equipment
  equipment_list: 'Projektor multimedialny, nagłośnienie, stoły (15 szt.), krzesła (60 szt.), kuchnia wyposażona',
  technology: 'Internet 300 Mb/s, WiFi, TV 65"',
  safety: 'System p.poż., monitoring, oświetlenie awaryjne',

  // Operations
  opening_hours: 'Pn-Pt: 14:00-22:00, Sb-Nd: 10:00-22:00',
  management: 'Gmina Milówka',
  staff: 'Kierownik świetlicy + obsługa',
  booking: 'Rezerwacja przez e-mail lub telefon',

  // Legal
  land_ownership: 'Własność gminy',
  legal_status: 'Księga wieczysta nr KW3413/00045678/9',
  permits: 'Pozwolenie na użytkowanie, zgoda konserwatora zabytków',

  // Additional
  historical_note: 'Budynek wybudowany w 1978 r. jako dom kultury',
  previous_renovation: '1998 - drobne prace remontowe',
  future_plans: 'Zagospodarowanie terenu wokół budynku - 2025',
  awards: 'Wyróżnienie LGD za najlepszy projekt 2024',
  media_coverage: 'Artykuł w Gazecie Żywieckiej, reportaż w TVP Katowice',

  // Measurements
  wall_thickness: '45cm cegła + docieplenie 15cm',
  ceiling_height: '3.2m',
  window_area: '45m²',
  roof_area: '320m²',

  // Environmental
  water_source: 'Sieć gminna',
  sewage: 'Kanalizacja sanitarna',
  waste_management: 'Segregacja odpadów',
  green_area: '200m² trawnik',
  trees_planted: 12
};

/**
 * Get sample value for a specific field by field name and type
 */
export function getSampleValue(fieldName: string, fieldType: string): any {
  // First try to get specific value for this field name
  if (fieldName in sampleData) {
    return sampleData[fieldName as keyof ProjectData];
  }

  // Try field-specific values
  if (fieldName in sampleFieldValues) {
    return sampleFieldValues[fieldName];
  }

  // Fall back to type-based defaults with LGD context
  switch (fieldType) {
    case 'title':
      return 'Modernizacja świetlicy wiejskiej w Koszarawie';

    case 'richtext':
      return '<p><strong>Świetlica wiejska</strong> to <em>ważne miejsce</em> dla społeczności lokalnej.</p><ul><li>Spotkania mieszkańców</li><li>Zajęcia edukacyjne</li><li>Wydarzenia kulturalne</li></ul>';

    case 'address':
      return {
        street: 'Główna',
        number: '45A',
        postalCode: '34-335',
        city: 'Koszarawa',
        gmina: 'Gmina Milówka'
      } as AddressData;

    case 'multidate':
      return {
        submitted: new Date('2023-09-15'),
        approved: new Date('2023-11-20'),
        started: new Date('2024-02-01'),
        completed: new Date('2024-08-30')
      } as MultiDateData;

    case 'links':
      return [
        { text: 'Strona projektu', url: 'https://zywieckiraj.pl/projekt', order: 0 },
        { text: 'Dokumentacja', url: 'https://zywieckiraj.pl/docs', order: 1 }
      ] as LinkData[];

    case 'price':
      return {
        total: 285000,
        currency: 'PLN',
        funding: [
          { source: 'UE - PROW', amount: 199500, percentage: 70 },
          { source: 'Budżet gminy', amount: 57000, percentage: 20 },
          { source: 'Wkład własny', amount: 28500, percentage: 10 }
        ],
        showTotal: true,
        showBreakdown: true
      } as PriceData;

    case 'gallery':
      return {
        items: [
          {
            id: 'img1',
            type: 'image',
            url: '/images/example.jpg',
            caption: 'Zdjęcie przykładowe',
            order: 0
          }
        ]
      } as GalleryData;

    case 'files':
      return [
        {
          id: 'file1',
          filename: 'wniosek.pdf',
          originalName: 'Wniosek o dofinansowanie.pdf',
          path: '/uploads/wniosek.pdf',
          mimeType: 'application/pdf',
          size: 1234567,
          uploadedAt: new Date('2023-09-15')
        }
      ];

    case 'category':
      return {
        majorTag: 'infrastruktura_spoleczna',
        minorTags: ['kultura', 'edukacja']
      } as CategoryFieldData;

    case 'tags':
      return {
        selectedTags: ['obszar_wiejski', 'wsparcie_ue'],
        selectedTag: 'obszar_wiejski'
      } as TagsFieldData;

    // Legacy field types
    case 'text':
      return 'Przykładowa wartość tekstowa';
    case 'textarea':
      return 'Projekt ma na celu rozwój infrastruktury społecznej na obszarach wiejskich, co przyczyni się do poprawy jakości życia mieszkańców oraz wzmocnienia więzi społecznych w lokalnej społeczności.';
    case 'number':
      return 285000;
    case 'email':
      return 'kontakt@zywieckiraj.pl';
    case 'url':
      return 'https://zywieckiraj.pl';
    case 'date':
      return '2024-08-30';
    case 'checkbox':
      return true;
    case 'currency':
      return 285000;
    case 'percentage':
      return 70;
    case 'select':
      return 'modernizacja';
    case 'image':
      return '/images/swietlica.jpg';
    case 'youtube':
      return 'https://www.youtube.com/watch?v=example';
    case 'location':
      return 'Koszarawa, Gmina Milówka';
    default:
      return 'Przykładowa wartość';
  }
}
