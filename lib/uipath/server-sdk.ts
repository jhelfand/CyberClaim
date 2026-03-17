import type { NextRequest } from "next/server";
import { UiPath } from "@uipath/uipath-typescript/core";
import { hasServerSecretConfig, serverConfig } from "@/lib/server-config";

export const SECRET_SESSION_COOKIE = "gaig_security_claims_auth";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.replace("Bearer ", "").trim();
}

export function isSecretSession(request: NextRequest) {
  return request.cookies.get(SECRET_SESSION_COOKIE)?.value === "secret";
}

export function isRequestAuthenticated(request: NextRequest) {
  return Boolean(getBearerToken(request) || (hasServerSecretConfig() && isSecretSession(request)));
}

export function createServerSdkFromRequest(request: NextRequest) {
  if (!serverConfig.baseUrl || !serverConfig.orgName || !serverConfig.tenantName) {
    return null;
  }

  const token = getBearerToken(request) ?? (isSecretSession(request) ? serverConfig.secret : undefined);

  if (!token) {
    return null;
  }

  return new UiPath({
    baseUrl: serverConfig.baseUrl,
    orgName: serverConfig.orgName,
    tenantName: serverConfig.tenantName,
    secret: token,
  });
}
