import { getAddress, isHexString } from 'ethers';

function toPrimitiveString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

export function normalizeAddress(value: unknown): string | null {
  const candidate = toPrimitiveString(value);
  if (!candidate) {
    return null;
  }

  try {
    return getAddress(candidate).toLowerCase();
  } catch {
    return null;
  }
}

export function normalizePrivateKey(value: unknown): string | null {
  const candidate = toPrimitiveString(value);
  if (!candidate) {
    return null;
  }

  const normalized = candidate.startsWith('0x') ? candidate : `0x${candidate}`;
  return isHexString(normalized, 32) ? normalized : null;
}

export function splitCsv(value: unknown): string[] {
  const candidate = toPrimitiveString(value) ?? '';

  return candidate
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
