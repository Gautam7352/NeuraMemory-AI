/**
 * Augment Express Request to include the authenticated user payload
 * set by the auth middleware after JWT verification.
 */

import type { AuthPayload } from './auth.types.js';

declare global {
  namespace Express {
    interface Request {
      /** Populated by `requireAuth` middleware after successful JWT verification. */
      user?: AuthPayload;
    }
  }
}
