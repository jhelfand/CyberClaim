import { NextResponse } from "next/server";
import { SECRET_SESSION_COOKIE } from "@/lib/uipath/server-sdk";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SECRET_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
