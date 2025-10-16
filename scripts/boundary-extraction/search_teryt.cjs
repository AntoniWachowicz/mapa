const shapefile = require('shapefile');

async function searchByTeryt() {
  try {
    console.log('Opening shapefile...');
    const source = await shapefile.open('./gminy.shp', './gminy.dbf');

    console.log('Searching for TERYT 2417042 or similar patterns...');
    let featureCount = 0;

    while (true) {
      const result = await source.read();
      if (result.done) break;

      featureCount++;
      const feature = result.value;
      const props = feature.properties;

      // Search for TERYT code 2417042 or parts of it
      const codeFields = ['JPT_KOD_JE', 'JPT_KJ_I_1', 'REGON'];
      const hasMatchingCode = codeFields.some(field =>
        props[field] && (
          props[field].includes('2417042') ||
          props[field].includes('241704') ||
          props[field].includes('2417')
        )
      );

      // Also search for Żywiec area (powiat)
      const isZywiecArea = props.JPT_POWIER && (
        props.JPT_POWIER.includes('2417') ||
        props.JPT_POWIER === '2417'
      );

      if (hasMatchingCode || isZywiecArea) {
        console.log(`\n🎯 POTENTIAL MATCH (feature ${featureCount}):`);
        console.log('JPT_NAZWA_:', props.JPT_NAZWA_);
        console.log('JPT_KOD_JE:', props.JPT_KOD_JE);
        console.log('JPT_POWIER:', props.JPT_POWIER);
        console.log('REGON:', props.REGON);
        console.log('All properties:', props);
      }

      if (featureCount % 500 === 0) {
        console.log(`Processed ${featureCount} features...`);
      }
    }

    console.log(`\nFinished checking ${featureCount} features`);

    // Try one more search for any Silesian voivodship gminas
    console.log('\nSearching for Silesian voivodship gminas (12*)...');

    const source2 = await shapefile.open('./gminy.shp', './gminy.dbf');
    let count2 = 0;
    let silesianCount = 0;

    while (true) {
      const result = await source2.read();
      if (result.done) break;

      count2++;
      const feature = result.value;
      const props = feature.properties;

      // Look for Silesian voivodship codes (starting with 12 or 24)
      if (props.JPT_KOD_JE && (props.JPT_KOD_JE.startsWith('12') || props.JPT_KOD_JE.startsWith('24'))) {
        silesianCount++;
        if (silesianCount <= 10) { // Show first 10
          console.log(`Silesian gmina ${silesianCount}: ${props.JPT_NAZWA_} (${props.JPT_KOD_JE})`);
        }
      }
    }

    console.log(`\nFound ${silesianCount} Silesian gminas`);

  } catch (error) {
    console.error('Error:', error);
  }
}

searchByTeryt();