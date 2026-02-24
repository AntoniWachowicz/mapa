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
        client = new MongoClient(MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000
        });
        await client.connect();
        db = client.db();
        return db;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS);
        }
      }
    }

    // All retries failed
    connectionPromise = null;
    throw lastError || new Error('Failed to connect to MongoDB');
  })();

  return connectionPromise;
}

// Graceful shutdown handler
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    connectionPromise = null;
  }
}