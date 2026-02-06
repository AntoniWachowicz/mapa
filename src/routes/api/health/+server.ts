import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/server/database.js';

const startTime = Date.now();

export const GET: RequestHandler = async () => {
  let dbStatus = 'unknown';

  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  return json({
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: dbStatus,
    timestamp: new Date().toISOString()
  }, {
    status: dbStatus === 'connected' ? 200 : 503
  });
};
