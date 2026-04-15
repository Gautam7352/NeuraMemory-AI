import rateLimit, { type Options } from 'express-rate-limit';

function rateLimitResponse(message: string) {
  return {
    success: false,
    message,
  };
}

/**
 * Environment-aware limits:
 * - In development/test, keep limits very high to avoid interfering with local test suites.
 * - In production, enforce strict limits.
 */
const nodeEnv = process.env['NODE_ENV'];
const isDevelopmentLike = nodeEnv === 'development' || nodeEnv === 'test';

const loginMaxRequests = isDevelopmentLike ? 10_000 : 5;
const registerMaxRequests = isDevelopmentLike ? 10_000 : 10;

const loginWindowMs = 15 * 60 * 1000; // 15 minutes
const registerWindowMs = 60 * 60 * 1000; // 1 hour

/**
 * Shared base options — use the library-default keyGenerator (IP-based with
 * proper IPv6 normalisation) instead of a custom one to avoid
 * ERR_ERL_KEY_GEN_IPV6 validation errors in express-rate-limit v8+.
 */
const baseOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
};

/**
 * @planned vNext
 * Enable on auth routes once deployment-specific thresholds are finalized.
 */
export const loginRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: loginWindowMs,
  max: loginMaxRequests,
  message: rateLimitResponse(
    isDevelopmentLike
      ? 'Rate limit exceeded in development mode (unexpected).'
      : 'Too many login attempts. Please try again in 15 minutes.',
  ),
});

/**
 * @planned vNext
 * Enable on auth routes once deployment-specific thresholds are finalized.
 */
export const registerRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: registerWindowMs,
  max: registerMaxRequests,
  message: rateLimitResponse(
    isDevelopmentLike
      ? 'Rate limit exceeded in development mode (unexpected).'
      : 'Too many registration attempts. Please try again in 1 hour.',
  ),
});

/**
 * Limit memory processing requests (PDF, URL, Text extraction).
 * Higher resource cost per request requires stricter limiting.
 */
export const memoryRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopmentLike ? 10_000 : 30, // 30 requests per 15 minutes in prod
  message: rateLimitResponse(
    'Too many document processing requests. Please try again in 15 minutes.',
  ),
});
