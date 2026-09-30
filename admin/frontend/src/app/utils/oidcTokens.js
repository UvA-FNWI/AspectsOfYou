'use client';

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function tokenClaimScore(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return token ? 1 : 0;

  let score = 0;
  if (payload.email || payload.mail) score += 2;
  if (payload.is_member_of || payload.isMemberOf) score += 3;
  if (payload.sub) score += 1;

  for (const value of Object.values(payload)) {
    if (typeof value === "string" && value.startsWith("urn:mace:surf.nl:invite")) {
      score += 3;
      break;
    }
  }

  return score;
}

/**
 * Prefer the token that carries profile/invite claims (usually id_token) for API calls.
 */
export function getOidcBearerToken(user) {
  if (!user) return null;

  const candidates = [user.access_token, user.id_token].filter(Boolean);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  return [...candidates].sort((a, b) => tokenClaimScore(b) - tokenClaimScore(a))[0];
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

    return url.origin;
  } catch {
    return null;
  }
}
