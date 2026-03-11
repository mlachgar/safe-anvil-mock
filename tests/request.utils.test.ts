import { describe, expect, it } from 'vitest';
import { getRouteParam, toSearchParams } from '../src/utils/request.utils.js';

describe('request.utils', () => {
  it('extracts route params from strings, arrays, and undefined', () => {
    expect(getRouteParam('value')).toBe('value');
    expect(getRouteParam(['first', 'second'])).toBe('first');
    expect(getRouteParam([])).toBe('');
    expect(getRouteParam(undefined)).toBe('');
  });

  it('normalizes query objects into URLSearchParams', () => {
    const params = toSearchParams({
      executed: false,
      nonce__gte: 4,
      address: '0xabc',
      tags: ['one', 2, true, null, {}],
      ignored: { nested: true },
    });

    expect(params.get('executed')).toBe('false');
    expect(params.get('nonce__gte')).toBe('4');
    expect(params.get('address')).toBe('0xabc');
    expect(params.getAll('tags')).toEqual(['one', '2', 'true']);
    expect(params.has('ignored')).toBe(false);
  });
});
