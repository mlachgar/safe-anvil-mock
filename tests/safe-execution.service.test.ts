import { Wallet, ethers } from 'ethers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SafeTransactionRecord } from '../src/model/safe-state.model.js';

const originalEnv = { ...process.env };

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
    data: '0x1234',
    operation: 0,
    ...overrides,
  };
}

describe('SafeExecutionService', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('builds an auto confirmation from the configured confirmer key', async () => {
    process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY = '0x' + '2'.repeat(64);
    const { SafeExecutionService } = await import('../src/services/safe-execution.service.js');
    const confirmer = new Wallet(process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY);
    const tx = createTransaction({
      owners: [confirmer.address.toLowerCase()],
    });

    const confirmation = await SafeExecutionService.buildAutoConfirmation(tx);

    expect(confirmation.owner).toBe(confirmer.address.toLowerCase());
    expect(
      ethers.utils.verifyMessage(ethers.utils.arrayify(tx.safeTxHash), confirmation.signature).toLowerCase(),
    ).toBe(confirmer.address.toLowerCase());
  });

  it('rejects missing confirmer configuration', async () => {
    delete process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY;
    const { SafeExecutionService } = await import('../src/services/safe-execution.service.js');

    await expect(SafeExecutionService.buildAutoConfirmation(createTransaction())).rejects.toThrow(
      'Missing SAFE_MOCK_CONFIRMER_PRIVATE_KEY',
    );
  });

  it('rejects non-owner or duplicate confirmer usage', async () => {
    process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY = '0x' + '2'.repeat(64);
    const { SafeExecutionService } = await import('../src/services/safe-execution.service.js');
    const confirmer = new Wallet(process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY).address.toLowerCase();

    await expect(
      SafeExecutionService.buildAutoConfirmation(createTransaction({ owners: ['0x00000000000000000000000000000000000000b2'] })),
    ).rejects.toThrow(`Configured confirmer ${confirmer} is not declared as a Safe owner`);

    await expect(
      SafeExecutionService.buildAutoConfirmation(
        createTransaction({
          owners: [confirmer],
          signatures: { [confirmer]: '0xsig' },
        }),
      ),
    ).rejects.toThrow(`Configured confirmer ${confirmer} already confirmed ${'0x' + '1'.repeat(64)}`);
  });

  it('executes a transaction through mocked Anvil RPC calls', async () => {
    process.env.RPC_URL = 'http://127.0.0.1:8545';
    vi.resetModules();

    const sendSpy = vi.spyOn(ethers.providers.JsonRpcProvider.prototype, 'send').mockImplementation(async (method) => {
      if (method === 'eth_sendTransaction') {
        return '0x' + 'a'.repeat(64);
      }
      return null;
    });
    const waitSpy = vi
      .spyOn(ethers.providers.JsonRpcProvider.prototype, 'waitForTransaction')
      .mockResolvedValue({ status: 1 } as never);

    const { SafeExecutionService } = await import('../src/services/safe-execution.service.js');
    const tx = createTransaction();

    const executed = await SafeExecutionService.executeTransaction(tx);

    expect(sendSpy).toHaveBeenCalledWith('anvil_setBalance', [tx.safe, '0x3635C9ADC5DEA00000']);
    expect(sendSpy).toHaveBeenCalledWith('anvil_impersonateAccount', [tx.safe]);
    expect(sendSpy).toHaveBeenCalledWith('eth_sendTransaction', [
      {
        from: tx.safe,
        to: '0x00000000000000000000000000000000000000b2',
        value: '0x00',
        data: '0x1234',
      },
    ]);
    expect(sendSpy).toHaveBeenCalledWith('anvil_stopImpersonatingAccount', [tx.safe]);
    expect(waitSpy).toHaveBeenCalledWith('0x' + 'a'.repeat(64));
    expect(executed.isExecuted).toBe(true);
    expect(executed.txStatus).toBe('SUCCESS');
    expect(executed.transactionHash).toBe('0x' + 'a'.repeat(64));
  });

  it('stops impersonation even when execution fails', async () => {
    process.env.RPC_URL = 'http://127.0.0.1:8545';
    vi.resetModules();

    const sendSpy = vi.spyOn(ethers.providers.JsonRpcProvider.prototype, 'send').mockImplementation(async (method) => {
      if (method === 'eth_sendTransaction') {
        return '0x' + 'b'.repeat(64);
      }
      return null;
    });
    vi.spyOn(ethers.providers.JsonRpcProvider.prototype, 'waitForTransaction').mockResolvedValue({ status: 0 } as never);

    const { SafeExecutionService } = await import('../src/services/safe-execution.service.js');

    await expect(SafeExecutionService.executeTransaction(createTransaction())).rejects.toThrow(
      `Transaction execution failed for ${'0x' + '1'.repeat(64)}`,
    );
    expect(sendSpy).toHaveBeenCalledWith('anvil_stopImpersonatingAccount', ['0x00000000000000000000000000000000000000a1']);
  });

  it('returns the same transaction when already executed', async () => {
    const { SafeExecutionService } = await import('../src/services/safe-execution.service.js');
    const tx = createTransaction({ executed: true, isExecuted: true });

    await expect(SafeExecutionService.executeTransaction(tx)).resolves.toBe(tx);
  });

  it('rejects missing rpc configuration', async () => {
    delete process.env.RPC_URL;
    vi.resetModules();

    const { SafeExecutionService } = await import('../src/services/safe-execution.service.js');

    await expect(SafeExecutionService.executeTransaction(createTransaction())).rejects.toMatchObject({
      message: 'Missing RPC_URL configuration',
      status: 500,
    });
  });
});
