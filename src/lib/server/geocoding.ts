// Geocoding utilities for address/coordinates conversion

export interface GeocodingResult {
  lat: number;
  lng: number;
  address: string;
  confidence?: number;
}

// Free geocoding service using OpenStreetMap's Nominatim API
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    // Clean and format the address before geocoding
    const cleanedAddress = cleanAddressString(address);

    if (!cleanedAddress || cleanedAddress.length < 3) {
      console.error('Address too short or empty after cleaning');
      return null;
    }

    // Try geocoding with progressively simpler queries (fallback strategy)
    const queries = buildGeocodingQueries(cleanedAddress);

    console.log(`Geocoding attempts for "${cleanedAddress}":`, queries);

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`  Attempt ${i + 1}/${queries.length}: "${query}"`);

      const result = await tryGeocode(query);
      if (result) {
        console.log(`  ✓ Success on attempt ${i + 1}`);
        return result;
      }

      // Rate limiting - wait 500ms between attempts (except last one)
      if (i < queries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`  ✗ All ${queries.length} attempts failed`);
    return null;

  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Build multiple geocoding queries with fallback strategies
function buildGeocodingQueries(address: string): string[] {
  const queries: string[] = [];

  // Extract postal code if present
  const postalCodeMatch = address.match(/\b\d{2}-\d{3}\b/);
  const postalCode = postalCodeMatch ? postalCodeMatch[0] : null;

  // Remove postal code from address for cleaner parsing
  let addressWithoutPostal = address;
  if (postalCode) {
    addressWithoutPostal = address.replace(/\b\d{2}-\d{3}\b/g, '').replace(/\s+/g, ' ').trim();
  }

  // Extract place names (capitalize words, excluding common terms)
  const words = addressWithoutPostal.split(/[\s,;]+/).filter(w => w.length > 0);
  const placeWords = words.filter(w =>
    w.length > 2 &&
    /^[A-ZŁĄĆĘŃÓŚŹŻ]/i.test(w) && // Starts with letter
    !/^(ul|ulica|aleja|osiedle|plac|nr|polska|poland|kod|pocztowy)$/i.test(w)
  );

  // Strategy 1: POSTAL CODE FIRST (most reliable for Polish addresses)
  if (postalCode) {
    queries.push(postalCode);

    // Postal code + Poland for disambiguation
    queries.push(`${postalCode} Poland`);
  }

  // Strategy 2: Last word (usually gmina name)
  if (placeWords.length > 0) {
    const lastWord = placeWords[placeWords.length - 1];
    queries.push(lastWord);
    queries.push(`${lastWord}, Poland`);
    queries.push(`${lastWord}, Polska`);
  }

  // Strategy 3: First word (usually village or street)
  if (placeWords.length > 0) {
    const firstWord = placeWords[0];
    if (firstWord !== placeWords[placeWords.length - 1]) {
      queries.push(firstWord);
      queries.push(`${firstWord}, Poland`);
    }
  }

  // Strategy 4: Two-word combinations (Village + Gmina)
  if (placeWords.length >= 2) {
    // First + Last (most common: "Village Gmina")
    queries.push(`${placeWords[0]} ${placeWords[placeWords.length - 1]}`);
    queries.push(`${placeWords[0]}, ${placeWords[placeWords.length - 1]}, Poland`);

    // Try all consecutive pairs
    for (let i = 0; i < placeWords.length - 1; i++) {
      queries.push(`${placeWords[i]} ${placeWords[i + 1]}`);
    }
  }

  // Strategy 5: Full address without postal (cleaned)
  if (addressWithoutPostal && addressWithoutPostal.length > 3) {
    queries.push(addressWithoutPostal);
  }

  // Strategy 6: Original full address
  queries.push(address);

  // Remove duplicates while preserving order
  const seen = new Set();
  return queries.filter(q => {
    if (!q || q.length < 2 || seen.has(q)) return false;
    seen.add(q);
    return true;
  });
}

// Try to geocode a single query
async function tryGeocode(query: string): Promise<GeocodingResult | null> {
  try {
    const encodedAddress = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=pl&addressdetails=1&limit=3&accept-language=pl,en`;

    console.log(`    Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MapaApplication/1.0'
      }
    });

    if (!response.ok) {
      console.log(`    HTTP ${response.status}`);
      return null;
    }

    const results = await response.json();
    console.log(`    Results: ${results.length} found`);

    if (!results || results.length === 0) {
      return null;
    }

    const result = results[0];
    console.log(`    Best match: ${result.display_name} (type: ${result.type}, importance: ${result.importance})`);

    // Format address to be less specific
    const formattedAddress = formatSimpleAddress(result);

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: formattedAddress,
      confidence: parseFloat(result.importance || '0')
    };

  } catch (error) {
    console.error('Geocoding attempt failed:', error);
    return null;
  }
}

// Reverse geocoding - coordinates to address
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pl,en`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MapaApplication/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('Reverse geocoding API error:', response.status);
      return null;
    }
    
    const result = await response.json();
    
    if (!result || !result.display_name) {
      return null;
    }
    
    // Format address to be less specific  
    const formattedAddress = formatSimpleAddress(result);
    
    return {
      lat,
      lng,
      address: formattedAddress,
      confidence: parseFloat(result.importance || '0')
    };
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Clean and normalize address string for geocoding
export function cleanAddressString(address: string): string {
  if (!address) return '';

  let cleaned = address.trim();

  // Remove common field labels that might be in Excel data
  cleaned = cleaned.replace(/^(adres|address|lokalizacja|location|miejsce):\s*/gi, '');

  // Remove multiple consecutive spaces/newlines/tabs
  cleaned = cleaned.replace(/[\s\n\r\t]+/g, ' ');

  // Remove trailing commas or semicolons
  cleaned = cleaned.replace(/[,;]+$/g, '');

  // Expand common Polish abbreviations
  cleaned = cleaned.replace(/\bul\.\s*/gi, 'ulica ');
  cleaned = cleaned.replace(/\bal\.\s*/gi, 'aleja ');
  cleaned = cleaned.replace(/\bpl\.\s*/gi, 'plac ');
  cleaned = cleaned.replace(/\bos\.\s*/gi, 'osiedle ');

  // Handle postal codes - ensure they have proper format XX-XXX
  cleaned = cleaned.replace(/\b(\d{2})\s*[-]?\s*(\d{3})\b/g, '$1-$2');

  // If the address contains structured data separated by | or ; or newlines, join with comma
  if (cleaned.includes('|') || cleaned.includes(';') || cleaned.includes('\n')) {
    const parts = cleaned.split(/[|;\n]+/).map(p => p.trim()).filter(p => p.length > 0);
    cleaned = parts.join(', ');
  }

  // Remove any remaining special characters that might confuse geocoding
  cleaned = cleaned.replace(/[{}[\]]/g, '');

  return cleaned.trim();
}

// Format Polish address for better geocoding (legacy function)
export function formatPolishAddress(address: string): string {
  return cleanAddressString(address);
}

// Format address to be less specific (county, town, street only)
function formatSimpleAddress(result: any): string {
  const address = result.address || {};
  
  // Build simplified address from most specific to least specific
  const addressParts: string[] = [];
  
  // Street info (road, house_number)
  if (address.road) {
    let street = address.road;
    if (address.house_number) {
      street += ` ${address.house_number}`;
    }
    addressParts.push(street);
  }
  
  // Town/City (village, town, city, municipality)
  const townNames = [
    address.village,
    address.town, 
    address.city,
    address.municipality
  ].filter(Boolean);
  
  if (townNames.length > 0) {
    addressParts.push(townNames[0]);
  }
  
  // County (county, state_district)
  const countyNames = [
    address.county,
    address.state_district
  ].filter(Boolean);
  
  if (countyNames.length > 0) {
    // Clean up county name (remove "powiat" prefix if present)
    let county = countyNames[0];
    county = county.replace(/^powiat\s+/i, '');
    addressParts.push(county);
  }
  
  // If we have no structured address parts, fall back to display_name but simplified
  if (addressParts.length === 0) {
    const displayName = result.display_name || '';
    const parts = displayName.split(',').map((part: string) => part.trim());
    
    // Take first 3 parts (usually street, town, county)
    return parts.slice(0, 3).join(', ');
  }
  
  return addressParts.join(', ');
}