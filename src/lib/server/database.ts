import { MongoClient, type Db } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    console.log('Reusing existing database connection');
    return db;
  }

  try {
    console.log('Connecting to MongoDB with URI:', MONGODB_URI ? 'URI is set' : 'URI is NOT set');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB successfully');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}