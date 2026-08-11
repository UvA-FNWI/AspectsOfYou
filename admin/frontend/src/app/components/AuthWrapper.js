'use client';

import { AuthProvider, useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";

// Browser OIDC config must only contain public-client values.
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
    // Clear URL parameters after signin
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

function AuthHandler({ children }) {
  const auth = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // If not authenticated, not loading, and haven't checked yet, redirect to login
    if (!auth.isLoading && !auth.isAuthenticated && !hasCheckedAuth && !auth.activeNavigator) {
      auth.signinRedirect();
      setHasCheckedAuth(true);
    }
  }, [auth, hasCheckedAuth]);

  if (auth.isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading authentication...</div>;
  }

  if (auth.error) {
    return <div>Authentication error: {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return <>{children}</>;
  }

  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Redirecting to login...</div>;
}

export default function AuthWrapper({ children }) {
  return (
    <AuthProvider {...oidcConfig}>
      <AuthHandler>{children}</AuthHandler>
    </AuthProvider>
  );
}
