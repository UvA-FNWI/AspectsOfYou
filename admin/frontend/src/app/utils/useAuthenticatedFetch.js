'use client';

import { useAuth } from "react-oidc-context";

export function useAuthenticatedFetch() {
  const auth = useAuth();

  const authenticatedFetch = async (url, options = {}) => {
    const token = auth.user?.access_token;
    
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return authenticatedFetch;
}
