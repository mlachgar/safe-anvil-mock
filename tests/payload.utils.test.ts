import { describe, expect, it, vi } from 'vitest';
import {
  getConfirmationInput,
  getExecutionPayload,
  getExecutionPayloadFromRecord,
  getNonce,
  getSafeTxHash,
  toQueryParamValue,
} from '../src/utils/payload.utils.js';

describe('payload.utils', () => {
  it('extracts owner and signature from multiple supported fields', () => {
    expect(
      getConfirmationInput({
        senderAddress: '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
        senderSignature: '0xsig',
      }),
    ).toEqual({
      owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
      signature: '0xsig',
    });

    expect(
      getConfirmationInput({
        ownerAddress: '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
        signature: '0xsig2',
      }),
    ).toEqual({
      owner: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
      signature: '0xsig2',
    });
  });

  it('extracts safeTxHash from supported fields and falls back to random bytes', () => {
    expect(getSafeTxHash({ safeTxHash: '0xabc' })).toBe('0xabc');
    expect(getSafeTxHash({ contractTransactionHash: '0xdef' })).toBe('0xdef');

    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockRestore();
    const hash = getSafeTxHash({});
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('normalizes nonce and query values', () => {
    expect(getNonce({ nonce: 12 }, '7')).toBe('12');
    expect(getNonce({}, '7')).toBe('7');
    expect(toQueryParamValue(1n)).toBe('1');
    expect(toQueryParamValue(false)).toBe('false');
    expect(toQueryParamValue({})).toBeNull();
  });

  it('builds execution payload from nested safeTransactionData', () => {
    expect(
      getExecutionPayload({
        to: '0x00000000000000000000000000000000000000a1',
        value: '0',
        data: '0x1234',
        operation: 0,
      }),
    ).toEqual({
      to: '0x00000000000000000000000000000000000000a1',
      value: '0x00',
      data: '0x1234',
    });
  });

  it('builds execution payload from flat transaction records', () => {
    expect(
      getExecutionPayloadFromRecord({
        to: '0x00000000000000000000000000000000000000a1',
        value: '10',
        data: '0xabcd',
        operation: 0,
      }),
    ).toEqual({
      to: '0x00000000000000000000000000000000000000a1',
      value: '0x0a',
      data: '0xabcd',
    });
  });

  it('rejects invalid execution payloads', () => {
    expect(() => getExecutionPayload(undefined)).toThrow('Missing safeTransactionData on proposed transaction');
    expect(() =>
      getExecutionPayload({
        to: 'not-an-address',
        operation: 0,
      }),
    ).toThrow('Invalid target address in safeTransactionData');
    expect(() =>
      getExecutionPayload({
        to: '0x00000000000000000000000000000000000000a1',
        operation: 1,
      }),
    ).toThrow('Unsupported Safe operation 1. safe-anvil-mock only supports CALL');
  });
});
