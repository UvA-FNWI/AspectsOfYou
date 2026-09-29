export const ADMIN_INVITE_MEMBER_OF =
  process.env.NEXT_PUBLIC_ADMIN_INVITE_MEMBER_OF ||
  "urn:mace:surf.nl:invite.surfconext.nl:f97d2c83-6819-4567-a549-35d737304755:datanose_-_aspects_of_you";

export function isPublicAppRoute(pathname) {
  if (!pathname) return false;

  const publicPrefixes = [
    "/display1",
    "/display2",
    "/display3",
    "/fillinthesurvey",
    "/survey_taking",
  ];

  if (publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  return /^\/survey\/[^/]+\/preview\/?$/.test(pathname);
}

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

export function readIsMemberOfClaims(profile, accessTokenPayload) {
  const sources = [profile, accessTokenPayload].filter(Boolean);
  const memberships = [];

  for (const source of sources) {
    const raw =
      source.is_member_of ??
      source.isMemberOf ??
      source["urn:mace:dir:attribute-def:isMemberOf"];

    if (!raw) continue;
    memberships.push(...(Array.isArray(raw) ? raw : [raw]));
  }

  return memberships;
}

export function isAdminInviteMember(user) {
  const tokenPayload = decodeJwtPayload(user?.access_token);
  const memberships = readIsMemberOfClaims(user?.profile, tokenPayload);
  return memberships.some((value) => value === ADMIN_INVITE_MEMBER_OF);
}
