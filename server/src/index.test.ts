import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { env } from './config/env.js';

describe('CORS configuration', () => {
  const originalEnv = env.NODE_ENV;

  afterEach(() => {
    env.NODE_ENV = originalEnv;
  });

  it('allows missing origin in development mode', async () => {
    env.NODE_ENV = 'development';

    const res = await request(app).get('/health');
    expect(res.status).not.toBe(500);
  });

  it('allows missing origin in production mode (for health checks etc)', async () => {
    env.NODE_ENV = 'production';

    const originalWarn = console.warn;
    console.warn = vi.fn();

    const res = await request(app).get('/health');
    // It should not throw a CORS error
    expect(res.status).not.toBe(500);

    console.warn = originalWarn;
  });

  it('allows matching origin', async () => {
    env.NODE_ENV = 'production';

    const allowedOrigin =
      env.ALLOWED_ORIGINS.split(',')[0]?.trim() || 'http://localhost:5173';

    const res = await request(app).get('/health').set('Origin', allowedOrigin);

    expect(res.status).not.toBe(500);
  });

  it('rejects non-matching origin', async () => {
    // Override console.warn
    const originalWarn = console.warn;
    console.warn = vi.fn();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://malicious.com');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');

    console.warn = originalWarn;
  });
});
