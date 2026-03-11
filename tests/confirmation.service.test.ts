import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SafeTransactionRecord } from '../src/model/safe-state.model.js';
import { ConfirmationService } from '../src/services/confirmation.service.js';
import { SafeExecutionService } from '../src/services/safe-execution.service.js';
import { SafeStoreService } from '../src/services/safe-store.service.js';

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
    confirmationsRequired: 2,
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

describe('ConfirmationService', () => {
  beforeEach(() => {
    SafeStoreService.reset();
    vi.restoreAllMocks();
  });

  it('lists confirmations for a transaction', () => {
    const tx = createTransaction({
      confirmations: [
        {
          owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
          submissionDate: new Date().toISOString(),
          signature: '0xsig',
          signatureType: 'ETH_SIGN',
        },
      ],
    });

    expect(ConfirmationService.listConfirmations(tx)).toMatchObject({
      count: 1,
      next: null,
      previous: null,
    });
  });

  it('adds an auto confirmation and returns the last confirmation', async () => {
    const tx = createTransaction();
    SafeStoreService.ensureSafe(tx.safe);
    vi.spyOn(SafeExecutionService, 'buildAutoConfirmation').mockResolvedValue({
      owner: tx.owners[0],
      signature: '0xauto',
    });

    const result = await ConfirmationService.addConfirmation(tx, {});

    expect(result).toMatchObject({
      owner: tx.owners[0],
      signature: '0xauto',
    });
    expect(tx.confirmations).toHaveLength(1);
  });

  it('does nothing when there is no signature input and threshold is already met', async () => {
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

    const spy = vi.spyOn(SafeExecutionService, 'buildAutoConfirmation');
    await ConfirmationService.applyConfirmation(tx, {});

    expect(spy).not.toHaveBeenCalled();
    expect(tx.confirmations).toHaveLength(1);
  });
});
