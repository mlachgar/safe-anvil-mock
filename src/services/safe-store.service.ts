import type { SafeState, SafeTransactionRecord } from '../model/safe-state.model.js';
import { getConfiguredOwners, getConfiguredThreshold } from '../utils/safe-env.utils.js';

export class SafeStoreService {
  private static readonly safes = new Map<string, SafeState>();
  private static readonly txByHash = new Map<string, SafeTransactionRecord>();

  static reset(): void {
    this.safes.clear();
    this.txByHash.clear();
  }

  static ensureSafe(address: string): SafeState {
    const key = String(address).toLowerCase();
    let safe = this.safes.get(key);

    if (!safe) {
      const owners = getConfiguredOwners();
      safe = {
        address: key,
        nonce: '0',
        threshold: getConfiguredThreshold(owners),
        owners,
        txs: [],
      };
      this.safes.set(key, safe);
    }

    return safe;
  }

  static getTransaction(safeTxHash: string): SafeTransactionRecord | undefined {
    return this.txByHash.get(safeTxHash);
  }

  static saveTransaction(safe: SafeState, tx: SafeTransactionRecord): void {
    this.txByHash.set(tx.safeTxHash, tx);
    safe.txs = safe.txs.filter((item) => item.safeTxHash !== tx.safeTxHash);
    safe.txs.push(tx);
    safe.nonce = (BigInt(tx.nonce) + 1n).toString();
  }

  static listTransactions(safe: SafeState, searchParams: URLSearchParams): { count: number; next: null; previous: null; results: SafeTransactionRecord[] } {
    let items = [...safe.txs];

    if (searchParams.get('executed') != null) {
      const executed = searchParams.get('executed') === 'true';
      items = items.filter((tx) => tx.executed === executed);
    }

    const nonce = searchParams.get('nonce');
    if (nonce != null) {
      items = items.filter((tx) => String(tx.nonce) === String(nonce));
    }

    const minNonce = searchParams.get('nonce__gte');
    if (minNonce != null) {
      items = items.filter((tx) => BigInt(tx.nonce) >= BigInt(minNonce));
    }

    return {
      count: items.length,
      next: null,
      previous: null,
      results: items,
    };
  }
}
