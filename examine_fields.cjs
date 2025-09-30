const shapefile = require('shapefile');

async function examineFields() {
  try {
    console.log('Opening shapefile...');
    const source = await shapefile.open('./gminy.shp', './gminy.dbf');

    console.log('Getting first few features to see field names...');
    let count = 0;

    while (count < 5) {
      const result = await source.read();
      if (result.done) break;

      const feature = result.value;
      console.log(`\nFeature ${count + 1}:`);
      console.log('Properties:', Object.keys(feature.properties));
      console.log('Sample values:', feature.properties);

      count++;
    }

    // Now search for anything that might be Jeleśnia
    console.log('\nNow searching for features containing "jelesnia" or related terms...');

    const source2 = await shapefile.open('./gminy.shp', './gminy.dbf');
    let featureCount = 0;

    while (true) {
      const result = await source2.read();
      if (result.done) break;

      featureCount++;
      const feature = result.value;
      const props = feature.properties;

      // Convert all string values to lowercase for searching
      const allValues = Object.values(props).map(v =>
        typeof v === 'string' ? v.toLowerCase() : ''
      ).join(' ');

      if (allValues.includes('jeleśnia') || allValues.includes('jelesnia') || allValues.includes('żywiec')) {
        console.log(`\n🎯 POTENTIAL MATCH (feature ${featureCount}):`);
        console.log('Properties:', props);
      }

      if (featureCount % 500 === 0) {
        console.log(`Processed ${featureCount} features...`);
      }
    }

    console.log(`\nFinished checking ${featureCount} features`);

  } catch (error) {
    console.error('Error:', error);
  }
}

examineFields();