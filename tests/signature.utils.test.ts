import { describe, expect, it } from 'vitest';
import { Wallet, getBytes, hexlify, keccak256, toUtf8Bytes } from 'ethers';
import { recoverOwnerFromSignature, recoverOwnersFromSignature } from '../src/utils/signature.utils.js';

describe('signature.utils', () => {
  it('recovers the owner from an eth_sign style signature', async () => {
    const wallet = new Wallet('0x' + '1'.repeat(64));
    const safeTxHash = keccak256(toUtf8Bytes('safe-tx'));
    const signature = await wallet.signMessage(getBytes(safeTxHash));

    expect(recoverOwnersFromSignature(safeTxHash, signature)).toContain(wallet.address.toLowerCase());
    expect(recoverOwnerFromSignature(safeTxHash, signature)).toBeNull();
  });

  it('recovers the owner when the client signs the hex string itself', async () => {
    const wallet = new Wallet('0x' + '1'.repeat(64));
    const safeTxHash = keccak256(toUtf8Bytes('safe-tx'));
    const signature = await wallet.signMessage(safeTxHash);

    expect(recoverOwnersFromSignature(safeTxHash, signature)).toContain(wallet.address.toLowerCase());
    expect(recoverOwnerFromSignature(safeTxHash, signature)).toBeNull();
  });

  it('recovers the owner from a Safe eth_sign signature with adjusted v', async () => {
    const wallet = new Wallet('0x' + '1'.repeat(64));
    const safeTxHash = keccak256(toUtf8Bytes('safe-tx'));
    const signature = await wallet.signMessage(getBytes(safeTxHash));
    const bytes = getBytes(signature);
    bytes[64] += 4;
    const safeSignature = hexlify(bytes);

    expect(recoverOwnersFromSignature(safeTxHash, safeSignature)).toContain(wallet.address.toLowerCase());
  });

  it('returns null for invalid signatures', () => {
    expect(recoverOwnerFromSignature('0x' + '0'.repeat(64), '0xdeadbeef')).toBeNull();
  });
});
