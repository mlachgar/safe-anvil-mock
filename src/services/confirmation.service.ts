import type { SafeConfirmation, SafeTransactionRecord } from '../model/safe-state.model.js';
import { SafeExecutionService } from './safe-execution.service.js';
import { SafeStoreService } from './safe-store.service.js';
import { SafeTransactionService } from './safe-transaction.service.js';

export class ConfirmationService {
  static listConfirmations(tx: SafeTransactionRecord): { count: number; next: null; previous: null; results: SafeConfirmation[] } {
    return {
      count: tx.confirmations.length,
      next: null,
      previous: null,
      results: tx.confirmations,
    };
  }

  static async addConfirmation(tx: SafeTransactionRecord, body: Record<string, unknown>): Promise<SafeConfirmation | null> {
    await this.applyConfirmation(tx, body);
    return tx.confirmations.at(-1) ?? null;
  }

  static async applyConfirmation(tx: SafeTransactionRecord, body: Record<string, unknown>): Promise<void> {
    const input = SafeTransactionService.getConfirmationInput(body);
    let owner: string | null = null;
    let signature: string | null = null;

    if (input.signature) {
      owner = SafeTransactionService.validateConfirmation(
        SafeStoreService.ensureSafe(tx.safe),
        tx.safeTxHash,
        input.owner,
        input.signature,
      );
      signature = input.signature;
    } else if (tx.confirmations.length < tx.confirmationsRequired) {
      const autoConfirmation = await SafeExecutionService.buildAutoConfirmation(tx);
      owner = autoConfirmation.owner;
      signature = autoConfirmation.signature;
    }

    if (owner && signature) {
      SafeTransactionService.addConfirmation(tx, owner, signature);
    }
  }
}
