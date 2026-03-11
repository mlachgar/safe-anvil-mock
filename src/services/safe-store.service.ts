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

    const ordering = searchParams.get('ordering');
    if (ordering) {
      const descending = ordering.startsWith('-');
      const field = descending ? ordering.slice(1) : ordering;
      items.sort((left, right) => this.compareTransactions(left, right, field, descending));
    }

    const count = items.length;
    const offset = this.parsePositiveInteger(searchParams.get('offset'), 0);
    const limit = this.parsePositiveInteger(searchParams.get('limit'), count);
    items = items.slice(offset, offset + limit);

    return {
      count,
      next: null,
      previous: null,
      results: items,
    };
  }

  private static compareTransactions(
    left: SafeTransactionRecord,
    right: SafeTransactionRecord,
    field: string,
    descending: boolean,
  ): number {
    const direction = descending ? -1 : 1;

    switch (field) {
      case 'nonce':
        return this.compareBigIntLike(left.nonce, right.nonce) * direction;
      case 'submissionDate':
      case 'modified':
      case 'executionDate':
        return this.compareNullableStrings(this.getComparableString(left[field]), this.getComparableString(right[field])) * direction;
      default:
        return this.compareNullableStrings(this.getComparableString(left[field]), this.getComparableString(right[field])) * direction;
    }
  }

  private static compareBigIntLike(left: string, right: string): number {
    const leftValue = BigInt(left);
    const rightValue = BigInt(right);
    if (leftValue === rightValue) {
      return 0;
    }

    return leftValue > rightValue ? 1 : -1;
  }

  private static getComparableString(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }

    return null;
  }

  private static compareNullableStrings(left: string | null, right: string | null): number {
    if (left === right) {
      return 0;
    }

    if (left == null) {
      return -1;
    }

    if (right == null) {
      return 1;
    }

    return left.localeCompare(right);
  }

  private static parsePositiveInteger(value: string | null, fallback: number): number {
    if (value == null || value === '') {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return fallback;
    }

    return parsed;
  }
}
