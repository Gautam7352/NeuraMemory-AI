import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  findUserByEmail,
  createUser,
} from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { AuthPayload, AuthResponse } from '../types/auth.types.js';

const SALT_ROUNDS = 12;

function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
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
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser(email, passwordHash);

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
  });

  return {
    success: true,
    message: 'Account created successfully.',
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
    },
  };
}

/**
 * Authenticates an existing user.
 * - Looks up the user by email
 * - Compares the provided password against the stored hash
 * - Returns a signed JWT on success
 *
 * A generic error message is used for both "not found" and "wrong password"
 * to avoid leaking which condition failed (user enumeration protection).
 */
export async function loginService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
  });

  return {
    success: true,
    message: 'Login successful.',
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
    },
  };
}
