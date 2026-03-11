import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import routes from '../src/app/routes.js';
import { SafeStoreService } from '../src/services/safe-store.service.js';

const originalEnv = { ...process.env };

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(routes);
  return app;
}

describe('app routes', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SYSTEM_PUBLIC_KEY: '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
      SAFE_MOCK_THRESHOLD: '1',
    };
    SafeStoreService.reset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    SafeStoreService.reset();
  });

  it('serves the health endpoint through the root router', async () => {
    const response = await request(createApp()).get('/health/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('serves safe endpoints through the root router', async () => {
    const response = await request(createApp()).get('/v1/safes/0x00000000000000000000000000000000000000a1/');

    expect(response.status).toBe(200);
    expect(response.body.address).toBe('0x00000000000000000000000000000000000000a1');
  });
});
