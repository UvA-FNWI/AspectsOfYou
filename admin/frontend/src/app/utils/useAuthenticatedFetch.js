'use client';

import { useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { getOidcBearerToken } from "./oidcTokens";

export function useAuthAccessToken() {
  const auth = useAuth();
  return getOidcBearerToken(auth.user);
}

export function useAuthenticatedFetch() {
  const auth = useAuth();
  const bearerToken = getOidcBearerToken(auth.user);

  return useCallback(
    async (url, options = {}) => {
      const token = bearerToken ?? getOidcBearerToken(auth.user);
      if (!token) {
        throw new Error("OIDC bearer token is not available yet.");
      }

      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [auth.user, bearerToken]
  );
}
