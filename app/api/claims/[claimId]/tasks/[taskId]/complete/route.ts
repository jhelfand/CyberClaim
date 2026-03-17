import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api-route";
import { completeClaimTask, getClaimById, setClaimUiPathMetadata } from "@/lib/mock-store";
import { taskCompletionSchema } from "@/lib/validators";
import { completeUiPathTask } from "@/lib/uipath/security-claims";
import { isRequestAuthenticated } from "@/lib/uipath/server-sdk";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ claimId: string; taskId: string }> },
) {
  if (!isRequestAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const parsed = taskCompletionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const { claimId, taskId } = await context.params;
  const claim = getClaimById(claimId);

  if (!claim) {
    return errorResponse("Claim not found.", 404);
  }

  const task = claim.tasks.find((item) => item.id === taskId);
  if (!task) {
    return errorResponse("Task not found.", 404);
  }

  try {
    if (task.uipathTaskId && claim.uipath.folderId) {
      await completeUiPathTask(request, task.uipathTaskId, claim.uipath.folderId);
    }
  } catch (error) {
    setClaimUiPathMetadata(claimId, {
      syncState: claim.uipath.processJobIds.length > 0 ? "partial" : "error",
      lastSyncAttemptAt: new Date().toISOString(),
      lastSyncError: error instanceof Error ? error.message : "Task completion failed in UiPath.",
    });
    return errorResponse("UiPath task completion failed.", 502);
  }

  const updatedClaim = completeClaimTask(claimId, taskId, parsed.data);
  if (!updatedClaim) {
    return errorResponse("Task could not be completed.", 500);
  }

  return NextResponse.json(updatedClaim);
}
