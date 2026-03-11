import { describe, expect, it } from 'vitest';
import { Wallet, ethers } from 'ethers';
import { recoverOwnerFromSignature } from '../src/utils/signature.utils.js';

describe('signature.utils', () => {
  it('recovers the owner from an eth_sign style signature', async () => {
    const wallet = new Wallet('0x' + '1'.repeat(64));
    const safeTxHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('safe-tx'));
    const signature = await wallet.signMessage(ethers.utils.arrayify(safeTxHash));

    expect(recoverOwnerFromSignature(safeTxHash, signature)).toBe(wallet.address.toLowerCase());
  });

  it('returns null for invalid signatures', () => {
    expect(recoverOwnerFromSignature('0x' + '0'.repeat(64), '0xdeadbeef')).toBeNull();
  });
});
