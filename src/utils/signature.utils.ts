import { getBytes, hexlify, recoverAddress, verifyMessage } from 'ethers';
import { normalizeAddress } from './address.utils.js';

function withNormalizedV(signature: string): string[] {
  try {
    const bytes = getBytes(signature);
    if (bytes.length === 65 && bytes[64] > 30) {
      const normalized = new Uint8Array(bytes);
      normalized[64] -= 4;
      return [signature, hexlify(normalized)];
    }
  } catch {
    return [signature];
  }

  return [signature];
}

export function recoverOwnersFromSignature(safeTxHash: string, signature: string): string[] {
  const recoveredOwners = new Set<string>();

  for (const candidateSignature of withNormalizedV(signature)) {
    const attempts = [
      () => verifyMessage(getBytes(safeTxHash), candidateSignature),
      () => verifyMessage(safeTxHash, candidateSignature),
      () => recoverAddress(safeTxHash, candidateSignature),
    ];

    for (const attempt of attempts) {
      try {
        const recoveredOwner = normalizeAddress(attempt());
        if (recoveredOwner) {
          recoveredOwners.add(recoveredOwner);
        }
      } catch {
        continue;
      }
    }
  }

  return [...recoveredOwners];
}

export function recoverOwnerFromSignature(safeTxHash: string, signature: string): string | null {
  const recoveredOwners = recoverOwnersFromSignature(safeTxHash, signature);
  return recoveredOwners.length === 1 ? recoveredOwners[0] : null;
}
