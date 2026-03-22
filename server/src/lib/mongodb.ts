import { Db, MongoClient } from 'mongodb';
import { env } from '../config/env.js';

const uri = env.MONGODB_URI;

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const c = new MongoClient(uri);
    clientPromise = c.connect().then(() => {
      console.log('--- MongoDB Connected ---');
      return c;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const mongoClient = await getMongoClient();
  return mongoClient.db();
}
