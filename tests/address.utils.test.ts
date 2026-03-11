import { describe, expect, it } from 'vitest';
import { normalizeAddress, normalizePrivateKey, splitCsv } from '../src/utils/address.utils.js';

describe('address.utils', () => {
  it('normalizes valid addresses to lowercase checksum-free strings', () => {
    expect(normalizeAddress('0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A')).toBe(
      '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
    );
  });

  it('returns null for invalid or non-primitive addresses', () => {
    expect(normalizeAddress('not-an-address')).toBeNull();
    expect(normalizeAddress({ value: '0x123' })).toBeNull();
  });

  it('normalizes private keys with or without 0x prefix', () => {
    const rawKey = '1'.repeat(64);
    expect(normalizePrivateKey(rawKey)).toBe(`0x${rawKey}`);
    expect(normalizePrivateKey(`0x${rawKey}`)).toBe(`0x${rawKey}`);
  });

  it('rejects malformed private keys', () => {
    expect(normalizePrivateKey('1234')).toBeNull();
    expect(normalizePrivateKey(false)).toBeNull();
  });

  it('splits csv values and drops empty entries', () => {
    expect(splitCsv(' a, ,b,c ')).toEqual(['a', 'b', 'c']);
    expect(splitCsv(undefined)).toEqual([]);
  });
});
