import rateLimit, { type Options } from 'express-rate-limit';

function rateLimitResponse(message: string) {
  return {
    success: false,
    message,
  };
}

const nodeEnv = process.env['NODE_ENV'];
const isDevelopmentLike = nodeEnv === 'development' || nodeEnv === 'test';

const loginMaxRequests = isDevelopmentLike ? 10_000 : 5;
const registerMaxRequests = isDevelopmentLike ? 10_000 : 10;

const loginWindowMs = 15 * 60 * 1000;
const registerWindowMs = 60 * 60 * 1000;

const baseOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
};

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
