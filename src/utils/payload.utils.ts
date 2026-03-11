import { ethers } from 'ethers';
import crypto from 'node:crypto';
import type { SafeTransactionData } from '../model/safe-state.model.js';
import { normalizeAddress } from './address.utils.js';

export interface ConfirmationInput {
  owner: string | null;
  signature: string | null;
}

export function toQueryParamValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

export function getConfirmationInput(body: Record<string, unknown>): ConfirmationInput {
  const signatureCandidate = body.senderSignature ?? body.signature;

  return {
    owner: normalizeAddress(body.senderAddress || body.sender || body.owner || body.ownerAddress),
    signature: typeof signatureCandidate === 'string' ? signatureCandidate : null,
  };
}

export function getSafeTxHash(body: Record<string, unknown>): string {
  const safeTxHashCandidate = body.safeTxHash ?? body.contractTransactionHash;
  return typeof safeTxHashCandidate === 'string' && safeTxHashCandidate
    ? safeTxHashCandidate
    : `0x${crypto.randomBytes(32).toString('hex')}`;
}

export function getNonce(body: Record<string, unknown>, fallbackNonce: string): string {
  const nonceCandidate = body.nonce;
  return typeof nonceCandidate === 'string' || typeof nonceCandidate === 'number'
    ? String(nonceCandidate)
    : fallbackNonce;
}

export function getExecutionPayload(data?: SafeTransactionData): { to: string; value: string; data: string } {
  if (!data || typeof data !== 'object') {
    throw new Error('Missing safeTransactionData on proposed transaction');
  }

  const to = normalizeAddress(data.to);
  if (!to) {
    throw new Error('Invalid target address in safeTransactionData');
  }

  const operation = Number(data.operation || 0);
  if (operation !== 0) {
    throw new Error(`Unsupported Safe operation ${operation}. safe-anvil-mock only supports CALL`);
  }

  return {
    to,
    data: typeof data.data === 'string' && data.data ? data.data : '0x',
    value: ethers.BigNumber.from(data.value || 0).toHexString(),
  };
}

export function getExecutionPayloadFromRecord(record: Record<string, unknown>): { to: string; value: string; data: string } {
  const nestedData = record.safeTransactionData;
  if (nestedData && typeof nestedData === 'object') {
    return getExecutionPayload(nestedData as SafeTransactionData);
  }

  return getExecutionPayload({
    to: record.to as string | undefined,
    value: record.value as string | undefined,
    data: record.data as string | undefined,
    operation: typeof record.operation === 'number' ? record.operation : Number(record.operation || 0),
  });
}
