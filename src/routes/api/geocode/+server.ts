import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { geocodeAddress, formatPolishAddress } from '$lib/server/geocoding.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      throw error(400, 'Address is required');
    }

    console.log('Geocoding API called with address:', address);

    // Format Polish address for better results
    const formattedAddress = formatPolishAddress(address);
    console.log('Formatted address:', formattedAddress);

    const result = await geocodeAddress(formattedAddress);

    if (!result) {
      console.log('Geocoding failed - no results');
      return json({
        success: false,
        error: 'Nie udało się znaleźć współrzędnych dla podanego adresu'
      });
    }

    console.log('Geocoding succeeded:', result);

    return json({
      success: true,
      data: {
        lat: result.lat,
        lng: result.lng,
        address: result.address,
        confidence: result.confidence
      }
    });

  } catch (err) {
    console.error('Geocoding API error:', err);
    throw error(500, 'Błąd podczas geokodowania adresu');
  }
};