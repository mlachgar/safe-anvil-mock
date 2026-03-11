import { toQueryParamValue } from './payload.utils.js';

export function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function toSearchParams(query: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalizedItem = toQueryParamValue(item);
        if (normalizedItem != null) {
          searchParams.append(key, normalizedItem);
        }
      }
      continue;
    }

    const normalizedValue = toQueryParamValue(value);
    if (normalizedValue != null) {
      searchParams.set(key, normalizedValue);
    }
  }

  return searchParams;
}
