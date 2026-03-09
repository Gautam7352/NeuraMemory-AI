import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/neuramemory';
let client: MongoClient;

/**
 * Singleton client for MongoDB connection management.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log('--- MongoDB Connected ---');
  }
  return client;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db();
}
