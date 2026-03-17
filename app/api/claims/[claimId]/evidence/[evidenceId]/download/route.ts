import { NextResponse, type NextRequest } from "next/server";
import { Buckets } from "@uipath/uipath-typescript/buckets";
import { errorResponse, unauthorizedResponse } from "@/lib/api-route";
import { readStoredFile } from "@/lib/file-storage";
import { findClaimEvidence, getClaimById } from "@/lib/mock-store";
import { createServerSdkFromRequest, isRequestAuthenticated } from "@/lib/uipath/server-sdk";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ claimId: string; evidenceId: string }> },
) {
  if (!isRequestAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const { claimId, evidenceId } = await context.params;
  const claim = getClaimById(claimId);
  const evidence = findClaimEvidence(claimId, evidenceId);

  if (!claim || !evidence) {
    return errorResponse("Evidence not found.", 404);
  }

  if (evidence.source === "public" && evidence.publicPath) {
    return NextResponse.redirect(new URL(evidence.publicPath, request.nextUrl.origin));
  }

  if (evidence.source === "local" && evidence.storagePath) {
    const fileBuffer = await readStoredFile(evidence.storagePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Disposition": `inline; filename="${evidence.fileName}"`,
      },
    });
  }

  if (evidence.source === "bucket" && evidence.bucketPath && evidence.bucketId) {
    const sdk = createServerSdkFromRequest(request);

    if (!sdk) {
      return unauthorizedResponse();
    }

    if (!claim.uipath.folderId) {
      return errorResponse("Bucket evidence is missing its folder context.", 400);
    }

    const buckets = new Buckets(sdk);
    const response = await buckets.getReadUri({
      bucketId: evidence.bucketId,
      folderId: claim.uipath.folderId,
      path: evidence.bucketPath,
      expiryInMinutes: 15,
    });

    return NextResponse.redirect(response.uri);
  }

  return errorResponse("Evidence source is not readable.", 400);
}
