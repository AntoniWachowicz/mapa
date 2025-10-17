import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { lat, lng } = await request.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw error(400, 'Valid latitude and longitude are required');
    }

    // First, try exact reverse geocoding
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pl,en`;

    const reverseResponse = await fetch(reverseUrl, {
      headers: {
        'User-Agent': 'MapaApplication/1.0'
      }
    });

    if (!reverseResponse.ok) {
      console.error('Reverse geocoding API error:', reverseResponse.status);
      return json({
        success: false,
        error: 'Nie udało się znaleźć adresu dla podanych współrzędnych'
      });
    }

    const reverseResult = await reverseResponse.json();

    if (!reverseResult || !reverseResult.display_name) {
      return json({
        success: false,
        error: 'Nie udało się znaleźć adresu dla podanych współrzędnych'
      });
    }

    let addressData = reverseResult.address || {};

    // If we don't have a street or house number, try to find nearest address within 100m radius
    if (!addressData.road || !addressData.house_number) {
      console.log('No street/number found, searching nearby addresses...');

      // Search for nearby addresses within ~100m radius
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pl,en&limit=5&countrycodes=pl`;

      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'MapaApplication/1.0'
        }
      });

      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();

        // Find the closest result that has both road and house_number
        let closestWithAddress = null;
        let minDistance = Infinity;

        for (const candidate of searchResults) {
          if (candidate.address && candidate.address.road && candidate.address.house_number) {
            // Calculate distance from original point
            const candidateLat = parseFloat(candidate.lat);
            const candidateLon = parseFloat(candidate.lon);
            const distance = Math.sqrt(
              Math.pow(lat - candidateLat, 2) + Math.pow(lng - candidateLon, 2)
            );

            // Only consider results within ~100m (roughly 0.001 degrees)
            if (distance < 0.001 && distance < minDistance) {
              minDistance = distance;
              closestWithAddress = candidate;
            }
          }
        }

        // If we found a better address nearby, use it
        if (closestWithAddress) {
          console.log('Found nearby address:', closestWithAddress.display_name);
          addressData = closestWithAddress.address;
        }
      }
    }

    // Extract structured address components for Polish addresses
    const structuredAddress = {
      street: addressData.road || '',
      number: addressData.house_number || '',
      postalCode: addressData.postcode || '',
      city: addressData.village || addressData.town || addressData.city || addressData.municipality || '',
      gmina: addressData.municipality || addressData.county?.replace(/^powiat\s+/i, '') || ''
    };

    // Also provide simple formatted address for legacy support
    const addressParts: string[] = [];
    if (addressData.road) {
      let street = addressData.road;
      if (addressData.house_number) {
        street += ` ${addressData.house_number}`;
      }
      addressParts.push(street);
    }
    if (structuredAddress.city) {
      addressParts.push(structuredAddress.city);
    }

    return json({
      success: true,
      address: addressParts.join(', '), // Simple formatted address
      structuredAddress: structuredAddress, // Structured address data
      confidence: parseFloat(reverseResult.importance || '0')
    });

  } catch (err) {
    console.error('Reverse geocoding API error:', err);
    throw error(500, 'Błąd podczas odwrotnego geokodowania');
  }
};