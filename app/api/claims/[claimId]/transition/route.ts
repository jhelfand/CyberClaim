import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api-route";
import { attachUiPathTaskIds, getClaimById, setClaimUiPathMetadata, transitionClaim } from "@/lib/mock-store";
import { transitionSchema } from "@/lib/validators";
import { closeUiPathCase, createUiPathTasksForStage } from "@/lib/uipath/security-claims";
import { isRequestAuthenticated } from "@/lib/uipath/server-sdk";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> },
) {
  if (!isRequestAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const parsed = transitionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const { claimId } = await context.params;
  const result = transitionClaim(claimId, parsed.data);

  if (result.error) {
    return errorResponse(result.error, result.error === "Claim not found." ? 404 : 409);
  }

  if (!result.claim) {
    return errorResponse("Claim not found.", 404);
  }

  try {
    const taskLinks = await createUiPathTasksForStage(request, result.claim);
    if (taskLinks.length > 0) {
      attachUiPathTaskIds(claimId, result.claim.stage, taskLinks);
    }

    if (result.claim.stage === "Close") {
      await closeUiPathCase(request, result.claim, parsed.data.note);
    }

    setClaimUiPathMetadata(claimId, {
      lastSyncAttemptAt: new Date().toISOString(),
      lastSyncError: undefined,
    });
  } catch (error) {
    setClaimUiPathMetadata(claimId, {
      syncState: result.claim.uipath.processJobIds.length > 0 ? "partial" : "error",
      lastSyncAttemptAt: new Date().toISOString(),
      lastSyncError: error instanceof Error ? error.message : "Stage sync failed.",
    });
  }

  const updatedClaim = getClaimById(claimId);
  if (!updatedClaim) {
    return errorResponse("Claim not found after transition.", 404);
  }

  return NextResponse.json(updatedClaim);
}
