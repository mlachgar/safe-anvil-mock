import type { SafeState, SafeTransactionRecord } from '../model/safe-state.model.js';
import { getConfirmationInput, getNonce, getSafeTxHash, type ConfirmationInput } from '../utils/payload.utils.js';
import { recoverOwnerFromSignature } from '../utils/signature.utils.js';

export class SafeTransactionService {
  static getConfirmationInput(body: Record<string, unknown>): ConfirmationInput {
    return getConfirmationInput(body);
  }

  static validateConfirmation(safe: SafeState, safeTxHash: string, owner: string | null, signature: string): string {
    const recoveredOwner = recoverOwnerFromSignature(safeTxHash, signature);
    if (!recoveredOwner) {
      throw new Error('Unable to recover signer from signature');
    }

    if (owner && recoveredOwner !== owner) {
      throw new Error(`Signature owner mismatch. expected=${owner} actual=${recoveredOwner}`);
    }

    if (!safe.owners.includes(recoveredOwner)) {
      throw new Error(`Signer ${recoveredOwner} is not a Safe owner`);
    }

    return recoveredOwner;
  }

  static createTransaction(safe: SafeState, body: Record<string, unknown>): SafeTransactionRecord {
    const safeTxHash = getSafeTxHash(body);
    const input = this.getConfirmationInput(body);
    const tx: SafeTransactionRecord = {
      safe: safe.address,
      safeTxHash,
      nonce: getNonce(body, safe.nonce),
      executed: false,
      isExecuted: false,
      txStatus: 'AWAITING_CONFIRMATIONS',
      executionDate: null,
      submissionDate: new Date().toISOString(),
      modified: new Date().toISOString(),
      confirmationsRequired: safe.threshold,
      confirmations: [],
      trusted: true,
      signatures: {},
      owners: [...safe.owners],
      ...body,
    };

    if (input.signature) {
      const confirmationOwner = this.validateConfirmation(safe, safeTxHash, input.owner, input.signature);
      this.addConfirmation(tx, confirmationOwner, input.signature);
    }

    return tx;
  }

  static addConfirmation(tx: SafeTransactionRecord, owner: string, signature: string): boolean {
    if (tx.signatures[owner]) {
      return false;
    }

    const now = new Date().toISOString();
    tx.signatures[owner] = signature;
    tx.confirmations.push({
      owner,
      submissionDate: now,
      signature,
      signatureType: 'ETH_SIGN',
    });
    tx.modified = now;
    return true;
  }
}
