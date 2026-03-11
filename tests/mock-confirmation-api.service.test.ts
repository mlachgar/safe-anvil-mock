import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SafeTransactionRecord } from '../src/model/safe-state.model.js';
import { ConfirmationService } from '../src/services/confirmation.service.js';
import { MockConfirmationApiService } from '../src/services/mock-confirmation-api.service.js';
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

describe('MockConfirmationApiService', () => {
  beforeEach(() => {
    SafeStoreService.reset();
    vi.restoreAllMocks();
  });

  it('returns null for an unknown transaction', async () => {
    await expect(MockConfirmationApiService.confirmTransaction('0xmissing', {})).resolves.toBeNull();
  });

  it('returns an already executed transaction without extra work', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ executed: true, isExecuted: true, confirmationsRequired: 1 });
    SafeStoreService.saveTransaction(safe, tx);

    const applySpy = vi.spyOn(ConfirmationService, 'applyConfirmation');
    const executeSpy = vi.spyOn(SafeExecutionService, 'executeTransaction');

    const result = await MockConfirmationApiService.confirmTransaction(tx.safeTxHash, {});

    expect(result).toBe(tx);
    expect(applySpy).not.toHaveBeenCalled();
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('executes the transaction when threshold is reached after confirmation', async () => {
    const safe = SafeStoreService.ensureSafe('0x00000000000000000000000000000000000000a1');
    const tx = createTransaction({ confirmationsRequired: 1 });
    SafeStoreService.saveTransaction(safe, tx);

    vi.spyOn(ConfirmationService, 'applyConfirmation').mockImplementation(async () => {
      tx.confirmations.push({
        owner: tx.owners[0],
        submissionDate: new Date().toISOString(),
        signature: '0xauto',
        signatureType: 'ETH_SIGN',
      });
    });
    const executeSpy = vi.spyOn(SafeExecutionService, 'executeTransaction').mockResolvedValue(tx);

    const result = await MockConfirmationApiService.confirmTransaction(tx.safeTxHash, {});

    expect(result).toBe(tx);
    expect(executeSpy).toHaveBeenCalledWith(tx);
  });
});
