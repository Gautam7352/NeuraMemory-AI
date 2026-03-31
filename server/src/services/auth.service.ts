import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import {
  createUser,
  findUserByEmail,
  updateUserApiKey,
} from '../repositories/user.repository.js';
import { AuthPayload, AuthResponse } from '../types/auth.types.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

/**
 * Hashes a plaintext password using bcrypt.
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares plaintext password against a bcrypt hash.
 */
async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

/**
 * Signs and returns a JWT token for auth payload.
 */
function signAuthToken(payload: AuthPayload): string {
  const options: SignOptions = {};
  const expiresIn = env.JWT_EXPIRES_IN as SignOptions['expiresIn'];

  if (expiresIn !== undefined) {
    options.expiresIn = expiresIn;
  }

  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Builds a standard auth response structure.
 */
function buildAuthResponse(
  message: string,
  user: { id: string; email: string },
): AuthResponse {
  const token = signAuthToken({
    userId: user.id,
    email: user.email,
  });

  return {
    success: true,
    message,
    token,
    user,
  };
}

/**
 * Masks an email address for safe logging.
 * e.g. "user@example.com" → "u***@example.com"
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '[invalid-email]';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex); // includes the @
  const masked =
    local.length <= 1 ? '*'.repeat(local.length) : `${local[0]}***`;
  return `${masked}${domain}`;
}

/**
 * Logs structured auth errors without leaking sensitive secrets.
 * Email is masked before logging to protect user privacy.
 */
function logAuthError(
  operation: 'register' | 'login',
  email: string,
  err: unknown,
): void {
  const now = new Date().toISOString();
  const maskedEmail = maskEmail(email);

  if (err instanceof Error) {
    console.error(`[AuthService] ${operation} failed`, {
      operation,
      email: maskedEmail,
      reason: err.message,
      timestamp: now,
      stack: err.stack,
    });
    return;
  }

  console.error(`[AuthService] ${operation} failed`, {
    operation,
    email: maskedEmail,
    reason: 'Unknown error',
    timestamp: now,
    error: String(err),
  });
}

/**
 * Registers a new user.
 * - Checks for duplicate email
 * - Hashes password with bcrypt
 * - Persists the new user document
 * - Returns a signed JWT
 */
export async function registerService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const createdUser = await createUser(email, passwordHash);

    return buildAuthResponse('Account created successfully.', {
      id: createdUser.id,
      email: createdUser.email,
    });
  } catch (err) {
    logAuthError('register', email, err);
    throw err;
  }
}

/**
 * Authenticates an existing user.
 * - Looks up the user by email
 * - Compares provided password against the stored hash
 * - Returns a signed JWT on success
 *
 * Uses a generic error message for both "user not found" and "wrong password"
 * to avoid user enumeration.
 */
export async function loginService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      throw new AppError(401, INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await verifyPassword(
      password,
      existingUser.passwordHash,
    );
    if (!isPasswordValid) {
      throw new AppError(401, INVALID_CREDENTIALS_MESSAGE);
    }

    return buildAuthResponse('Login successful.', {
      id: existingUser.id,
      email: existingUser.email,
    });
  } catch (err) {
    logAuthError('login', email, err);
    throw err;
  }
}

/**
 * Generates a new API Key for the user.
 */
export async function generateApiService(
  userId: string,
): Promise<{ apiKey: string }> {
  // Generate a random 32-byte hex string and prefix it with nm_ (NeuraMemory)
  const apiKey = `nm_${crypto.randomBytes(32).toString('hex')}`;

  await updateUserApiKey(userId, apiKey);

  return { apiKey };
}
