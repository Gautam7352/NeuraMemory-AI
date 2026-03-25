/**
 * Authentication middleware — verifies the JWT from the `Authorization` header
 * and attaches the decoded payload to `req.user`.
 *
 * Usage:
 *   router.post('/protected', requireAuth, handler);
 *   // or apply to all routes in a router:
 *   router.use(requireAuth);
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import type { AuthPayload } from '../../types/auth.types.js';

/**
 * Express middleware that:
 *  1. Extracts the Bearer token from the `Authorization` header.
 *  2. Verifies and decodes the JWT using `JWT_SECRET`.
 *  3. Attaches `{ userId, email }` to `req.user`.
 *  4. Rejects with 401 if the token is missing, malformed, or expired.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    let token: string | undefined;

    // 1. Check for the Standard Authorization Header (Bearer Token)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fallback: Check for 'authorization' inside the Cookie header
    if (!token && req.cookies) {
      token = req.cookies['authorization'];
    }

    // 3. If no token is found in either place, throw error
    if (!token) {
      throw new AppError(401, 'Authentication required. No token provided.');
    }

    // 4. Verify and decode
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    // Validate that the payload contains the expected fields
    if (
      typeof decoded['userId'] !== 'string' ||
      typeof decoded['email'] !== 'string'
    ) {
      throw new AppError(401, 'Invalid token payload.');
    }

    // Attach to request for downstream handlers
    const payload: AuthPayload = {
      userId: decoded['userId'],
      email: decoded['email'],
    };

    req.user = payload;
    next();

  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }

    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Token has expired. Please log in again.'));
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, `Invalid token: ${err.message}`));
      return;
    }

    next(new AppError(401, 'Authentication failed. Please provide a valid token.'));
  }
}