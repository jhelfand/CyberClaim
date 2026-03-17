import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api-route";
import { addClaimNote } from "@/lib/mock-store";
import { noteSchema } from "@/lib/validators";
import { isRequestAuthenticated } from "@/lib/uipath/server-sdk";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> },
) {
  if (!isRequestAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const parsed = noteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const { claimId } = await context.params;
  const claim = addClaimNote(claimId, parsed.data);

  if (!claim) {
    return errorResponse("Claim not found.", 404);
  }

  return NextResponse.json(claim);
}
