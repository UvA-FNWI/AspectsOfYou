'use client';

import { AuthProvider, useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isPublicAppRoute } from "../utils/publicRoutes";
import { getOidcBearerToken, resolveOidcResource } from "../utils/oidcTokens";
import { resolveAdminAccess } from "../utils/adminAccess";

const oidcResource = resolveOidcResource();

const oidcConfig = {
  authority: process.env.NEXT_PUBLIC_OIDC_AUTHORITY || "https://connect.surfconext.nl",
  client_id: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || "aspectsofyou.datanose.nl",
  redirect_uri:
    process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI ||
    (typeof window !== "undefined" ? window.location.origin : ""),
  post_logout_redirect_uri:
    process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI ||
    (typeof window !== "undefined" ? window.location.origin : ""),
  scope: process.env.NEXT_PUBLIC_OIDC_SCOPE || "openid profile email",
  loadUserInfo: true,
  ...(oidcResource
    ? {
        extraQueryParams: { resource: oidcResource },
        extraTokenParams: { resource: oidcResource },
      }
    : {}),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

function PublicRoute({ children }) {
  return <>{children}</>;
}

function AdminAuthHandler({ children }) {
  const auth = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [adminAccess, setAdminAccess] = useState("loading");

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !hasCheckedAuth && !auth.activeNavigator) {
      auth.signinRedirect();
      setHasCheckedAuth(true);
    }
  }, [auth, hasCheckedAuth]);

  useEffect(() => {
    if (!auth.isAuthenticated || !getOidcBearerToken(auth.user)) {
      setAdminAccess("loading");
      return;
    }

    let cancelled = false;

    resolveAdminAccess(auth.user).then((result) => {
      if (cancelled) return;
      setAdminAccess(result.isAdmin ? "granted" : "denied");
    });

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.user]);

  if (auth.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading authentication...
      </div>
    );
  }

  if (auth.error) {
    return <div>Authentication error: {auth.error.message}</div>;
  }

  if (!auth.isAuthenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Redirecting to login...
      </div>
    );
  }

  if (!getOidcBearerToken(auth.user)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading access token...
      </div>
    );
  }

  if (adminAccess === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Checking administrator access...
      </div>
    );
  }

  if (adminAccess === "denied") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "1rem",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>No administrator access</h1>
        <p style={{ maxWidth: "32rem" }}>
          You are signed in with SURFconext, but this account is not in the AspectsOfYou
          administrator invite list. Creating and managing surveys is only available to invited
          admins. You can still fill in the survey or open the public displays below.
        </p>
        <p style={{ maxWidth: "32rem", fontSize: "0.875rem", color: "#4b5563" }}>
          If you should have access, accept the SURFconext Invite e-mail for AspectsOfYou or ask
          the application owner to add you to the invite group, then sign out and sign in again.
        </p>
        <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/fillinthesurvey">Fill in the survey</a>
          <a href="/display1">Display 1</a>
          <a href="/display2">Display 2</a>
          <a href="/display3">Display 3</a>
        </p>
        <button type="button" onClick={() => auth.signoutRedirect()}>
          Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function RouteAwareAuth({ children }) {
  const pathname = usePathname();

  if (isPublicAppRoute(pathname)) {
    return <PublicRoute>{children}</PublicRoute>;
  }

  return <AdminAuthHandler>{children}</AdminAuthHandler>;
}

export default function AuthWrapper({ children }) {
  return (
    <AuthProvider {...oidcConfig}>
      <RouteAwareAuth>{children}</RouteAwareAuth>
    </AuthProvider>
  );
}
