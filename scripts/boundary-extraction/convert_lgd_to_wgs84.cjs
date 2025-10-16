const proj4 = require('proj4');
const fs = require('fs');
const path = require('path');

// Define coordinate systems
const polishCS92 = '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

// LGD Żywiecki Raj gminas
const LGD_GMINAS = [
  { name: 'Czernichów', varName: 'CZERNICHOW', fileName: 'czernichow' },
  { name: 'Gilowice', varName: 'GILOWICE', fileName: 'gilowice' },
  { name: 'Koszarawa', varName: 'KOSZARAWA', fileName: 'koszarawa' },
  { name: 'Lipowa', varName: 'LIPOWA', fileName: 'lipowa' },
  { name: 'Łękawica', varName: 'LEKAWICA', fileName: 'lekawica' },
  { name: 'Łodygowice', varName: 'LODYGOWICE', fileName: 'lodygowice' },
  { name: 'Milówka', varName: 'MILOWKA', fileName: 'milowka' },
  { name: 'Radziechowy-Wieprz', varName: 'RADZIECHOWY_WIEPRZ', fileName: 'radziechowy-wieprz' },
  { name: 'Rajcza', varName: 'RAJCZA', fileName: 'rajcza' },
  { name: 'Ślemień', varName: 'SLEMIEN', fileName: 'slemien' },
  { name: 'Świnna', varName: 'SWINNA', fileName: 'swinna' },
  { name: 'Ujsoły', varName: 'UJSOLY', fileName: 'ujsoly' },
  { name: 'Węgierska Górka', varName: 'WEGIERSKA_GORKA', fileName: 'wegierska-gorka' }
];

async function convertAll() {
  const regionsDir = path.join(__dirname, '..', '..', 'src', 'lib', 'boundaries', 'regions');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Converting LGD Żywiecki Raj boundaries to WGS84');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const gmina of LGD_GMINAS) {
    const inputPath = path.join(regionsDir, `${gmina.fileName}.geojson`);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${gmina.name} - file not found`);
      continue;
    }

    console.log(`\n🔄 Processing: ${gmina.name}`);
    console.log(`   Reading: ${gmina.fileName}.geojson`);

    // Read the GeoJSON file
    const geoJsonData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const originalCoords = geoJsonData.geometry.coordinates[0];

    console.log(`   Original coords: ${originalCoords.length}`);
    console.log(`   Sample original: [${originalCoords[0][0].toFixed(2)}, ${originalCoords[0][1].toFixed(2)}]`);

    // Convert coordinates from Polish CS92 to WGS84
    const convertedCoords = originalCoords.map(([x, y]) => {
      const [lng, lat] = proj4(polishCS92, wgs84, [x, y]);
      return [lng, lat];
    });

    console.log(`   Converted coords: ${convertedCoords.length}`);
    console.log(`   Sample WGS84: [${convertedCoords[0][0].toFixed(6)}, ${convertedCoords[0][1].toFixed(6)}]`);

    // Calculate bounds in WGS84
    let minLng = convertedCoords[0][0], maxLng = convertedCoords[0][0];
    let minLat = convertedCoords[0][1], maxLat = convertedCoords[0][1];

    convertedCoords.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    console.log(`   Bounds: ${minLat.toFixed(4)}°N to ${maxLat.toFixed(4)}°N, ${minLng.toFixed(4)}°E to ${maxLng.toFixed(4)}°E`);

    // Verify coordinates are reasonable for Poland
    if (minLat < 49.0 || maxLat > 55.0 || minLng < 14.0 || maxLng > 25.0) {
      console.log(`   ⚠️  WARNING: Coordinates outside expected Poland range!`);
    } else {
      console.log(`   ✓ Coordinates within Poland`);
    }

    // Create TypeScript boundary definition with WGS84 coordinates
    const boundaryDefinition = `// Gmina ${gmina.name} boundary - Part of LGD Żywiecki Raj
// Source: PRG (Państwowy Rejestr Granic) via gis-support.pl
// Original projection: EPSG:2180 (Poland CS92)
// Converted to: WGS84 (EPSG:4326) for web mapping
// Coordinate count: ${convertedCoords.length}
// Extracted: ${geoJsonData.properties.extracted || new Date().toISOString().split('T')[0]}

import type { GeoJSON } from '../../types.js';

export const ${gmina.varName}_BOUNDARY: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
${convertedCoords.map(coord => `    [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`).join(',\n')}
  ]]
};
`;

    // Save TypeScript file (overwrite the projected version)
    const tsOutputPath = path.join(regionsDir, `${gmina.fileName}.ts`);
    fs.writeFileSync(tsOutputPath, boundaryDefinition);
    console.log(`   ✅ Saved: ${gmina.fileName}.ts`);

    // Update GeoJSON file with WGS84 coordinates
    const geoJsonWgs84 = {
      type: 'Feature',
      properties: {
        ...geoJsonData.properties,
        crs: 'WGS84 (EPSG:4326)',
        converted: new Date().toISOString().split('T')[0]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [convertedCoords]
      }
    };

    const geojsonOutputPath = path.join(regionsDir, `${gmina.fileName}.geojson`);
    fs.writeFileSync(geojsonOutputPath, JSON.stringify(geoJsonWgs84, null, 2));
    console.log(`   ✅ Saved: ${gmina.fileName}.geojson`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CONVERSION COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\nConverted ${LGD_GMINAS.length} gminas to WGS84`);
  console.log('All boundaries are now ready for web mapping!');
  console.log('\nNext step: Register boundaries in ../../src/lib/boundaries/index.ts');
}

convertAll().catch(console.error);
