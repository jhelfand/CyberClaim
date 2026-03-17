"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { UiPath } from "@uipath/uipath-typescript/core";
import { getClientSdkConfig } from "@/lib/client-config";

type AuthMode = "oauth" | "secret" | null;

interface AuthContextValue {
  sdk: UiPath | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: AuthMode;
  oauthConfigured: boolean;
  secretConfigured: boolean;
  error: string | null;
  loginWithOAuth: () => Promise<void>;
  loginWithSecret: () => Promise<void>;
  logout: () => Promise<void>;
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function createSdk() {
  const config = getClientSdkConfig();
  return config ? new UiPath(config) : null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [sdk, setSdk] = useState<UiPath | null>(() => createSdk());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [oauthConfigured, setOauthConfigured] = useState(Boolean(getClientSdkConfig()));
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/status", {
        cache: "no-store",
        credentials: "include",
      });
      const status = (await response.json()) as {
        oauthConfigured: boolean;
        secretConfigured: boolean;
        secretAuthenticated: boolean;
      };

      let currentSdk = sdk;
      if (!currentSdk && status.oauthConfigured) {
        currentSdk = createSdk();
        setSdk(currentSdk);
      }

      let oauthAuthenticated = false;
      if (currentSdk) {
        if (currentSdk.isInOAuthCallback()) {
          await currentSdk.completeOAuth();
        }
        oauthAuthenticated = currentSdk.isAuthenticated();
      }

      setOauthConfigured(status.oauthConfigured);
      setSecretConfigured(status.secretConfigured);
      setIsAuthenticated(oauthAuthenticated || status.secretAuthenticated);
      setAuthMode(oauthAuthenticated ? "oauth" : status.secretAuthenticated ? "secret" : null);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication bootstrap failed.");
      setIsAuthenticated(false);
      setAuthMode(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function loginWithOAuth() {
    const currentSdk = sdk ?? createSdk();
    if (!currentSdk) {
      setError("OAuth is not configured. Add the NEXT_PUBLIC_UIPATH_* values to enable it.");
      return;
    }

    setSdk(currentSdk);
    setError(null);
    setIsLoading(true);

    try {
      await currentSdk.initialize();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "OAuth sign-in failed.");
      setIsLoading(false);
    }
  }

  async function loginWithSecret() {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/secret-login", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "PAT sign-in failed.");
      }

      await refreshStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "PAT sign-in failed.");
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);

    try {
      sdk?.logout();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setSdk(createSdk());
      setIsAuthenticated(false);
      setAuthMode(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers);

    if (authMode === "oauth") {
      const token = sdk?.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    return fetch(input, {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        sdk,
        isAuthenticated,
        isLoading,
        authMode,
        oauthConfigured,
        secretConfigured,
        error,
        loginWithOAuth,
        loginWithSecret,
        logout,
        authorizedFetch,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
