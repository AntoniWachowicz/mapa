/**
 * Geocoding Service
 * Handles forward and reverse geocoding operations.
 */

export interface GeocodeResult {
  success: boolean;
  coordinates?: { lat: number; lng: number };
  formattedAddress?: string;
  error?: string;
}

export interface ReverseGeocodeResult {
  success: boolean;
  address?: string;
  error?: string;
}

/**
 * Geocode an address to coordinates
 * Calls the /api/geocode endpoint to convert an address to lat/lng
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address || !address.trim()) {
    return { success: false, error: 'Brak adresu do wyszukania' };
  }

  try {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address: address.trim() })
    });

    const result = await response.json();

    if (result.success && result.coordinates) {
      return {
        success: true,
        coordinates: result.coordinates,
        formattedAddress: result.formattedAddress
      };
    } else {
      return {
        success: false,
        error: result.error || 'Nie udało się znaleźć adresu'
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: 'Błąd podczas wyszukiwania adresu'
    };
  }
}

/**
 * Reverse geocode coordinates to an address
 * Calls the /api/reverse-geocode endpoint to convert lat/lng to an address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  try {
    const response = await fetch('/api/reverse-geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lat, lng })
    });

    const result = await response.json();

    if (result.success && result.address) {
      return {
        success: true,
        address: result.address
      };
    } else {
      return {
        success: false,
        error: result.error || 'Nie udało się znaleźć adresu'
      };
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: 'Błąd podczas wyszukiwania adresu'
    };
  }
}
