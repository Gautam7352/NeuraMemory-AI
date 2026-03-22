import { WithId } from 'mongodb';
import { getDb } from '../lib/mongodb.js';
import { IUser } from '../types/auth.types.js';

const COLLECTION = 'users';

export async function ensureUserIndexes(): Promise<void> {
  const db = await getDb();
  await db
    .collection<IUser>(COLLECTION)
    .createIndex({ email: 1 }, { unique: true });
}

export async function findUserByEmail(
  email: string,
): Promise<WithId<IUser> | null> {
  const db = await getDb();
  return db.collection<IUser>(COLLECTION).findOne({ email });
}

export async function findUserByApiKey(
  apiKey: string,
): Promise<WithId<IUser> | null> {
  const db = await getDb();
  return db.collection<IUser>(COLLECTION).findOne({ apiKey });
}

export async function findUserById(id: string): Promise<WithId<IUser> | null> {
  const { ObjectId } = await import('mongodb');
  const db = await getDb();
  return db.collection<IUser>(COLLECTION).findOne({ _id: new ObjectId(id) });
}

export async function createUser(
  email: string,
  passwordHash: string,
): Promise<WithId<IUser>> {
  const db = await getDb();
  const now = new Date();

  const user: IUser = {
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<IUser>(COLLECTION).insertOne(user);

  return { _id: result.insertedId, ...user };
}

export async function updateUserApiKey(
  id: string,
  apiKey: string,
): Promise<void> {
  const { ObjectId } = await import('mongodb');
  const db = await getDb();
  await db
    .collection<IUser>(COLLECTION)
    .updateOne({ _id: new ObjectId(id) }, { $set: { apiKey, updatedAt: new Date() } });
}
