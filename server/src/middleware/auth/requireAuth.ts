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
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      throw new AppError(401, 'Authentication required. No token provided.');
    }

    // Expect: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError(
        401,
        'Malformed Authorization header. Expected format: Bearer <token>.',
      );
    }

    const token = parts[1]!;

    // Verify and decode
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

    // Handle specific JWT error types
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Token has expired. Please log in again.'));
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, `Invalid token: ${err.message}`));
      return;
    }

    if (err instanceof jwt.NotBeforeError) {
      next(new AppError(401, 'Token is not yet active.'));
      return;
    }

    next(
      new AppError(401, 'Authentication failed. Please provide a valid token.'),
    );
  }
}
