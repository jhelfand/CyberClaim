import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api-route";
import { addClaimEvidence, attachUiPathTaskIds, createClaim, getClaimById, listClaims, setClaimUiPathMetadata } from "@/lib/mock-store";
import { saveUploadedFile } from "@/lib/file-storage";
import { claimIntakeSchema } from "@/lib/validators";
import { isRequestAuthenticated } from "@/lib/uipath/server-sdk";
import { syncNewClaimToUiPath } from "@/lib/uipath/security-claims";
import { serverConfig } from "@/lib/server-config";
import type { ClaimEvidence } from "@/types/security-claim";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const searchParams = request.nextUrl.searchParams;
  const result = listClaims({
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const formData = await request.formData();
  const parsed = claimIntakeSchema.safeParse({
    policyholder: formData.get("policyholder"),
    incidentType: formData.get("incidentType"),
    dateTime: formData.get("dateTime"),
    location: formData.get("location"),
    securityVendor: formData.get("securityVendor"),
    policeReportNumber: formData.get("policeReportNumber"),
    lawEnforcementContact: formData.get("lawEnforcementContact"),
    cctvAvailable: formData.get("cctvAvailable"),
    propertyType: formData.get("propertyType"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    assignedAdjuster: formData.get("assignedAdjuster"),
  });

  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const files = formData
    .getAll("evidence")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const createdClaim = createClaim(parsed.data);

  let syncOutcome;
  try {
    syncOutcome = await syncNewClaimToUiPath(request, createdClaim, files);
  } catch (error) {
    syncOutcome = {
      metadata: {
        syncState: "error" as const,
        processKey: serverConfig.processKey,
        processJobIds: [],
        lastSyncAttemptAt: new Date().toISOString(),
        lastSyncError: error instanceof Error ? error.message : "UiPath sync failed unexpectedly.",
      },
      stageTaskLinks: [],
      bucketEvidence: [],
    };
  }

  const mirroredFileNames = new Set(syncOutcome.bucketEvidence.map((item) => item.fileName));
  const localEvidence: ClaimEvidence[] = [];

  for (const file of files) {
    if (mirroredFileNames.has(file.name)) {
      continue;
    }

    localEvidence.push(await saveUploadedFile(createdClaim.id, file));
  }

  const allEvidence = [...syncOutcome.bucketEvidence, ...localEvidence];
  if (allEvidence.length > 0) {
    addClaimEvidence(createdClaim.id, allEvidence);
  }

  if (syncOutcome.stageTaskLinks.length > 0) {
    attachUiPathTaskIds(createdClaim.id, createdClaim.stage, syncOutcome.stageTaskLinks);
  }

  setClaimUiPathMetadata(createdClaim.id, syncOutcome.metadata);
  const finalClaim = getClaimById(createdClaim.id);

  if (!finalClaim) {
    return errorResponse("Claim was created, but it could not be reloaded.", 500);
  }

  return NextResponse.json(finalClaim, { status: 201 });
}
