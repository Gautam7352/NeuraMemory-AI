import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Simplified CSRF middleware.
 * Uses Origin/Referer validation (stateless).
 *
 * On state-changing requests (POST, PUT, DELETE, PATCH), this middleware
 * verifies that the request originates from an allowed domain.
 */
export function csrfProtection(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
    req.method,
  );

  if (isStateChanging) {
    // Skip protection for API-Key authenticated requests (Service-to-Service)
    const hasApiKey = !!(
      req.headers['x-api-key'] ||
      req.query['apiKey'] ||
      req.headers['authorization']?.startsWith('Bearer ')
    );
    if (hasApiKey) return next();

    const origin = req.headers.origin || req.headers.referer;

    // In strict environments, we might completely reject requests lacking Origin/Referer.
    // However, some valid clients (e.g. mobile apps, non-browser tools) might naturally lack them.
    // Assuming our primary threat is browser-based cross-site requests, browsers always send Origin/Referer.
    if (origin) {
      const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) =>
        o.trim(),
      );
      const isAllowed =
        allowedOrigins.some((o) => origin.startsWith(o)) ||
        origin.includes('localhost') ||
        origin.includes('.vercel.app');

      if (!isAllowed) {
        logger.warn(
          `[CSRF] Blocked request for ${req.path} from ${req.ip}. Invalid origin: ${origin}`,
        );
        return next(new AppError(403, 'CSRF blocked: Invalid origin.'));
      }
    }
  }

  next();
}
