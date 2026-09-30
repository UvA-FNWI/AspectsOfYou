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

function appendMembershipValue(memberships, value) {
  if (typeof value === "string" && value.trim()) {
    memberships.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendMembershipValue(memberships, item);
    }
  }
}

function readIsMemberOfFromObject(source) {
  const memberships = [];
  if (!source || typeof source !== "object") return memberships;

  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === "is_member_of" ||
      normalizedKey === "ismemberof" ||
      normalizedKey === "edumember_is_member_of" ||
      normalizedKey.includes("ismemberof")
    ) {
      appendMembershipValue(memberships, value);
      continue;
    }

    appendMembershipValue(
      memberships,
      typeof value === "string" && value.startsWith("urn:mace:surf.nl:invite") ? value : null
    );
  }

  return memberships;
}

export function readIsMemberOfClaims(user) {
  const memberships = [];
  const sources = [
    user?.profile,
    decodeJwtPayload(user?.access_token),
    decodeJwtPayload(user?.id_token),
  ];

  for (const source of sources) {
    memberships.push(...readIsMemberOfFromObject(source));
  }

  return [...new Set(memberships)];
}

function matchesRequiredMembership(membership, requiredMemberOf) {
  if (membership === requiredMemberOf) return true;

  const requiredSuffix = requiredMemberOf.split(":").pop();
  if (!requiredSuffix) return false;

  if (membership === requiredSuffix) return true;
  if (requiredMemberOf.endsWith(`:${membership}`)) return true;
  return membership.includes(requiredSuffix);
}

export function isAdminInviteMember(user) {
  const memberships = readIsMemberOfClaims(user);
  return memberships.some((value) => matchesRequiredMembership(value, ADMIN_INVITE_MEMBER_OF));
}
