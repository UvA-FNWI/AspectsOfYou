'use client';

export function getOidcBearerToken(user) {
  if (!user) return null;
  return user.access_token ?? user.id_token ?? null;
}

/**
 * SURFconext requires resource to be an absolute URI without query or fragment.
 * Set NEXT_PUBLIC_OIDC_RESOURCE to "off" to omit the parameter entirely.
 */
export function resolveOidcResource() {
  const raw = process.env.NEXT_PUBLIC_OIDC_RESOURCE?.trim();
  if (raw?.toLowerCase() === "off" || raw === "") {
    return null;
  }

  const candidate = raw || "https://api.aspectsofyou.datanose.nl";

  try {
    const withScheme = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;

    const url = new URL(withScheme);
    if (url.search || url.hash) {
      return null;
    }

    // Resource identifiers are typically origin-only for SURFconext API clients.
    return url.origin;
  } catch {
    return null;
  }
}
