import { json } from '@sveltejs/kit';
import { fullReset } from '$lib/server/resetdb.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
  try {
    const result = await fullReset();
    return json({
      success: true,
      message: `Usunięto ${result.pins} pinezek i zresetowano schemat`,
      pinsDeleted: result.pins
    });
  } catch (error) {
    console.error('Reset error:', error);
    return json(
      {
        success: false,
        error: 'Reset failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
