import { NextResponse } from "next/server";
import { hasServerSecretConfig } from "@/lib/server-config";
import { SECRET_SESSION_COOKIE } from "@/lib/uipath/server-sdk";
import { errorResponse } from "@/lib/api-route";

export const runtime = "nodejs";

export async function POST() {
  if (!hasServerSecretConfig()) {
    return errorResponse("PAT login is not configured. Add UIPATH_SECRET to enable this mode.", 400);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SECRET_SESSION_COOKIE, "secret", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
