'use client';

export function getOidcBearerToken(user) {
  if (!user) return null;
  return user.access_token ?? user.id_token ?? null;
}
