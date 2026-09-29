'use client';

import { useCallback } from "react";
import { useAuth } from "react-oidc-context";

export function useAuthAccessToken() {
  const auth = useAuth();
  return auth.user?.access_token ?? null;
}

export function useAuthenticatedFetch() {
  const auth = useAuth();
  const accessToken = auth.user?.access_token;

  return useCallback(
    async (url, options = {}) => {
      const token = accessToken ?? auth.user?.access_token;
      const headers = {
        ...options.headers,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [accessToken, auth.user?.access_token]
  );
}
