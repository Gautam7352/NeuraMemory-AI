import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import type { AuthPayload } from '../../types/auth.types.js';

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    let token: string | undefined;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key) {
          acc[key] = value || '';
        }
        return acc;
      }, {} as Record<string, string>);

      token = cookies['authorization'];
    }

    if (!token) {
      throw new AppError(401, 'Authentication required. No token provided.');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    if (
      typeof decoded['userId'] !== 'string' ||
      typeof decoded['email'] !== 'string'
    ) {
      throw new AppError(401, 'Invalid token payload.');
    }

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
