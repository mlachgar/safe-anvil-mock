import { SafeStoreService } from './safe-store.service.js';
import { SafeTransactionService } from './safe-transaction.service.js';

export class SafeApiService {
  static getSafe(safeAddress: string): Record<string, unknown> {
    const safe = SafeStoreService.ensureSafe(safeAddress);

    return {
      address: safe.address,
      nonce: safe.nonce,
      threshold: safe.threshold,
      owners: safe.owners,
      masterCopy: '0x0000000000000000000000000000000000000009',
      modules: [],
      fallbackHandler: null,
      guard: null,
      version: '1.4.1',
    };
  }

  static listTransactions(
    safeAddress: string,
    searchParams: URLSearchParams,
  ): { count: number; next: null; previous: null; results: ReturnType<typeof SafeStoreService.listTransactions>['results'] } {
    const safe = SafeStoreService.ensureSafe(safeAddress);
    return SafeStoreService.listTransactions(safe, searchParams);
  }

  static createTransaction(safeAddress: string, body: Record<string, unknown>): Record<string, unknown> {
    const safe = SafeStoreService.ensureSafe(safeAddress);
    const tx = SafeTransactionService.createTransaction(safe, body);
    SafeStoreService.saveTransaction(safe, tx);
    return tx;
  }
}
