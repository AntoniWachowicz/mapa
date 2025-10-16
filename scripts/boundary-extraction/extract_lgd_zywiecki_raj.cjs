const shapefile = require('shapefile');
const fs = require('fs');
const path = require('path');

// LGD Żywiecki Raj gminas with TERYT codes
const LGD_GMINAS = [
  { name: 'Czernichów', teryt: '2417022', varName: 'CZERNICHOW' },
  { name: 'Gilowice', teryt: '2417032', varName: 'GILOWICE' },
  { name: 'Jeleśnia', teryt: '2417042', varName: 'JELESNIA', skip: true }, // Already extracted
  { name: 'Koszarawa', teryt: '2417052', varName: 'KOSZARAWA' },
  { name: 'Lipowa', teryt: '2417062', varName: 'LIPOWA' },
  { name: 'Łękawica', teryt: '2417072', varName: 'LEKAWICA' },
  { name: 'Łodygowice', teryt: '2417082', varName: 'LODYGOWICE' },
  { name: 'Milówka', teryt: '2417092', varName: 'MILOWKA' },
  { name: 'Radziechowy-Wieprz', teryt: '2417102', varName: 'RADZIECHOWY_WIEPRZ' },
  { name: 'Rajcza', teryt: '2417112', varName: 'RAJCZA' },
  { name: 'Ślemień', teryt: '2417122', varName: 'SLEMIEN' },
  { name: 'Świnna', teryt: '2417132', varName: 'SWINNA' },
  { name: 'Ujsoły', teryt: '2417142', varName: 'UJSOLY' },
  { name: 'Węgierska Górka', teryt: '2417152', varName: 'WEGIERSKA_GORKA' }
];

async function extractAllGminas() {
  try {
    const shapefilePath = path.join(__dirname, '..', '..', 'data', 'shapefiles', 'gminy.shp');
    const dbfPath = path.join(__dirname, '..', '..', 'data', 'shapefiles', 'gminy.dbf');

    console.log('Opening shapefile...');
    console.log('Path:', shapefilePath);

    const source = await shapefile.open(shapefilePath, dbfPath);

    console.log('\n🔍 Extracting boundaries for LGD Żywiecki Raj gminas...\n');

    const gminasToExtract = LGD_GMINAS.filter(g => !g.skip);
    const foundGminas = new Map();
    let featureCount = 0;

    while (true) {
      const result = await source.read();
      if (result.done) break;

      featureCount++;
      const feature = result.value;
      const props = feature.properties;

      // Check if this feature matches any of our gminas
      const gmina = gminasToExtract.find(g => props.JPT_KOD_JE === g.teryt);

      if (gmina && !foundGminas.has(gmina.teryt)) {
        console.log(`\n🎯 FOUND: ${gmina.name}`);
        console.log(`   TERYT: ${gmina.teryt}`);
        console.log(`   Geometry: ${feature.geometry.type}`);

        foundGminas.set(gmina.teryt, { gmina, feature });

        // If we found all gminas, we can stop early
        if (foundGminas.size === gminasToExtract.length) {
          console.log('\n✅ Found all gminas! Processing...');
          break;
        }
      }

      if (featureCount % 500 === 0) {
        console.log(`   Processed ${featureCount} features... (found ${foundGminas.size}/${gminasToExtract.length})`);
      }
    }

    console.log(`\n📊 Total features processed: ${featureCount}`);
    console.log(`📊 Gminas found: ${foundGminas.size}/${gminasToExtract.length}\n`);

    // Process each found gmina
    for (const [teryt, { gmina, feature }] of foundGminas) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Processing: ${gmina.name}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const coordinates = feature.geometry.coordinates[0];
      console.log(`Coordinate count: ${coordinates.length}`);

      // Calculate bounds
      let minLng = coordinates[0][0], maxLng = coordinates[0][0];
      let minLat = coordinates[0][1], maxLat = coordinates[0][1];

      coordinates.forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });

      console.log(`SW: ${minLat.toFixed(6)}°N, ${minLng.toFixed(6)}°E`);
      console.log(`NE: ${maxLat.toFixed(6)}°N, ${maxLng.toFixed(6)}°E`);
      console.log(`Center: ${((minLat + maxLat) / 2).toFixed(6)}°N, ${((minLng + maxLng) / 2).toFixed(6)}°E`);

      // Create filename-safe name
      const fileNameBase = gmina.name
        .toLowerCase()
        .replace(/ś/g, 's')
        .replace(/ł/g, 'l')
        .replace(/ó/g, 'o')
        .replace(/ą/g, 'a')
        .replace(/ę/g, 'e')
        .replace(/ć/g, 'c')
        .replace(/ń/g, 'n')
        .replace(/ź/g, 'z')
        .replace(/ż/g, 'z')
        .replace(/\s+/g, '-');

      // Create TypeScript boundary definition
      const boundaryDefinition = `// Gmina ${gmina.name} boundary - Part of LGD Żywiecki Raj
// Source: PRG (Państwowy Rejestr Granic) via gis-support.pl
// TERYT: ${gmina.teryt}
// Coordinate count: ${coordinates.length}
// Extracted: ${new Date().toISOString().split('T')[0]}

import type { GeoJSON } from '../../types.js';

export const ${gmina.varName}_BOUNDARY: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
${coordinates.map(coord => `    [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`).join(',\n')}
  ]]
};
`;

      // Save TypeScript file
      const tsFileName = `${fileNameBase}.ts`;
      fs.writeFileSync(path.join(__dirname, tsFileName), boundaryDefinition);
      console.log(`✅ Saved: ${tsFileName}`);

      // Also save as GeoJSON
      const geoJson = {
        type: 'Feature',
        properties: {
          name: `Gmina ${gmina.name}`,
          teryt: gmina.teryt,
          lgd: 'Żywiecki Raj',
          source: 'PRG via gis-support.pl',
          extracted: new Date().toISOString().split('T')[0]
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      };

      const geojsonFileName = `${fileNameBase}.geojson`;
      fs.writeFileSync(
        path.join(__dirname, geojsonFileName),
        JSON.stringify(geoJson, null, 2)
      );
      console.log(`✅ Saved: ${geojsonFileName}`);
    }

    // List any gminas not found
    const notFound = gminasToExtract.filter(g => !foundGminas.has(g.teryt));
    if (notFound.length > 0) {
      console.log(`\n⚠️  Not found (${notFound.length}):`);
      notFound.forEach(g => console.log(`   - ${g.name} (${g.teryt})`));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EXTRACTION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nExtracted ${foundGminas.size} gminas`);
    console.log('\nNext steps:');
    console.log('1. Move generated .ts files to ../../src/lib/boundaries/regions/');
    console.log('2. Move generated .geojson files to ../../src/lib/boundaries/regions/');
    console.log('3. Register boundaries in ../../src/lib/boundaries/index.ts');

  } catch (error) {
    console.error('Error:', error);
  }
}

extractAllGminas();
