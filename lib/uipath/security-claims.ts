import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { Buckets } from "@uipath/uipath-typescript/buckets";
import type { BucketUploadFileOptions } from "@uipath/uipath-typescript/buckets";
import { CaseInstances } from "@uipath/uipath-typescript/cases";
import { Processes, JobPriority } from "@uipath/uipath-typescript/processes";
import type { ProcessStartRequest } from "@uipath/uipath-typescript/processes";
import { Tasks, TaskPriority, TaskType } from "@uipath/uipath-typescript/tasks";
import type { TaskCreateOptions, TaskCompletionOptions } from "@uipath/uipath-typescript/tasks";
import { serverConfig } from "@/lib/server-config";
import { slugify } from "@/lib/utils";
import { createServerSdkFromRequest } from "@/lib/uipath/server-sdk";
import type { ClaimEvidence, ClaimPriority, SecurityClaim, UiPathSyncMetadata } from "@/types/security-claim";

function mapClaimPriorityToJobPriority(priority: ClaimPriority) {
  if (priority === "Critical" || priority === "High") {
    return JobPriority.High;
  }

  if (priority === "Low") {
    return JobPriority.Low;
  }

  return JobPriority.Normal;
}

function mapClaimPriorityToTaskPriority(priority: ClaimPriority) {
  if (priority === "Critical") {
    return TaskPriority.Critical;
  }

  if (priority === "High") {
    return TaskPriority.High;
  }

  if (priority === "Low") {
    return TaskPriority.Low;
  }

  return TaskPriority.Medium;
}

function buildProcessInputArguments(claim: SecurityClaim) {
  return JSON.stringify({
    processKey: serverConfig.processKey,
    claimNumber: claim.claimNumber,
    stage: claim.stage,
    priority: claim.priority,
    policyholder: claim.details.policyholder,
    incidentType: claim.details.incidentType,
    incidentDateTime: claim.details.dateTime,
    location: claim.details.location,
    securityVendor: claim.details.securityVendor,
    policeReportNumber: claim.details.policeReportNumber,
    lawEnforcementContact: claim.details.lawEnforcementContact,
    cctvAvailable: claim.details.cctvAvailable,
    propertyType: claim.details.propertyType,
    description: claim.details.description,
  });
}

export interface ClaimSyncOutcome {
  metadata: Partial<UiPathSyncMetadata>;
  stageTaskLinks: Array<{ title: string; uipathTaskId: number }>;
  bucketEvidence: ClaimEvidence[];
}

export async function createUiPathTasksForStage(
  request: NextRequest,
  claim: SecurityClaim,
  stage = claim.stage,
) {
  const sdk = createServerSdkFromRequest(request);

  if (!sdk || !serverConfig.folderId) {
    return [];
  }

  const tasks = new Tasks(sdk);
  const stageTaskLinks: Array<{ title: string; uipathTaskId: number }> = [];

  for (const task of claim.tasks.filter((item) => item.stage === stage && !item.uipathTaskId)) {
    const taskPayload: TaskCreateOptions = {
      title: `${claim.claimNumber}: ${task.title}`,
      priority: mapClaimPriorityToTaskPriority(task.priority),
      data: {
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        stage,
        incidentType: claim.details.incidentType,
        policyholder: claim.details.policyholder,
      },
    };

    const createdTask = await tasks.create(taskPayload, serverConfig.folderId);
    stageTaskLinks.push({
      title: task.title,
      uipathTaskId: createdTask.id,
    });
  }

  return stageTaskLinks;
}

export async function syncNewClaimToUiPath(
  request: NextRequest,
  claim: SecurityClaim,
  files: File[],
): Promise<ClaimSyncOutcome> {
  const sdk = createServerSdkFromRequest(request);

  if (!sdk || !serverConfig.folderId) {
    return {
      metadata: {
        syncState: "mock",
        processKey: serverConfig.processKey,
        processJobIds: [],
        lastSyncAttemptAt: new Date().toISOString(),
      },
      stageTaskLinks: [],
      bucketEvidence: [],
    };
  }

  const processes = new Processes(sdk);
  const buckets = serverConfig.bucketId ? new Buckets(sdk) : null;
  const caseInstances = serverConfig.folderKey ? new CaseInstances(sdk) : null;
  const errors: string[] = [];
  const processJobIds: string[] = [];
  const bucketEvidence: ClaimEvidence[] = [];
  const stageTaskLinks: Array<{ title: string; uipathTaskId: number }> = [];
  const lastSyncAttemptAt = new Date().toISOString();
  let caseInstanceId: string | undefined;
  let stageSnapshot: UiPathSyncMetadata["stageSnapshot"];
  let actionTasks: UiPathSyncMetadata["actionTasks"];

  try {
    const requestBody: ProcessStartRequest = {
      processKey: serverConfig.processKey,
      jobPriority: mapClaimPriorityToJobPriority(claim.priority),
      inputArguments: buildProcessInputArguments(claim),
    };

    const startedJobs = await processes.start(requestBody, serverConfig.folderId);
    processJobIds.push(...startedJobs.map((job) => String(job.id)));
  } catch (error) {
    errors.push(`Process start failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  if (buckets && serverConfig.bucketId && files.length > 0) {
    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const bucketPath = [
          serverConfig.bucketPathPrefix,
          claim.claimNumber,
          `${Date.now()}-${slugify(file.name) || "evidence"}`,
        ].join("/");

        const uploadOptions: BucketUploadFileOptions = {
          bucketId: serverConfig.bucketId,
          folderId: serverConfig.folderId,
          path: bucketPath,
          content: buffer,
        };

        await buckets.uploadFile(uploadOptions);
        bucketEvidence.push({
          id: randomUUID(),
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
          source: "bucket",
          bucketId: serverConfig.bucketId,
          bucketPath,
        });
      } catch (error) {
        errors.push(`Bucket upload failed for ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }

  try {
    stageTaskLinks.push(...(await createUiPathTasksForStage(request, claim)));
  } catch (error) {
    errors.push(`Task creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  if (caseInstances && serverConfig.folderKey) {
    try {
      const recentCases = await caseInstances.getAll({
        processKey: serverConfig.processKey,
        pageSize: 10,
      });

      const matchedCase =
        recentCases.items.find(
          (item) =>
            item.caseTitle === claim.claimNumber ||
            item.instanceDisplayName === claim.claimNumber ||
            Math.abs(new Date(item.startedTime).getTime() - new Date(claim.createdAt).getTime()) <
              5 * 60 * 1000,
        ) ?? recentCases.items[0];

      if (matchedCase) {
        caseInstanceId = matchedCase.instanceId;

        const [stages, tasksPage] = await Promise.all([
          matchedCase.getStages(),
          matchedCase.getActionTasks({ pageSize: 10 }),
        ]);

        stageSnapshot = stages.map((stage) => ({
          name: stage.name,
          status: stage.status,
          taskCount: stage.tasks.flat().length,
        }));
        actionTasks = tasksPage.items.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
        }));
      }
    } catch (error) {
      errors.push(`Case snapshot sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  const hasSuccess = Boolean(processJobIds.length || bucketEvidence.length || stageTaskLinks.length || caseInstanceId);
  const syncState = errors.length === 0 ? (hasSuccess ? "connected" : "mock") : hasSuccess ? "partial" : "error";

  return {
    metadata: {
      syncState,
      processKey: serverConfig.processKey,
      processJobIds,
      folderId: serverConfig.folderId,
      folderKey: serverConfig.folderKey,
      bucketId: serverConfig.bucketId,
      caseInstanceId,
      lastSyncAttemptAt,
      lastSyncError: errors.length > 0 ? errors.join(" | ") : undefined,
      stageSnapshot,
      actionTasks,
    },
    stageTaskLinks,
    bucketEvidence,
  };
}

export async function completeUiPathTask(
  request: NextRequest,
  taskId: number,
  folderId: number,
) {
  const sdk = createServerSdkFromRequest(request);

  if (!sdk) {
    return;
  }

  const tasks = new Tasks(sdk);
  const payload: TaskCompletionOptions = {
    type: TaskType.External,
    taskId,
  };

  await tasks.complete(payload, folderId);
}

export async function refreshClaimSnapshot(request: NextRequest, claim: SecurityClaim) {
  const sdk = createServerSdkFromRequest(request);

  if (!sdk || !claim.uipath.caseInstanceId || !claim.uipath.folderKey) {
    return null;
  }

  const caseInstances = new CaseInstances(sdk);
  const instance = await caseInstances.getById(claim.uipath.caseInstanceId, claim.uipath.folderKey);
  const [stages, actionTasks] = await Promise.all([
    instance.getStages(),
    instance.getActionTasks({ pageSize: 10 }),
  ]);

  return {
    caseInstanceId: instance.instanceId,
    syncState: "connected" as const,
    lastSyncAttemptAt: new Date().toISOString(),
    stageSnapshot: stages.map((stage) => ({
      name: stage.name,
      status: stage.status,
      taskCount: stage.tasks.flat().length,
    })),
    actionTasks: actionTasks.items.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
    })),
    lastSyncError: undefined,
  };
}

export async function closeUiPathCase(request: NextRequest, claim: SecurityClaim, comment?: string) {
  const sdk = createServerSdkFromRequest(request);

  if (!sdk || !claim.uipath.caseInstanceId || !claim.uipath.folderKey) {
    return;
  }

  const caseInstances = new CaseInstances(sdk);
  await caseInstances.close(claim.uipath.caseInstanceId, claim.uipath.folderKey, { comment });
}
