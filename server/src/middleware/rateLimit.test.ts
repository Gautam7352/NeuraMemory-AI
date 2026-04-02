import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('Rate Limit Middleware', () => {
  let loginRateLimiter: express.RequestHandler;
  let registerRateLimiter: express.RequestHandler;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Development/Test Environment', () => {
    beforeEach(async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const mod = await import('./rateLimit');
      loginRateLimiter = mod.loginRateLimiter;
      registerRateLimiter = mod.registerRateLimiter;
    });

    it('registerRateLimiter should allow requests and set headers', async () => {
      const app = express();
      // Need trust proxy for IP generation if we were spoofing, but default is fine here
      app.use('/register', registerRateLimiter);
      app.post('/register', (req, res) =>
        res.status(200).json({ success: true }),
      );

      const response = await request(app).post('/register');

      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('10000');
    });

    it('loginRateLimiter should allow requests and set headers', async () => {
      const app = express();
      app.use('/login', loginRateLimiter);
      app.post('/login', (req, res) => res.status(200).json({ success: true }));

      const response = await request(app).post('/login');

      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('10000');
    });
  });

  describe('Production Environment', () => {
    beforeEach(async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const mod = await import('./rateLimit');
      loginRateLimiter = mod.loginRateLimiter;
      registerRateLimiter = mod.registerRateLimiter;
    });

    it('registerRateLimiter should block requests after 10 attempts', async () => {
      const app = express();
      app.use('/register', registerRateLimiter);
      app.post('/register', (req, res) =>
        res.status(200).json({ success: true }),
      );

      // Send 10 successful requests
      for (let i = 0; i < 10; i++) {
        const res = await request(app).post('/register');
        expect(res.status).toBe(200);
        expect(res.headers['ratelimit-limit']).toBe('10');
      }

      // 11th request should be blocked
      const blockedRes = await request(app).post('/register');
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body).toEqual({
        success: false,
        message: 'Too many registration attempts. Please try again in 1 hour.',
      });
    });

    it('loginRateLimiter should block requests after 5 attempts', async () => {
      const app = express();
      app.use('/login', loginRateLimiter);
      app.post('/login', (req, res) => res.status(200).json({ success: true }));

      // Send 5 successful requests
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/login');
        expect(res.status).toBe(200);
        expect(res.headers['ratelimit-limit']).toBe('5');
      }

      // 6th request should be blocked
      const blockedRes = await request(app).post('/login');
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body).toEqual({
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
      });
    });
  });
});
