import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Custom CSRF middleware.
 * Uses the "Double Submit Cookie" pattern (stateless).
 * 
 * 1. On every request, if the CSRF cookie is missing, we set one (random secret).
 * 2. On state-changing requests (POST, PUT, DELETE, PATCH):
 *    - Compare the 'x-csrf-token' header or body field against the cookie value.
 *    - If they don't match, reject the request.
 * 
 * Note: For this to be secure, cookies must be 'SameSite=Lax/Strict'.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // 1. Generate token if missing (or refresh)
  let cookieToken = req.cookies[CSRF_COOKIE_NAME];
  
  if (!cookieToken) {
    // Generate a simple secure-ish random string
    cookieToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    res.cookie(CSRF_COOKIE_NAME, cookieToken, {
      httpOnly: false, // Must be readable by frontend to send back in header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  // 2. Validate for state-changing methods
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  
  if (isStateChanging) {
    // 3. Skip protection for API-Key authenticated requests (Service-to-Service)
    const hasApiKey = !!(req.headers['x-api-key'] || req.query['apiKey'] || req.headers['authorization']?.startsWith('Bearer '));
    if (hasApiKey) return next();

    const headerToken = req.headers[CSRF_HEADER_NAME] || req.body?._csrf;
    
    // Skip protection for Login/Register if they are purely credential-based 
    // and don't rely on existing session cookies (though they do use cookies for CSRF).
    // Actually, it's safer to require it everywhere in the API.
    
    if (!headerToken || headerToken !== cookieToken) {
      logger.warn(`[CSRF] Blocked request for ${req.path} from ${req.ip}. Header: ${headerToken ? 'Mismatched' : 'Missing'}`);
      return next(new AppError(403, 'Invalid or missing CSRF token.'));
    }
  }

  next();
}
