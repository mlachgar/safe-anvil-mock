import { afterEach, describe, expect, it } from 'vitest';
import type { SafeTransactionRecord } from '../src/model/safe-state.model.js';
import { SafeStoreService } from '../src/services/safe-store.service.js';

const originalEnv = { ...process.env };

describe('SafeStoreService', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    SafeStoreService.reset();
  });

  it('creates a safe once and normalizes the address', () => {
    process.env.SYSTEM_PUBLIC_KEY = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A';
    process.env.SAFE_MOCK_THRESHOLD = '1';

    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000A1');
    const sameSafe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');

    expect(safe).toBe(sameSafe);
    expect(safe.address).toBe('0x00000000000000000000000000000000000000a1');
    expect(safe.owners).toEqual(['0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a']);
  });

  it('stores transactions, updates nonce and can filter them', () => {
    process.env.SYSTEM_PUBLIC_KEY = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A';
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');

    const tx1: SafeTransactionRecord = {
      safe: safe.address,
      safeTxHash: '0x1',
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
      owners: [...safe.owners],
    };
    const tx2: SafeTransactionRecord = {
      ...tx1,
      safeTxHash: '0x2',
      nonce: '1',
      executed: true,
      isExecuted: true,
      txStatus: 'SUCCESS',
    };

    SafeStoreService.saveTransaction(safe, tx1);
    SafeStoreService.saveTransaction(safe, tx2);

    expect(safe.nonce).toBe('2');
    expect(SafeStoreService.getTransaction('0x2')).toBe(tx2);
    expect(SafeStoreService.listTransactions(safe, new URLSearchParams('executed=true')).results).toEqual([tx2]);
    expect(SafeStoreService.listTransactions(safe, new URLSearchParams('nonce=0')).results).toEqual([tx1]);
    expect(SafeStoreService.listTransactions(safe, new URLSearchParams('nonce__gte=1')).results).toEqual([tx2]);
  });
});
