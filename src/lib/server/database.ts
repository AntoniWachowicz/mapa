import { MongoClient, type Db } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

// Validate environment variables at module load
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

let client: MongoClient;
let db: Db;
let connectionPromise: Promise<Db> | null = null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function connectToDatabase(): Promise<Db> {
  // Return cached db if already connected
  if (db) {
    return db;
  }

  // Return existing promise if connection is in progress
  // This prevents multiple simultaneous connection attempts
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection and cache the promise
  connectionPromise = (async () => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[DB] Connection attempt ${attempt}/${MAX_RETRIES}...`);
        const startTime = performance.now();

        client = new MongoClient(MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000
        });
        await client.connect();
        db = client.db();

        console.log(`[DB] Connected in ${(performance.now() - startTime).toFixed(0)}ms`);
        return db;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[DB] Connection attempt ${attempt} failed:`, lastError.message);

        if (attempt < MAX_RETRIES) {
          console.log(`[DB] Retrying in ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
        }
      }
    }

    // All retries failed
    connectionPromise = null;
    console.error('[DB] All connection attempts failed');
    throw lastError || new Error('Failed to connect to MongoDB');
  })();

  return connectionPromise;
}

// Graceful shutdown handler
export async function closeDatabase(): Promise<void> {
  if (client) {
    console.log('[DB] Closing MongoDB connection...');
    await client.close();
    connectionPromise = null;
  }
}