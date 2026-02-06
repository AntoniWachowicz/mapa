import { json } from '@sveltejs/kit';
import { fullReset } from '$lib/server/resetdb.js';
import { logAudit, getClientInfo } from '$lib/server/audit.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    const result = await fullReset();

    // Audit log - critical operation
    await logAudit({
      action: 'database_reset',
      ...getClientInfo(event),
      details: { deletedPins: result.pins },
      success: true
    });

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
