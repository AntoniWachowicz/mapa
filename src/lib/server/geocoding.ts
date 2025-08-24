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
    // Encode address for URL, handling Polish characters properly
    const encodedAddress = encodeURIComponent(address.trim());
    
    // Using Nominatim API with Polish language preference
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=pl&addressdetails=1&limit=1&accept-language=pl,en`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MapaApplication/1.0' // Required by Nominatim
      }
    });
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }
    
    const results = await response.json();
    
    if (!results || results.length === 0) {
      return null;
    }
    
    const result = results[0];
    
    // Format address to be less specific (county, town, street only)
    const formattedAddress = formatSimpleAddress(result);
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: formattedAddress,
      confidence: parseFloat(result.importance || '0')
    };
    
  } catch (error) {
    console.error('Geocoding error:', error);
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

// Format Polish address for better geocoding
export function formatPolishAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ') // Remove extra spaces
    .replace(/ul\./gi, 'ulica') // Expand ul. to ulica
    .replace(/al\./gi, 'aleja') // Expand al. to aleja
    .replace(/pl\./gi, 'plac'); // Expand pl. to plac
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