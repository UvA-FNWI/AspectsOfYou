'use client';

import { AuthProvider, useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isAdminInviteMember, isPublicAppRoute } from "../utils/publicRoutes";

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

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !hasCheckedAuth && !auth.activeNavigator) {
      auth.signinRedirect();
      setHasCheckedAuth(true);
    }
  }, [auth, hasCheckedAuth]);

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

  if (!auth.user?.access_token) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading access token...
      </div>
    );
  }

  if (!isAdminInviteMember(auth.user)) {
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
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Admin workspace</h1>
        <p style={{ maxWidth: "32rem" }}>
          You are signed in with SURFconext. Managing surveys is limited to invited administrators
          (via the <code>isMemberOf</code> invite group). You can still use the public survey and
          display pages without admin access.
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
