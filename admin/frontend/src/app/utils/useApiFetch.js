'use client';

export function useApiFetch() {
  return async (url, options = {}) => fetch(url, options);
}
