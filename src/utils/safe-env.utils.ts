import { Wallet } from 'ethers';
import { normalizeAddress, normalizePrivateKey, splitCsv } from './address.utils.js';

const DEFAULT_OWNER = '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a';

export function getConfiguredOwners(): string[] {
  const owners: string[] = [];

  for (const owner of splitCsv(process.env.SAFE_MOCK_OWNERS)) {
    const normalizedOwner = normalizeAddress(owner);
    if (normalizedOwner) {
      owners.push(normalizedOwner);
    }
  }

  const systemOwner = normalizeAddress(process.env.SYSTEM_PUBLIC_KEY);
  if (systemOwner) {
    owners.push(systemOwner);
  }

  const confirmerPrivateKey = normalizePrivateKey(process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY);
  if (confirmerPrivateKey) {
    owners.push(new Wallet(confirmerPrivateKey).address.toLowerCase());
  }

  const uniqueOwners = [...new Set(owners)].filter(Boolean);
  return uniqueOwners.length ? uniqueOwners : [DEFAULT_OWNER];
}

export function getConfiguredThreshold(owners: string[]): number {
  const configured = Number(process.env.SAFE_MOCK_THRESHOLD || 0);
  if (Number.isInteger(configured) && configured > 0) {
    return Math.min(configured, Math.max(owners.length, 1));
  }

  return Math.max(owners.length, 1);
}
