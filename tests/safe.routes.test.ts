import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import safeRoutes from '../src/routes/safe.routes.js';
import { SafeStoreService } from '../src/services/safe-store.service.js';

const originalEnv = { ...process.env };

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(safeRoutes);
  return app;
}

describe('safe.routes', () => {
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

  it('returns safe metadata for a requested safe', async () => {
    const response = await request(createApp()).get('/v1/safes/0x00000000000000000000000000000000000000A1/');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      address: '0x00000000000000000000000000000000000000a1',
      nonce: '0',
      threshold: 1,
      owners: ['0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a'],
      version: '1.4.1',
    });
  });

  it('creates and lists multisig transactions with filtering', async () => {
    const app = createApp();
    const safeAddress = '0x00000000000000000000000000000000000000a1';

    const createResponse = await request(app)
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send({
        safeTxHash: '0x' + '1'.repeat(64),
        nonce: 0,
        to: '0x00000000000000000000000000000000000000b2',
        value: '0',
        data: '0x',
        operation: 0,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.safe).toBe(safeAddress);

    const listAll = await request(app).get(`/v2/safes/${safeAddress}/multisig-transactions/?executed=false&nonce__gte=0`);
    expect(listAll.status).toBe(200);
    expect(listAll.body.count).toBe(1);
    expect(listAll.body.results[0].safeTxHash).toBe('0x' + '1'.repeat(64));
  });

  it('supports ordering and pagination when listing multisig transactions', async () => {
    const app = createApp();
    const safeAddress = '0x00000000000000000000000000000000000000a1';

    await request(app)
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send({ safeTxHash: '0x' + '1'.repeat(64), nonce: 1 });
    await request(app)
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send({ safeTxHash: '0x' + '2'.repeat(64), nonce: 2 });
    await request(app)
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send({ safeTxHash: '0x' + '3'.repeat(64), nonce: 3 });

    const response = await request(app).get(
      `/v2/safes/${safeAddress}/multisig-transactions/?ordering=-nonce&limit=2&offset=1`,
    );

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(3);
    expect(response.body.results).toHaveLength(2);
    expect(response.body.results.map((tx: { nonce: number }) => tx.nonce)).toEqual([2, 1]);
  });

  it('rejects invalid signed proposals', async () => {
    const response = await request(createApp())
      .post('/v2/safes/0x00000000000000000000000000000000000000a1/multisig-transactions/')
      .send({
        safeTxHash: '0x' + '2'.repeat(64),
        senderAddress: '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
        senderSignature: '0xdeadbeef',
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({});
  });
});
