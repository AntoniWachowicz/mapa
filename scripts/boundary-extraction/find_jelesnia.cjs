const shapefile = require('shapefile');

async function findJelesnia() {
  try {
    console.log('Opening shapefile...');
    const source = await shapefile.open('./gminy.shp', './gminy.dbf');

    console.log('Searching for Jeleśnia...');
    let featureCount = 0;

    while (true) {
      const result = await source.read();
      if (result.done) break;

      featureCount++;
      const feature = result.value;
      const props = feature.properties;

      // Check if this is Jeleśnia
      const nameFields = ['NAZ_DOD', 'JPT_NAZWA_', 'NAZ_GUG', 'NAZWA'];
      const isJelesnia = nameFields.some(field =>
        props[field] && props[field].toLowerCase().includes('jeleśnia')
      );

      if (isJelesnia) {
        console.log('\n🎯 FOUND JELEŚNIA!');
        console.log('Properties:', JSON.stringify(props, null, 2));
        console.log('\nGeometry type:', feature.geometry.type);
        console.log('Coordinate count:', feature.geometry.coordinates[0].length);

        // Save the coordinates
        const coordinates = feature.geometry.coordinates[0];
        console.log('\nFirst 5 coordinates:');
        coordinates.slice(0, 5).forEach((coord, i) => {
          console.log(`  ${i}: [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`);
        });

        console.log('\nLast 5 coordinates:');
        coordinates.slice(-5).forEach((coord, i) => {
          console.log(`  ${coordinates.length - 5 + i}: [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`);
        });

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

        // Save to file
        const fs = require('fs');
        const geoJson = {
          type: 'Polygon',
          coordinates: [coordinates]
        };

        fs.writeFileSync('./jelesnia_boundary.json', JSON.stringify(geoJson, null, 2));
        console.log('\n✅ Saved coordinates to jelesnia_boundary.json');

        return;
      }

      // Progress indicator
      if (featureCount % 500 === 0) {
        console.log(`Processed ${featureCount} features...`);
      }
    }

    console.log(`\n❌ Jeleśnia not found after checking ${featureCount} features`);
    console.log('Try checking the field names in the shapefile...');

  } catch (error) {
    console.error('Error:', error);
  }
}

findJelesnia();