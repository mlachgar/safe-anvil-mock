import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Wallet, getBytes, keccak256, toUtf8Bytes } from 'ethers';
import type { SafeState, SafeTransactionRecord } from '../src/model/safe-state.model.js';
import { SafeTransactionService } from '../src/services/safe-transaction.service.js';

describe('SafeTransactionService', () => {
  const ownerWallet = new Wallet('0x' + '1'.repeat(64));
  const safe: SafeState = {
    address: '0x00000000000000000000000000000000000000a1',
    nonce: '7',
    threshold: 2,
    owners: [ownerWallet.address.toLowerCase()],
    txs: [],
  };

  beforeEach(() => {
    vi.useRealTimers();
  });

  it('creates a transaction with derived defaults', () => {
    const tx = SafeTransactionService.createTransaction(safe, {
      safeTxHash: '0xabc',
      to: '0x00000000000000000000000000000000000000b2',
      value: '0',
      data: '0x',
    });

    expect(tx.safeTxHash).toBe('0xabc');
    expect(tx.nonce).toBe('7');
    expect(tx.confirmationsRequired).toBe(2);
    expect(tx.confirmations).toHaveLength(0);
    expect(tx.owners).toEqual([ownerWallet.address.toLowerCase()]);
  });

  it('adds the proposer confirmation when a valid signature is present', async () => {
    const safeTxHash = keccak256(toUtf8Bytes('proposal'));
    const signature = await ownerWallet.signMessage(getBytes(safeTxHash));

    const tx = SafeTransactionService.createTransaction(safe, {
      safeTxHash,
      senderAddress: ownerWallet.address,
      senderSignature: signature,
    });

    expect(tx.confirmations).toHaveLength(1);
    expect(tx.signatures[ownerWallet.address.toLowerCase()]).toBe(signature);
  });

  it('accepts proposer signatures created from the hex string payload', async () => {
    const safeTxHash = keccak256(toUtf8Bytes('proposal'));
    const signature = await ownerWallet.signMessage(safeTxHash);

    const tx = SafeTransactionService.createTransaction(safe, {
      safeTxHash,
      senderAddress: ownerWallet.address,
      senderSignature: signature,
    });

    expect(tx.confirmations).toHaveLength(1);
    expect(tx.signatures[ownerWallet.address.toLowerCase()]).toBe(signature);
  });

  it('rejects signatures from non-owners', async () => {
    const outsider = new Wallet('0x' + '2'.repeat(64));
    const safeTxHash = keccak256(toUtf8Bytes('proposal'));
    const signature = await outsider.signMessage(getBytes(safeTxHash));

    await expect(async () => {
      SafeTransactionService.createTransaction(safe, {
        safeTxHash,
        senderAddress: outsider.address,
        senderSignature: signature,
      });
    }).rejects.toThrow(`Signer ${outsider.address.toLowerCase()} is not a Safe owner`);
  });

  it('rejects mismatched declared owner', async () => {
    const safeTxHash = keccak256(toUtf8Bytes('proposal'));
    const signature = await ownerWallet.signMessage(getBytes(safeTxHash));

    expect(() =>
      SafeTransactionService.validateConfirmation(
        safe,
        safeTxHash,
        '0x00000000000000000000000000000000000000b2',
        signature,
      ),
    ).toThrow('Signature owner mismatch');
  });

  it('does not duplicate confirmations for the same owner', () => {
    const tx: SafeTransactionRecord = {
      safe: safe.address,
      safeTxHash: '0xabc',
      nonce: '1',
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
      owners: [...safe.owners],
    };

    expect(SafeTransactionService.addConfirmation(tx, ownerWallet.address.toLowerCase(), '0xsig')).toBe(true);
    expect(SafeTransactionService.addConfirmation(tx, ownerWallet.address.toLowerCase(), '0xsig')).toBe(false);
    expect(tx.confirmations).toHaveLength(1);
  });
});
