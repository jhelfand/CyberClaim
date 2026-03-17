import { NextResponse } from "next/server";
import { hasServerSecretConfig, serverConfig } from "@/lib/server-config";
import { isSecretSession } from "@/lib/uipath/server-sdk";
import { hasClientOAuthConfig } from "@/lib/client-config";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    oauthConfigured:
      hasClientOAuthConfig() &&
      Boolean(serverConfig.baseUrl && serverConfig.orgName && serverConfig.tenantName),
    secretConfigured: hasServerSecretConfig(),
    secretAuthenticated: isSecretSession(request),
  });
}
