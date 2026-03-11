import { ethers } from 'ethers';
import { normalizeAddress } from './address.utils.js';

export function recoverOwnerFromSignature(safeTxHash: string, signature: string): string | null {
  const attempts = [
    () => ethers.utils.verifyMessage(ethers.utils.arrayify(safeTxHash), signature),
    () => ethers.utils.recoverAddress(safeTxHash, signature),
  ];

  for (const attempt of attempts) {
    try {
      return normalizeAddress(attempt());
    } catch {
      continue;
    }
  }

  return null;
}
