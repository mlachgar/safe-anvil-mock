import { afterEach, describe, expect, it } from 'vitest';
import { Wallet } from 'ethers';
import { getConfiguredOwners, getConfiguredThreshold } from '../src/utils/safe-env.utils.js';

const originalEnv = { ...process.env };

describe('safe-env.utils', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds a unique owner list from csv, system key and confirmer key', () => {
    process.env.SAFE_MOCK_OWNERS = [
      '0x00000000000000000000000000000000000000a1',
      '0x00000000000000000000000000000000000000A1',
      '0x00000000000000000000000000000000000000b2',
    ].join(',');
    process.env.SYSTEM_PUBLIC_KEY = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A';
    process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY = '0x' + '2'.repeat(64);

    expect(getConfiguredOwners()).toEqual([
      '0x00000000000000000000000000000000000000a1',
      '0x00000000000000000000000000000000000000b2',
      '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
      new Wallet(process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY).address.toLowerCase(),
    ]);
  });

  it('falls back to the default owner when nothing is configured', () => {
    delete process.env.SAFE_MOCK_OWNERS;
    delete process.env.SYSTEM_PUBLIC_KEY;
    delete process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY;

    expect(getConfiguredOwners()).toEqual(['0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a']);
  });

  it('returns the configured threshold capped by owner count', () => {
    process.env.SAFE_MOCK_THRESHOLD = '5';
    expect(getConfiguredThreshold(['a', 'b'])).toBe(2);
  });

  it('defaults threshold to the owner count when absent or invalid', () => {
    delete process.env.SAFE_MOCK_THRESHOLD;
    expect(getConfiguredThreshold(['a', 'b', 'c'])).toBe(3);

    process.env.SAFE_MOCK_THRESHOLD = '0';
    expect(getConfiguredThreshold(['a'])).toBe(1);
  });
});
