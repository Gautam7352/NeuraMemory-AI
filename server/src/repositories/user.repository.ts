import { WithId } from 'mongodb';
import { getDb } from '../lib/mongodb.js';
import { IUser } from '../types/auth.types.js';

const COLLECTION = 'users';

/**
 * Ensures a unique index on the email field.
 * Should be called once at application startup.
 */
export async function ensureUserIndexes(): Promise<void> {
  const db = await getDb();
  await db
    .collection<IUser>(COLLECTION)
    .createIndex({ email: 1 }, { unique: true });
}

/**
 * Finds a single user document by email address.
 */
export async function findUserByEmail(
  email: string,
): Promise<WithId<IUser> | null> {
  const db = await getDb();
  return db.collection<IUser>(COLLECTION).findOne({ email });
}

/**
 * Finds a single user document by its MongoDB ObjectId string.
 */
export async function findUserById(id: string): Promise<WithId<IUser> | null> {
  const { ObjectId } = await import('mongodb');
  const db = await getDb();
  return db.collection<IUser>(COLLECTION).findOne({ _id: new ObjectId(id) });
}

/**
 * Inserts a new user into the users collection and returns the full document.
 */
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
