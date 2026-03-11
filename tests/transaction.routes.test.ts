import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Wallet, getBytes } from 'ethers';
import type { SafeTransactionRecord } from '../src/model/safe-state.model.js';
import mockConfirmationRoutes from '../src/routes/mock-confirmation.routes.js';
import safeTransactionRoutes from '../src/routes/safe-transaction.routes.js';
import { SafeExecutionService } from '../src/services/safe-execution.service.js';
import { SafeStoreService } from '../src/services/safe-store.service.js';

const originalEnv = { ...process.env };

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(safeTransactionRoutes);
  app.use(mockConfirmationRoutes);
  return app;
}

function createTransaction(overrides: Partial<SafeTransactionRecord> = {}): SafeTransactionRecord {
  return {
    safe: '0x00000000000000000000000000000000000000a1',
    safeTxHash: '0x' + '1'.repeat(64),
    nonce: '0',
    executed: false,
    isExecuted: false,
    txStatus: 'AWAITING_CONFIRMATIONS',
    executionDate: null,
    submissionDate: new Date().toISOString(),
    modified: new Date().toISOString(),
    confirmationsRequired: 1,
    confirmations: [],
    trusted: true,
    signatures: {},
    owners: ['0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a'],
    to: '0x00000000000000000000000000000000000000b2',
    value: '0',
    data: '0x',
    operation: 0,
    ...overrides,
  };
}

describe('transaction.routes', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    SafeStoreService.reset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    SafeStoreService.reset();
    vi.restoreAllMocks();
  });

  it('returns 404 when confirming an unknown transaction', async () => {
    const response = await request(createApp()).post(`/mock/transactions/${'0x' + '1'.repeat(64)}/confirm/`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ detail: 'Unknown safeTxHash' });
  });

  it('returns 404 when listing confirmations for an unknown transaction', async () => {
    const response = await request(createApp()).get(`/v1/multisig-transactions/${'0x' + '1'.repeat(64)}/confirmations/`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ detail: 'Not found.' });
  });

  it('returns the stored transaction when it is already executed', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ isExecuted: true, executed: true, txStatus: 'SUCCESS' });
    SafeStoreService.saveTransaction(safe, tx);

    const response = await request(createApp()).post(`/mock/transactions/${tx.safeTxHash}/confirm/`);

    expect(response.status).toBe(200);
    expect(response.body.safeTxHash).toBe(tx.safeTxHash);
  });

  it('executes directly when threshold is already met', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({
      confirmationsRequired: 1,
      confirmations: [
        {
          owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
          submissionDate: new Date().toISOString(),
          signature: '0xsig',
          signatureType: 'ETH_SIGN',
        },
      ],
      signatures: {
        '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a': '0xsig',
      },
    });
    SafeStoreService.saveTransaction(safe, tx);

    const executeSpy = vi.spyOn(SafeExecutionService, 'executeTransaction').mockResolvedValue({
      ...tx,
      executed: true,
      isExecuted: true,
      txStatus: 'SUCCESS',
    });
    const autoSpy = vi.spyOn(SafeExecutionService, 'buildAutoConfirmation');

    const response = await request(createApp()).post(`/mock/transactions/${tx.safeTxHash}/confirm/`);

    expect(response.status).toBe(200);
    expect(executeSpy).toHaveBeenCalledOnce();
    expect(autoSpy).not.toHaveBeenCalled();
  });

  it('creates an auto confirmation before execution when threshold is not met', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ confirmationsRequired: 2 });
    SafeStoreService.saveTransaction(safe, tx);

    vi.spyOn(SafeExecutionService, 'buildAutoConfirmation').mockResolvedValue({
      owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
      signature: '0xauto',
    });
    const executeSpy = vi.spyOn(SafeExecutionService, 'executeTransaction').mockResolvedValue(tx);

    const response = await request(createApp()).post(`/mock/transactions/${tx.safeTxHash}/confirm/`);

    expect(response.status).toBe(200);
    expect(response.body.confirmations).toHaveLength(1);
    expect(response.body.signatures['0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a']).toBe('0xauto');
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('returns 500 when auto confirmation fails', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ confirmationsRequired: 2 });
    SafeStoreService.saveTransaction(safe, tx);

    vi.spyOn(SafeExecutionService, 'buildAutoConfirmation').mockRejectedValue(
      new Error('Missing SAFE_MOCK_CONFIRMER_PRIVATE_KEY'),
    );

    const response = await request(createApp()).post(`/mock/transactions/${tx.safeTxHash}/confirm/`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ detail: 'Missing SAFE_MOCK_CONFIRMER_PRIVATE_KEY' });
  });

  it('returns a transaction from the safe transaction endpoint', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction();
    SafeStoreService.saveTransaction(safe, tx);

    const response = await request(createApp()).get(`/v2/multisig-transactions/${tx.safeTxHash}/`);

    expect(response.status).toBe(200);
    expect(response.body.safeTxHash).toBe(tx.safeTxHash);
  });

  it('lists stored confirmations for a transaction', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({
      confirmations: [
        {
          owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
          submissionDate: new Date().toISOString(),
          signature: '0xsig',
          signatureType: 'ETH_SIGN',
        },
      ],
      signatures: {
        '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a': '0xsig',
      },
    });
    SafeStoreService.saveTransaction(safe, tx);

    const response = await request(createApp()).get(`/v1/multisig-transactions/${tx.safeTxHash}/confirmations/`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.results[0]).toMatchObject({
      owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
      signature: '0xsig',
    });
  });

  it('stores an explicit signed confirmation', async () => {
    const wallet = new Wallet('0x' + '11'.repeat(32));
    process.env = {
      ...originalEnv,
      SAFE_MOCK_OWNERS: wallet.address,
      SAFE_MOCK_THRESHOLD: '2',
    };

    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({
      confirmationsRequired: 2,
      owners: [...safe.owners],
    });
    SafeStoreService.saveTransaction(safe, tx);

    const signature = await wallet.signMessage(getBytes(tx.safeTxHash));
    const response = await request(createApp())
      .post(`/v1/multisig-transactions/${tx.safeTxHash}/confirmations/`)
      .send({
        owner: wallet.address,
        signature,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      owner: wallet.address.toLowerCase(),
      signature,
      signatureType: 'ETH_SIGN',
    });
    expect(SafeStoreService.getTransaction(tx.safeTxHash)?.confirmations).toHaveLength(1);
  });

  it('can auto-create a confirmation through the confirmations endpoint', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ confirmationsRequired: 2 });
    SafeStoreService.saveTransaction(safe, tx);

    vi.spyOn(SafeExecutionService, 'buildAutoConfirmation').mockResolvedValue({
      owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
      signature: '0xauto',
    });
    const executeSpy = vi.spyOn(SafeExecutionService, 'executeTransaction').mockResolvedValue(tx);

    const response = await request(createApp()).post(`/v1/multisig-transactions/${tx.safeTxHash}/confirmations/`);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
      signature: '0xauto',
    });
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('returns custom status when mock confirmation route catches a status error', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ confirmationsRequired: 2 });
    SafeStoreService.saveTransaction(safe, tx);

    vi.spyOn(SafeExecutionService, 'buildAutoConfirmation').mockRejectedValue(
      Object.assign(new Error('Already confirmed'), { status: 409 }),
    );

    const response = await request(createApp()).post(`/mock/transactions/${tx.safeTxHash}/confirm/`);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ detail: 'Already confirmed' });
  });

  it('returns custom status when safe confirmation route catches a status error', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ confirmationsRequired: 2 });
    SafeStoreService.saveTransaction(safe, tx);

    vi.spyOn(SafeExecutionService, 'buildAutoConfirmation').mockRejectedValue(
      Object.assign(new Error('Already confirmed'), { status: 409 }),
    );

    const response = await request(createApp()).post(`/v1/multisig-transactions/${tx.safeTxHash}/confirmations/`);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ detail: 'Already confirmed' });
  });
});
