import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { reverseGeocode } from '$lib/server/geocoding.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { lat, lng } = await request.json();
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw error(400, 'Valid latitude and longitude are required');
    }
    
    const result = await reverseGeocode(lat, lng);
    
    if (!result) {
      return json({ 
        success: false, 
        error: 'Nie udało się znaleźć adresu dla podanych współrzędnych' 
      });
    }
    
    return json({
      success: true,
      address: result.address,
      confidence: result.confidence
    });
    
  } catch (err) {
    console.error('Reverse geocoding API error:', err);
    throw error(500, 'Błąd podczas odwrotnego geokodowania');
  }
};