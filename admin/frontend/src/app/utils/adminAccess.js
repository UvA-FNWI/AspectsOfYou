'use client';

import { getOidcBearerToken } from "./oidcTokens";
import { isAdminInviteMember } from "./publicRoutes";

export async function resolveAdminAccess(authUser) {
  const token = getOidcBearerToken(authUser);
  if (!token) {
    return { isAdmin: false, source: "none" };
  }

  const apiUrl = process.env.NEXT_PUBLIC_DOTNET_API_URL || "http://localhost:5059";

  try {
    const response = await fetch(`${apiUrl}/api/auth/admin-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.debug("[admin-access] API result", data);
      }
      return {
        isAdmin: !!data.isAdmin,
        source: "api",
        memberships: data.memberships ?? [],
      };
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[admin-access] API check failed", response.status);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[admin-access] API check error", error);
    }
  }

  return {
    isAdmin: isAdminInviteMember(authUser),
    source: "client",
    memberships: [],
  };
}
