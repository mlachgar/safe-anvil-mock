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

  it('supports ordering, pagination, fallback parsing and replacement by hash', () => {
    process.env.SYSTEM_PUBLIC_KEY = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A';
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const base: SafeTransactionRecord = {
      safe: safe.address,
      safeTxHash: '0x1',
      nonce: '0',
      executed: false,
      isExecuted: false,
      txStatus: 'AWAITING_CONFIRMATIONS',
      executionDate: null,
      submissionDate: '2024-01-01T00:00:00.000Z',
      modified: '2024-01-01T00:00:00.000Z',
      confirmationsRequired: 1,
      confirmations: [],
      trusted: true,
      signatures: {},
      owners: [...safe.owners],
    };

    const tx1 = { ...base, safeTxHash: '0x1', nonce: '0', executionDate: null, modified: '2024-01-01T00:00:00.000Z', trusted: false };
    const tx2 = { ...base, safeTxHash: '0x2', nonce: '2', executionDate: '2024-01-03T00:00:00.000Z', modified: '2024-01-03T00:00:00.000Z' };
    const tx3 = { ...base, safeTxHash: '0x3', nonce: '1', executionDate: '2024-01-02T00:00:00.000Z', modified: '2024-01-02T00:00:00.000Z', submissionDate: '2024-01-02T00:00:00.000Z' };
    const tx1Replacement = { ...tx1, txStatus: 'SUCCESS' };

    SafeStoreService.saveTransaction(safe, tx1);
    SafeStoreService.saveTransaction(safe, tx2);
    SafeStoreService.saveTransaction(safe, tx3);
    SafeStoreService.saveTransaction(safe, tx1Replacement);

    expect(safe.txs).toHaveLength(3);
    expect(SafeStoreService.getTransaction('0xunknown')).toBeUndefined();
    expect(SafeStoreService.listTransactions(safe, new URLSearchParams('ordering=-nonce&limit=foo&offset=-1')).results.map((tx) => tx.safeTxHash)).toEqual([
      '0x2',
      '0x3',
      '0x1',
    ]);
    expect(SafeStoreService.listTransactions(safe, new URLSearchParams('ordering=submissionDate&limit=1&offset=1')).results.map((tx) => tx.safeTxHash)).toEqual([
      '0x1',
    ]);
    expect(SafeStoreService.listTransactions(safe, new URLSearchParams('ordering=executionDate')).results.map((tx) => tx.safeTxHash)).toEqual([
      '0x1',
      '0x3',
      '0x2',
    ]);
    expect(SafeStoreService.listTransactions(safe, new URLSearchParams('ordering=trusted')).results.map((tx) => tx.safeTxHash)).toEqual([
      '0x1',
      '0x2',
      '0x3',
    ]);
  });
});
