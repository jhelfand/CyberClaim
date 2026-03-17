import { randomUUID } from "node:crypto";
import { getSeedClaims } from "@/lib/mock-seed";
import { buildMetrics, createStageTasks, deriveStatusFromStage, getNextStage, hasOpenTasksForStage } from "@/lib/workflow";
import type {
  ClaimEvidence,
  ClaimNote,
  ClaimPriority,
  ClaimStage,
  SecurityClaim,
  UiPathSyncMetadata,
} from "@/types/security-claim";
import type { ClaimIntakeInput, ClaimNoteInput, ClaimTransitionInput, TaskCompletionInput } from "@/lib/validators";

declare global {
  var __gaigSecurityClaims: SecurityClaim[] | undefined;
}

function getState() {
  if (!globalThis.__gaigSecurityClaims) {
    globalThis.__gaigSecurityClaims = getSeedClaims();
  }

  return globalThis.__gaigSecurityClaims;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function buildClaimNumber(count: number) {
  return `SC-${new Date().getUTCFullYear()}-${String(count).padStart(3, "0")}`;
}

export function listClaims(filters?: { status?: string; priority?: string; search?: string }) {
  const claims = [...getState()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const search = filters?.search?.trim().toLowerCase();

  const filtered = claims.filter((claim) => {
    if (filters?.status && claim.status !== filters.status) {
      return false;
    }

    if (filters?.priority && claim.priority !== filters.priority) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      claim.claimNumber,
      claim.details.policyholder,
      claim.details.incidentType,
      claim.details.location,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  return {
    claims: clone(filtered),
    metrics: buildMetrics(claims),
  };
}

export function getClaimById(claimId: string) {
  const claim = getState().find((item) => item.id === claimId);
  return claim ? clone(claim) : null;
}

export function createClaim(input: ClaimIntakeInput, evidence: ClaimEvidence[] = []) {
  const state = getState();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const claim: SecurityClaim = {
    id,
    claimNumber: buildClaimNumber(state.length + 1),
    priority: input.priority,
    stage: "Intake",
    status: deriveStatusFromStage("Intake"),
    createdAt,
    updatedAt: createdAt,
    assignedAdjuster: input.assignedAdjuster || undefined,
    details: {
      policyholder: input.policyholder,
      incidentType: input.incidentType,
      dateTime: input.dateTime,
      location: input.location,
      securityVendor: input.securityVendor,
      policeReportNumber: input.policeReportNumber,
      lawEnforcementContact: input.lawEnforcementContact,
      cctvAvailable: input.cctvAvailable,
      propertyType: input.propertyType,
      description: input.description,
    },
    evidence,
    tasks: createStageTasks("Intake", input.priority),
    notes: [
      {
        id: randomUUID(),
        body: "Claim submitted from the GAIG specialty security intake portal.",
        author: "Security Claim Intake",
        createdAt,
        kind: "note",
      },
    ],
    uipath: {
      syncState: "mock",
      processKey: "SECURITY_CLAIM",
      processJobIds: [],
    },
  };

  state.unshift(claim);
  return clone(claim);
}

export function addClaimEvidence(claimId: string, evidence: ClaimEvidence[]) {
  const claim = getState().find((item) => item.id === claimId);

  if (!claim) {
    return null;
  }

  claim.evidence.push(...evidence);
  claim.updatedAt = new Date().toISOString();
  return clone(claim);
}

export function addClaimNote(claimId: string, input: ClaimNoteInput) {
  const claim = getState().find((item) => item.id === claimId);

  if (!claim) {
    return null;
  }

  const note: ClaimNote = {
    id: randomUUID(),
    body: input.body,
    author: input.author,
    kind: input.kind,
    createdAt: new Date().toISOString(),
  };

  claim.notes.unshift(note);
  claim.updatedAt = note.createdAt;
  return clone(claim);
}

export function completeClaimTask(claimId: string, taskId: string, input: TaskCompletionInput) {
  const claim = getState().find((item) => item.id === claimId);

  if (!claim) {
    return null;
  }

  const task = claim.tasks.find((item) => item.id === taskId);

  if (!task) {
    return null;
  }

  task.status = "completed";
  task.completedBy = input.completedBy;
  task.completedAt = new Date().toISOString();
  claim.updatedAt = task.completedAt;
  return clone(claim);
}

export function transitionClaim(claimId: string, input: ClaimTransitionInput) {
  const claim = getState().find((item) => item.id === claimId);

  if (!claim) {
    return { claim: null, error: "Claim not found." };
  }

  if (hasOpenTasksForStage(claim, claim.stage)) {
    return {
      claim: null,
      error: "Complete all stage tasks before advancing the claim.",
    };
  }

  const nextStage = getNextStage(claim.stage);

  if (!nextStage) {
    return {
      claim: null,
      error: "This claim is already in the final workflow stage.",
    };
  }

  claim.stage = nextStage;
  claim.status = deriveStatusFromStage(nextStage);
  claim.updatedAt = new Date().toISOString();

  const existingStageTasks = claim.tasks.some((task) => task.stage === nextStage);
  if (!existingStageTasks) {
    claim.tasks.push(...createStageTasks(nextStage, claim.priority));
  }

  if (input.note) {
    claim.notes.unshift({
      id: randomUUID(),
      body: input.note,
      author: input.author,
      kind: "decision",
      createdAt: claim.updatedAt,
    });
  }

  return { claim: clone(claim), error: null };
}

export function setClaimUiPathMetadata(claimId: string, metadata: Partial<UiPathSyncMetadata>) {
  const claim = getState().find((item) => item.id === claimId);

  if (!claim) {
    return null;
  }

  claim.uipath = {
    ...claim.uipath,
    ...metadata,
  };
  claim.updatedAt = new Date().toISOString();
  return clone(claim);
}

export function attachUiPathTaskIds(
  claimId: string,
  stage: ClaimStage,
  taskLinks: Array<{ title: string; uipathTaskId: number }>,
) {
  const claim = getState().find((item) => item.id === claimId);

  if (!claim) {
    return null;
  }

  for (const taskLink of taskLinks) {
    const localTask = claim.tasks.find(
      (task) => task.stage === stage && task.title === taskLink.title && !task.uipathTaskId,
    );

    if (localTask) {
      localTask.uipathTaskId = taskLink.uipathTaskId;
    }
  }

  claim.updatedAt = new Date().toISOString();
  return clone(claim);
}

export function findClaimEvidence(claimId: string, evidenceId: string) {
  const claim = getState().find((item) => item.id === claimId);

  if (!claim) {
    return null;
  }

  const evidence = claim.evidence.find((item) => item.id === evidenceId);
  return evidence ? clone(evidence) : null;
}
