const shapefile = require('shapefile');
const fs = require('fs');

async function extractJelesnia() {
  try {
    console.log('Opening shapefile...');
    const source = await shapefile.open('./gminy.shp', './gminy.dbf');

    console.log('Searching for Jeleśnia (TERYT: 2417042)...');
    let featureCount = 0;

    while (true) {
      const result = await source.read();
      if (result.done) break;

      featureCount++;
      const feature = result.value;
      const props = feature.properties;

      // Look for the exact TERYT code
      if (props.JPT_KOD_JE === '2417042') {
        console.log('\n🎯 FOUND JELEŚNIA!');
        console.log('Name:', props.JPT_NAZWA_);
        console.log('TERYT:', props.JPT_KOD_JE);
        console.log('Geometry type:', feature.geometry.type);

        // Extract coordinates
        const coordinates = feature.geometry.coordinates[0];
        console.log('Coordinate count:', coordinates.length);

        // Calculate bounds
        let minLng = coordinates[0][0], maxLng = coordinates[0][0];
        let minLat = coordinates[0][1], maxLat = coordinates[0][1];

        coordinates.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });

        console.log('\nBoundary bounds:');
        console.log(`SW: ${minLat.toFixed(6)}°N, ${minLng.toFixed(6)}°E`);
        console.log(`NE: ${maxLat.toFixed(6)}°N, ${maxLng.toFixed(6)}°E`);
        console.log(`Center: ${((minLat + maxLat) / 2).toFixed(6)}°N, ${((minLng + maxLng) / 2).toFixed(6)}°E`);
        console.log(`Size: ${((maxLng - minLng) * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180)).toFixed(1)}km × ${((maxLat - minLat) * 111).toFixed(1)}km`);

        // Check if coordinates are within Poland
        const southernmostLat = Math.min(...coordinates.map(coord => coord[1]));
        console.log(`Southernmost point: ${southernmostLat.toFixed(6)}°N`);
        console.log(`Status: ${southernmostLat > 49.0 ? 'WITHIN POLAND ✓' : 'OUTSIDE POLAND ✗'}`);

        // Show first and last few coordinates
        console.log('\nFirst 10 coordinates:');
        coordinates.slice(0, 10).forEach((coord, i) => {
          console.log(`  [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}],`);
        });

        console.log('\nLast 10 coordinates:');
        coordinates.slice(-10).forEach((coord, i) => {
          console.log(`  [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}],`);
        });

        // Create TypeScript boundary definition
        const boundaryDefinition = `// Real Gmina Jeleśnia boundary - Extracted from official Polish government data
// Source: PRG (Państwowy Rejestr Granic) via gis-support.pl
// TERYT: 2417042, Updated: 2022-12-22
// Coordinate count: ${coordinates.length}
export const ZYWIECKI_RAJ_BOUNDARY: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
${coordinates.map(coord => `    [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`).join(',\n')}
  ]]
};`;

        // Save boundary definition
        fs.writeFileSync('./jelesnia_boundary_real.ts', boundaryDefinition);
        console.log('\n✅ Saved TypeScript boundary definition to jelesnia_boundary_real.ts');

        // Also save as GeoJSON
        const geoJson = {
          type: 'Feature',
          properties: {
            name: 'Gmina Jeleśnia',
            teryt: '2417042',
            source: 'PRG via gis-support.pl'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        };

        fs.writeFileSync('./jelesnia_boundary_real.geojson', JSON.stringify(geoJson, null, 2));
        console.log('✅ Saved GeoJSON boundary to jelesnia_boundary_real.geojson');

        return;
      }

      if (featureCount % 500 === 0) {
        console.log(`Processed ${featureCount} features...`);
      }
    }

    console.log(`\n❌ Jeleśnia not found after checking ${featureCount} features`);

  } catch (error) {
    console.error('Error:', error);
  }
}

extractJelesnia();