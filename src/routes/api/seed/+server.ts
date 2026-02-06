import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { connectToDatabase } from '$lib/server/database.js';
import type { Template, GeoJSON, Field, ProjectData, PriceData, FundingSource, MultiDateData, MultiDateConfig, Tag, CategoryFieldData, TagConfig, SelectionConfig } from '$lib/types.js';

// Import all LGD Żywiecki Raj boundaries
import { CZERNICHOW_BOUNDARY } from '$lib/boundaries/regions/czernichow.js';
import { GILOWICE_BOUNDARY } from '$lib/boundaries/regions/gilowice.js';
import { ZYWIECKI_RAJ_BOUNDARY as JELESNIA_BOUNDARY } from '$lib/boundaries/regions/zywiecki-raj.js';
import { KOSZARAWA_BOUNDARY } from '$lib/boundaries/regions/koszarawa.js';
import { LEKAWICA_BOUNDARY } from '$lib/boundaries/regions/lekawica.js';
import { LIPOWA_BOUNDARY } from '$lib/boundaries/regions/lipowa.js';
import { LODYGOWICE_BOUNDARY } from '$lib/boundaries/regions/lodygowice.js';
import { MILOWKA_BOUNDARY } from '$lib/boundaries/regions/milowka.js';
import { RADZIECHOWY_WIEPRZ_BOUNDARY } from '$lib/boundaries/regions/radziechowy-wieprz.js';
import { RAJCZA_BOUNDARY } from '$lib/boundaries/regions/rajcza.js';
import { SLEMIEN_BOUNDARY } from '$lib/boundaries/regions/slemien.js';
import { SWINNA_BOUNDARY } from '$lib/boundaries/regions/swinna.js';
import { UJSOLY_BOUNDARY } from '$lib/boundaries/regions/ujsoly.js';
import { WEGIERSKA_GORKA_BOUNDARY } from '$lib/boundaries/regions/wegierska-gorka.js';

// All gminas in LGD Żywiecki Raj
const GMINAS = [
  { name: 'Czernichów', polygon: CZERNICHOW_BOUNDARY },
  { name: 'Gilowice', polygon: GILOWICE_BOUNDARY },
  { name: 'Jeleśnia', polygon: JELESNIA_BOUNDARY },
  { name: 'Koszarawa', polygon: KOSZARAWA_BOUNDARY },
  { name: 'Łękawica', polygon: LEKAWICA_BOUNDARY },
  { name: 'Lipowa', polygon: LIPOWA_BOUNDARY },
  { name: 'Łodygowice', polygon: LODYGOWICE_BOUNDARY },
  { name: 'Miłówka', polygon: MILOWKA_BOUNDARY },
  { name: 'Radziechowy-Wieprz', polygon: RADZIECHOWY_WIEPRZ_BOUNDARY },
  { name: 'Rajcza', polygon: RAJCZA_BOUNDARY },
  { name: 'Ślemień', polygon: SLEMIEN_BOUNDARY },
  { name: 'Świnna', polygon: SWINNA_BOUNDARY },
  { name: 'Ujsoły', polygon: UJSOLY_BOUNDARY },
  { name: 'Węgierska Górka', polygon: WEGIERSKA_GORKA_BOUNDARY }
];

// Helper function to check if point is inside polygon
function isPointInPolygon(lat: number, lng: number, polygon: GeoJSON.Polygon): boolean {
  const x = lng;
  const y = lat;
  const coords = polygon.coordinates[0];
  let inside = false;

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0];
    const yi = coords[i][1];
    const xj = coords[j][0];
    const yj = coords[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

// Calculate bounds for a polygon
function getPolygonBounds(polygon: GeoJSON.Polygon) {
  const coords = polygon.coordinates[0];
  let minLat = coords[0][1], maxLat = coords[0][1];
  let minLng = coords[0][0], maxLng = coords[0][0];

  for (const [lng, lat] of coords) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

// Generate random coordinate within a specific gmina
function generateCoordinateInGmina(gminaPolygon: GeoJSON.Polygon): [number, number] {
  const bounds = getPolygonBounds(gminaPolygon);
  let lat: number, lng: number;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
    lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
    attempts++;
  } while (!isPointInPolygon(lat, lng, gminaPolygon) && attempts < maxAttempts);

  return [lat, lng];
}

// Define category tags
const CATEGORY_TAGS: Tag[] = [
  {
    id: 'cat_infrastruktura',
    name: 'Infrastruktura',
    displayName: 'Infrastruktura',
    color: '#3B82F6',
    order: 0,
    visible: true
  },
  {
    id: 'cat_turystyka',
    name: 'Turystyka',
    displayName: 'Turystyka',
    color: '#10B981',
    order: 1,
    visible: true
  },
  {
    id: 'cat_kultura',
    name: 'Kultura',
    displayName: 'Kultura',
    color: '#8B5CF6',
    order: 2,
    visible: true
  },
  {
    id: 'cat_gospodarka',
    name: 'Gospodarka',
    displayName: 'Gospodarka',
    color: '#F59E0B',
    order: 3,
    visible: true
  },
  {
    id: 'cat_rolnictwo',
    name: 'Rolnictwo',
    displayName: 'Rolnictwo',
    color: '#84CC16',
    order: 4,
    visible: true
  },
  {
    id: 'cat_edukacja',
    name: 'Edukacja',
    displayName: 'Edukacja',
    color: '#EC4899',
    order: 5,
    visible: true
  }
];

// LGD Schema Template with proper NEW field types
const LGD_SCHEMA: Template = {
  version: 2,
  fields: [
    {
      id: 'field_title',
      fieldType: 'title',
      fieldName: 'title',
      key: 'title',
      label: 'Nazwa Projektu',
      displayLabel: 'Nazwa Projektu',
      type: 'text',
      required: true,
      visible: true,
      protected: true,
      adminVisible: true,
      order: 0
    },
    {
      id: 'field_location',
      fieldType: 'location',
      fieldName: 'location',
      key: 'location',
      label: 'Lokalizacja',
      displayLabel: 'Lokalizacja',
      type: 'text',
      required: true,
      visible: true,
      protected: true,
      adminVisible: true,
      order: 1
    },
    {
      id: 'field_description',
      fieldType: 'richtext',
      fieldName: 'description',
      key: 'description',
      label: 'Opis Projektu',
      displayLabel: 'Opis Projektu',
      type: 'textarea',
      required: false,
      visible: true,
      protected: false,
      adminVisible: true,
      order: 2
    },
    {
      id: 'field_beneficiary',
      fieldType: 'richtext',
      fieldName: 'beneficiary',
      key: 'beneficiary',
      label: 'Beneficjent',
      displayLabel: 'Beneficjent',
      type: 'text',
      required: false,
      visible: true,
      protected: false,
      adminVisible: true,
      order: 3
    },
    {
      id: 'field_category',
      fieldType: 'category',
      fieldName: 'category',
      key: 'category',
      label: 'Kategoria Projektu',
      displayLabel: 'Kategoria Projektu',
      type: 'category',
      required: false,
      visible: true,
      protected: false,
      adminVisible: true,
      order: 4,
      tagConfig: {
        maxMinorTags: 2,
        allowMultiple: true
      }
    },
    {
      id: 'field_status',
      fieldType: 'selection',
      fieldName: 'status',
      key: 'status',
      label: 'Status Projektu',
      displayLabel: 'Status Projektu',
      type: 'text',
      required: false,
      visible: true,
      protected: false,
      adminVisible: true,
      order: 5,
      config: {
        mode: 'single',
        options: [
          { id: 'zakończony', value: 'Zakończony', order: 0 },
          { id: 'w_trakcie', value: 'W trakcie realizacji', order: 1 },
          { id: 'planowany', value: 'Planowany', order: 2 },
          { id: 'zawieszony', value: 'Zawieszony', order: 3 }
        ],
        allowCustom: false
      } as SelectionConfig
    },
    {
      id: 'field_funding',
      fieldType: 'price',
      fieldName: 'funding',
      key: 'funding',
      label: 'Finansowanie Projektu',
      displayLabel: 'Finansowanie Projektu',
      type: 'price',
      required: false,
      visible: true,
      protected: false,
      adminVisible: true,
      order: 6,
      config: {
        currency: 'PLN',
        defaultFundingSources: ['UE - PROW', 'Budżet krajowy', 'Wkład własny'],
        showPercentages: true,
        showTotal: true
      }
    },
    {
      id: 'field_project_dates',
      fieldType: 'multidate',
      fieldName: 'project_dates',
      key: 'project_dates',
      label: 'Daty Realizacji Projektu',
      displayLabel: 'Daty Realizacji Projektu',
      type: 'multidate',
      required: false,
      visible: true,
      protected: false,
      adminVisible: true,
      order: 7,
      config: {
        dateFields: [
          { key: 'start_date', label: 'Data Rozpoczęcia', required: false },
          { key: 'end_date', label: 'Data Zakończenia', required: false }
        ],
        layout: 'horizontal'
      } as MultiDateConfig
    },
    {
      id: 'field_contact',
      fieldType: 'richtext',
      fieldName: 'contact',
      key: 'contact',
      label: 'Kontakt',
      displayLabel: 'Kontakt',
      type: 'text',
      required: false,
      visible: true,
      protected: false,
      adminVisible: true,
      order: 8
    }
  ],
  tags: CATEGORY_TAGS
};

// Project templates by category
const PROJECT_TEMPLATES = {
  Infrastruktura: [
    'Modernizacja drogi gminnej w {gmina}',
    'Budowa placu zabaw w {gmina}',
    'Remont świetlicy wiejskiej w {gmina}',
    'Budowa chodnika w {gmina}',
    'Modernizacja oświetlenia ulicznego w {gmina}',
    'Budowa parkingu w centrum {gmina}',
    'Remont dachu budynku OSP w {gmina}',
    'Budowa siłowni plenerowej w {gmina}',
    'Modernizacja stacji uzdatniania wody w {gmina}',
    'Budowa przystanku autobusowego w {gmina}'
  ],
  Turystyka: [
    'Budowa szlaku turystycznego w {gmina}',
    'Oznakowanie szlaku rowerowego w {gmina}',
    'Budowa punktu widokowego w {gmina}',
    'Remont schroniska turystycznego w {gmina}',
    'Budowa tablicy informacyjnej w {gmina}',
    'Oznakowanie szlaku narciarskiego w {gmina}',
    'Budowa wiaty turystycznej w {gmina}',
    'Zagospodarowanie terenu rekreacyjnego w {gmina}',
    'Budowa trasy nordic walking w {gmina}',
    'Remont mostku na szlaku w {gmina}'
  ],
  Kultura: [
    'Remont zabytkowego kościoła w {gmina}',
    'Odnowa centrum wsi w {gmina}',
    'Remont budynku muzeum w {gmina}',
    'Restauracja pomnika w {gmina}',
    'Budowa sceny plenerowej w {gmina}',
    'Remont domu kultury w {gmina}',
    'Digitalizacja archiwum w {gmina}',
    'Remont zabytkowej kapliczki w {gmina}',
    'Budowa izby regionalnej w {gmina}',
    'Remont cmentarza wojennego w {gmina}'
  ],
  Gospodarka: [
    'Wsparcie dla lokalnych producentów w {gmina}',
    'Budowa targowiska gminnego w {gmina}',
    'Wsparcie dla lokalnych rzemieślników w {gmina}',
    'Budowa warsztatów rękodzielniczych w {gmina}',
    'Utworzenie punktu sprzedaży produktów lokalnych w {gmina}',
    'Wsparcie dla agroturystyki w {gmina}',
    'Budowa infrastruktury dla przedsiębiorców w {gmina}',
    'Promocja produktów lokalnych z {gmina}',
    'Szkolenia dla producentów żywności w {gmina}',
    'Budowa magazynu produktów lokalnych w {gmina}'
  ],
  Rolnictwo: [
    'Modernizacja gospodarstwa rolnego w {gmina}',
    'Budowa tunelu foliowego w {gmina}',
    'Zakup maszyn rolniczych w {gmina}',
    'Budowa zadaszenia dla bydła w {gmina}',
    'Modernizacja systemu nawadniania w {gmina}',
    'Budowa ogrodzenia pastwisk w {gmina}',
    'Zakup sprzętu do przetwórstwa mleka w {gmina}',
    'Budowa magazynu rolniczego w {gmina}',
    'Modernizacja suszarni siana w {gmina}',
    'Budowa zagrody edukacyjnej w {gmina}'
  ],
  Edukacja: [
    'Modernizacja biblioteki gminnej w {gmina}',
    'Budowa świetlicy środowiskowej w {gmina}',
    'Wyposażenie sali komputerowej w {gmina}',
    'Budowa boiska sportowego przy szkole w {gmina}',
    'Remont przedszkola w {gmina}',
    'Budowa sali gimnastycznej w {gmina}',
    'Wyposażenie pracowni przyrodniczej w {gmina}',
    'Budowa pracowni rękodzieła w {gmina}',
    'Modernizacja stołówki szkolnej w {gmina}',
    'Budowa centrum edukacji ekologicznej w {gmina}'
  ]
};

const BENEFICIARIES = [
  'Gmina',
  'Stowarzyszenie Mieszkańców',
  'Parafia',
  'OSP',
  'Szkoła Podstawowa',
  'LGD Żywiecki Raj',
  'Grupa producentów',
  'Przedsiębiorca lokalny',
  'Gospodarstwo agroturystyczne',
  'Koło Gospodyń Wiejskich'
];

// Map category names to tag IDs
const CATEGORY_TO_TAG_ID: Record<string, string> = {
  'Infrastruktura': 'cat_infrastruktura',
  'Turystyka': 'cat_turystyka',
  'Kultura': 'cat_kultura',
  'Gospodarka': 'cat_gospodarka',
  'Rolnictwo': 'cat_rolnictwo',
  'Edukacja': 'cat_edukacja'
};

function generateProject(category: string, gmina: typeof GMINAS[0]): { location: GeoJSON.Point; data: ProjectData } {
  const templates = PROJECT_TEMPLATES[category as keyof typeof PROJECT_TEMPLATES];
  const template = templates[Math.floor(Math.random() * templates.length)];

  const title = template.replace('{gmina}', gmina.name);

  // Generate random value based on category
  let minValue = 50000;
  let maxValue = 200000;

  if (category === 'Infrastruktura' || category === 'Turystyka') {
    minValue = 200000;
    maxValue = 1000000;
  } else if (category === 'Kultura') {
    minValue = 100000;
    maxValue = 800000;
  }

  const totalValue = Math.floor(Math.random() * (maxValue - minValue) + minValue);

  // Generate funding breakdown using PROW typical distribution
  const euPercentage = Math.random() > 0.5 ? 63.63 : (Math.random() > 0.5 ? 80 : 85);
  const euAmount = Math.round(totalValue * euPercentage / 100);

  const nationalPercentage = Math.random() > 0.5 ? 26.37 : 15;
  const nationalAmount = Math.round(totalValue * nationalPercentage / 100);

  const beneficiaryAmount = totalValue - euAmount - nationalAmount;
  const beneficiaryPercentage = Math.round((beneficiaryAmount / totalValue) * 100 * 100) / 100;

  const funding: FundingSource[] = [
    { source: 'UE - PROW', amount: euAmount, percentage: euPercentage },
    { source: 'Budżet krajowy', amount: nationalAmount, percentage: nationalPercentage },
    { source: 'Wkład własny', amount: beneficiaryAmount, percentage: beneficiaryPercentage }
  ];

  const fundingData: PriceData = {
    total: totalValue,
    currency: 'PLN',
    funding,
    showTotal: true,
    showBreakdown: true
  };

  // Generate status with realistic distribution
  const statusRand = Math.random();
  let status: string;
  if (statusRand < 0.6) {
    status = 'Zakończony';
  } else if (statusRand < 0.85) {
    status = 'W trakcie realizacji';
  } else if (statusRand < 0.95) {
    status = 'Planowany';
  } else {
    status = 'Zawieszony';
  }

  // Generate dates using multidate format
  const year = 2015 + Math.floor(Math.random() * 10);
  const startMonth = 1 + Math.floor(Math.random() * 12);
  const duration = 6 + Math.floor(Math.random() * 18); // 6-24 months
  const endYear = year + Math.floor((startMonth + duration) / 12);
  const endMonth = ((startMonth + duration - 1) % 12) + 1;

  const project_dates: MultiDateData = {
    start_date: new Date(`${year}-${startMonth.toString().padStart(2, '0')}-01`),
    end_date: new Date(`${endYear}-${endMonth.toString().padStart(2, '0')}-${(15 + Math.floor(Math.random() * 13)).toString().padStart(2, '0')}`)
  };

  const [lat, lng] = generateCoordinateInGmina(gmina.polygon);

  const beneficiary = BENEFICIARIES[Math.floor(Math.random() * BENEFICIARIES.length)];

  // Generate realistic descriptions
  const descriptions = [
    `Projekt ma na celu poprawę jakości życia mieszkańców ${gmina.name} poprzez realizację inwestycji infrastrukturalnej. Projekt współfinansowany ze środków Unii Europejskiej w ramach Programu Rozwoju Obszarów Wiejskich.`,
    `Realizacja projektu pozwoli na modernizację infrastruktury w gminie ${gmina.name} i zwiększenie dostępności usług dla mieszkańców. Inwestycja wpisuje się w strategię rozwoju LGD Żywiecki Raj.`,
    `Celem projektu jest poprawa warunków życia mieszkańców ${gmina.name}, co znacząco wpłynie na rozwój turystyki i gospodarki lokalnej. Projekt został pozytywnie oceniony przez społeczność lokalną.`,
    `W ramach projektu zostanie zrealizowana inwestycja w gminie ${gmina.name}. Projekt odpowiada na potrzeby zidentyfikowane w Lokalnej Strategii Rozwoju.`,
    `Projekt przyczyni się do zachowania dziedzictwa kulturowego i przyrodniczego regionu ${gmina.name}. Planowane działania zwiększą atrakcyjność turystyczną obszaru.`
  ];

  const description = descriptions[Math.floor(Math.random() * descriptions.length)];

  // Create CategoryFieldData for the category field
  const majorTagId = CATEGORY_TO_TAG_ID[category];
  const minorTags: string[] = [];

  // Randomly add 0-2 minor tags from other categories
  const otherTagIds = CATEGORY_TAGS
    .filter(tag => tag.id !== majorTagId)
    .map(tag => tag.id);

  const numMinorTags = Math.floor(Math.random() * 3); // 0, 1, or 2
  for (let i = 0; i < numMinorTags && otherTagIds.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * otherTagIds.length);
    minorTags.push(otherTagIds[randomIndex]);
    otherTagIds.splice(randomIndex, 1);
  }

  const categoryData: CategoryFieldData = {
    majorTag: majorTagId,
    minorTags
  };

  return {
    location: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    data: {
      title,
      description,
      beneficiary,
      category: categoryData,
      status,
      funding: fundingData,
      project_dates,
      contact: Math.random() > 0.7 ? 'biuro@lgd-zywieckiraj.pl' : ''
    }
  };
}

export const POST: RequestHandler = async ({ url, locals }) => {
  // Check authentication
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const clear = url.searchParams.get('clear') === 'true';

  try {
    const db = await connectToDatabase();
    const settingsCollection = db.collection('settings');
    const objectsCollection = db.collection('objects');

    // Check current state
    const currentCount = await objectsCollection.countDocuments();

    // If data exists and not forcing clear, return current state
    if (currentCount > 0 && !clear) {
      return json({
        success: false,
        message: 'Database already contains data',
        currentCount,
        hint: 'Use ?clear=true to clear and reseed'
      });
    }

    // Clear existing data if requested
    if (clear && currentCount > 0) {
      await objectsCollection.deleteMany({});
      await settingsCollection.deleteMany({ type: 'template' });
    }

    // Insert schema template
    await settingsCollection.updateOne(
      { type: 'template' },
      { $set: { type: 'template', template: LGD_SCHEMA } },
      { upsert: true }
    );

    // Generate projects distributed across all gminas
    const projects: any[] = [];
    const distribution = {
      Infrastruktura: 40,
      Turystyka: 30,
      Kultura: 25,
      Gospodarka: 25,
      Rolnictwo: 20,
      Edukacja: 20
    };

    // Distribute projects evenly across gminas
    for (const [category, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        // Select gmina in round-robin fashion to ensure even distribution
        const gmina = GMINAS[i % GMINAS.length];
        const project = generateProject(category, gmina);
        projects.push({
          location: project.location,
          data: project.data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // Shuffle projects to avoid having all categories clustered by gmina
    for (let i = projects.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [projects[i], projects[j]] = [projects[j], projects[i]];
    }

    // Insert all projects
    await objectsCollection.insertMany(projects);

    return json({
      success: true,
      message: 'Database seeded successfully',
      created: projects.length,
      distribution,
      gminas: GMINAS.length,
      cleared: clear ? currentCount : 0
    });

  } catch (err) {
    console.error('Seed error:', err);
    throw error(500, 'Failed to seed database');
  }
};
