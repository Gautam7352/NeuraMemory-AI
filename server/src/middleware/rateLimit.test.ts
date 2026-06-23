import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('rateLimit middleware', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should enforce production limits for loginRateLimiter', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { loginRateLimiter } = await import('./rateLimit.js');

    const app = express();
    app.use('/login', loginRateLimiter, (_req, res) => {
      res.status(200).json({ success: true });
    });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/login').send();
      expect(res.status).toBe(200);
    }

    const res = await request(app).post('/login').send();
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
    });
  });

  it('should enforce production limits for registerRateLimiter', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { registerRateLimiter } = await import('./rateLimit.js');

    const app = express();
    app.use('/register', registerRateLimiter, (_req, res) => {
      res.status(200).json({ success: true });
    });

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/register').send();
      expect(res.status).toBe(200);
    }

    const res = await request(app).post('/register').send();
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      message: 'Too many registration attempts. Please try again in 1 hour.',
    });
  });

  it('should allow high limits in test environment for loginRateLimiter', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const { loginRateLimiter } = await import('./rateLimit.js');

    const app = express();
    app.use('/login', loginRateLimiter, (_req, res) => {
      res.status(200).json({ success: true });
    });

    // In test environment, the limit is 10,000, so 10 requests should easily pass.
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/login').send();
      expect(res.status).toBe(200);
    }
  });

  it('should include rate limit headers in responses', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { loginRateLimiter } = await import('./rateLimit.js');

    const app = express();
    app.use('/login', loginRateLimiter, (_req, res) => {
      res.status(200).json({ success: true });
    });

    const res = await request(app).post('/login').send();
    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit-limit', '5');
    expect(res.headers).toHaveProperty('ratelimit-remaining', '4');
    expect(res.headers).toHaveProperty('ratelimit-reset');
  });
});
