'use client';

import { AuthProvider, useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";

// TODO: move hard-coded config values somewhere
const oidcConfig = {
  authority: "https://auth-pr.datanose.nl",
  client_id: "datanose.local",
  redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
  post_logout_redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
  scope: "openid profile email", // Typical OIDC scopes
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
