import { randomUUID } from "node:crypto";
import {
  CLAIM_STAGES,
  STAGE_TASK_TEMPLATES,
  type ClaimMetrics,
  type ClaimPriority,
  type ClaimStage,
  type ClaimStatus,
  type ClaimTask,
  type SecurityClaim,
} from "@/types/security-claim";

export function deriveStatusFromStage(stage: ClaimStage): ClaimStatus {
  if (stage === "Forensic Review") {
    return "Pending Review";
  }

  if (stage === "Settle") {
    return "Settled";
  }

  if (stage === "Close") {
    return "Closed";
  }

  return "Open";
}

export function getNextStage(stage: ClaimStage): ClaimStage | null {
  const currentIndex = CLAIM_STAGES.indexOf(stage);
  const next = CLAIM_STAGES[currentIndex + 1];
  return next ?? null;
}

export function createStageTasks(stage: ClaimStage, priority: ClaimPriority) {
  return STAGE_TASK_TEMPLATES[stage].map<ClaimTask>((template) => ({
    id: randomUUID(),
    stage,
    title: template.title,
    description: template.description,
    priority: template.priority ?? priority,
    status: "pending",
  }));
}

export function buildMetrics(claims: SecurityClaim[]): ClaimMetrics {
  return {
    totalClaims: claims.length,
    pendingReview: claims.filter((claim) => claim.status === "Pending Review").length,
    openClaims: claims.filter((claim) => claim.status === "Open").length,
    highPriority: claims.filter(
      (claim) => claim.priority === "High" || claim.priority === "Critical",
    ).length,
  };
}

export function hasOpenTasksForStage(claim: SecurityClaim, stage: ClaimStage) {
  return claim.tasks.some((task) => task.stage === stage && task.status !== "completed");
}
