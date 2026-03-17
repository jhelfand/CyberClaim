import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, unauthorizedResponse } from "@/lib/api-route";
import { getClaimById, setClaimUiPathMetadata } from "@/lib/mock-store";
import { refreshClaimSnapshot } from "@/lib/uipath/security-claims";
import { isRequestAuthenticated } from "@/lib/uipath/server-sdk";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> },
) {
  if (!isRequestAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const { claimId } = await context.params;
  const claim = getClaimById(claimId);

  if (!claim) {
    return errorResponse("Claim not found.", 404);
  }

  try {
    const snapshot = await refreshClaimSnapshot(request, claim);
    if (snapshot) {
      setClaimUiPathMetadata(claimId, snapshot);
    }
  } catch (error) {
    setClaimUiPathMetadata(claimId, {
      syncState: claim.uipath.processJobIds.length > 0 ? "partial" : "error",
      lastSyncAttemptAt: new Date().toISOString(),
      lastSyncError: error instanceof Error ? error.message : "Unable to refresh UiPath snapshot.",
    });
  }

  return NextResponse.json(getClaimById(claimId));
}
