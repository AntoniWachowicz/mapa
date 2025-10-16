const shapefile = require('shapefile');
const proj4 = require('proj4');
const fs = require('fs');

// Define coordinate systems
const polishCS92 = '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

async function convertJelesnia() {
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

      if (props.JPT_KOD_JE === '2417042') {
        console.log('\n🎯 FOUND JELEŚNIA!');
        console.log('Name:', props.JPT_NAZWA_);
        console.log('Original coordinate count:', feature.geometry.coordinates[0].length);

        // Convert coordinates from Polish CS92 to WGS84
        const originalCoords = feature.geometry.coordinates[0];
        const convertedCoords = originalCoords.map(([x, y]) => {
          const [lng, lat] = proj4(polishCS92, wgs84, [x, y]);
          return [lng, lat];
        });

        console.log('Converted coordinate count:', convertedCoords.length);

        // Calculate bounds in WGS84
        let minLng = convertedCoords[0][0], maxLng = convertedCoords[0][0];
        let minLat = convertedCoords[0][1], maxLat = convertedCoords[0][1];

        convertedCoords.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });

        console.log('\nBoundary bounds (WGS84):');
        console.log(`SW: ${minLat.toFixed(6)}°N, ${minLng.toFixed(6)}°E`);
        console.log(`NE: ${maxLat.toFixed(6)}°N, ${maxLng.toFixed(6)}°E`);
        console.log(`Center: ${((minLat + maxLat) / 2).toFixed(6)}°N, ${((minLng + maxLng) / 2).toFixed(6)}°E`);
        console.log(`Size: ${((maxLng - minLng) * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180)).toFixed(1)}km × ${((maxLat - minLat) * 111).toFixed(1)}km`);

        // Check if coordinates are within Poland
        console.log(`Southernmost point: ${minLat.toFixed(6)}°N`);
        console.log(`Status: ${minLat > 49.0 ? 'WITHIN POLAND ✓' : 'OUTSIDE POLAND ✗'}`);

        // Show sample coordinates
        console.log('\nFirst 5 coordinates (WGS84):');
        convertedCoords.slice(0, 5).forEach((coord, i) => {
          console.log(`  [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}],`);
        });

        // Create TypeScript boundary definition
        const boundaryDefinition = `// Real Gmina Jeleśnia boundary - Official Polish government data converted to WGS84
// Source: PRG (Państwowy Rejestr Granic) via gis-support.pl
// TERYT: 2417042, Updated: 2022-12-22
// Original projection: EPSG:2180 (Poland CS92)
// Converted to: WGS84 (EPSG:4326)
// Coordinate count: ${convertedCoords.length}
export const ZYWIECKI_RAJ_BOUNDARY: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
${convertedCoords.map(coord => `    [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`).join(',\n')}
  ]]
};`;

        // Save boundary definition
        fs.writeFileSync('./jelesnia_boundary_wgs84.ts', boundaryDefinition);
        console.log('\n✅ Saved WGS84 TypeScript boundary definition to jelesnia_boundary_wgs84.ts');

        // Also save as GeoJSON
        const geoJson = {
          type: 'Feature',
          properties: {
            name: 'Gmina Jeleśnia',
            teryt: '2417042',
            source: 'PRG via gis-support.pl, converted to WGS84',
            coordinates: convertedCoords.length
          },
          geometry: {
            type: 'Polygon',
            coordinates: [convertedCoords]
          }
        };

        fs.writeFileSync('./jelesnia_boundary_wgs84.geojson', JSON.stringify(geoJson, null, 2));
        console.log('✅ Saved WGS84 GeoJSON to jelesnia_boundary_wgs84.geojson');

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

convertJelesnia();