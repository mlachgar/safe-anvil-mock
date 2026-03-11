import { ConfirmationService } from './confirmation.service.js';
import { SafeExecutionService } from './safe-execution.service.js';
import { SafeStoreService } from './safe-store.service.js';

export class MockConfirmationApiService {
  static async confirmTransaction(safeTxHash: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const tx = SafeStoreService.getTransaction(safeTxHash);
    if (!tx) {
      return null;
    }

    if (tx.isExecuted) {
      return tx;
    }

    await ConfirmationService.applyConfirmation(tx, body);

    if (tx.confirmations.length >= tx.confirmationsRequired) {
      await SafeExecutionService.executeTransaction(tx);
    }

    return tx;
  }
}
