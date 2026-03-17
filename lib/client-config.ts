import type { UiPathSDKConfig } from "@uipath/uipath-typescript/core";

export function getClientSdkConfig(): UiPathSDKConfig | null {
  const baseUrl = process.env.NEXT_PUBLIC_UIPATH_BASE_URL;
  const orgName = process.env.NEXT_PUBLIC_UIPATH_ORG_NAME;
  const tenantName = process.env.NEXT_PUBLIC_UIPATH_TENANT_NAME;
  const clientId = process.env.NEXT_PUBLIC_UIPATH_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_UIPATH_REDIRECT_URI;
  const scope = process.env.NEXT_PUBLIC_UIPATH_SCOPE;

  if (!baseUrl || !orgName || !tenantName || !clientId || !redirectUri || !scope) {
    return null;
  }

  return {
    baseUrl,
    orgName,
    tenantName,
    clientId,
    redirectUri,
    scope,
  };
}

export function hasClientOAuthConfig() {
  return getClientSdkConfig() !== null;
}
