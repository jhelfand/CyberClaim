import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Authentication required. Sign in with OAuth or use the configured PAT session.",
    },
    { status: 401 },
  );
}

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed.",
      details: error.flatten(),
    },
    { status: 400 },
  );
}

export function errorResponse(message: string, status = 500, details?: string) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status },
  );
}
