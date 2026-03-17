import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { slugify } from "@/lib/utils";
import type { ClaimEvidence } from "@/types/security-claim";

const uploadsRoot = path.join(process.cwd(), "storage", "uploads");

async function ensureClaimUploadDirectory(claimId: string) {
  const directory = path.join(uploadsRoot, claimId);
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function saveUploadedFile(claimId: string, file: File): Promise<ClaimEvidence> {
  const directory = await ensureClaimUploadDirectory(claimId);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = path.extname(file.name);
  const basename = path.basename(file.name, extension);
  const fileName = `${Date.now()}-${slugify(basename) || "evidence"}${extension}`;
  const relativeStoragePath = path.join(claimId, `${randomUUID()}-${fileName}`);
  const absolutePath = path.join(uploadsRoot, relativeStoragePath);

  await writeFile(absolutePath, buffer);

  return {
    id: randomUUID(),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    source: "local",
    storagePath: relativeStoragePath,
  };
}

export async function readStoredFile(relativeStoragePath: string) {
  const absolutePath = path.join(uploadsRoot, relativeStoragePath);
  return readFile(absolutePath);
}
