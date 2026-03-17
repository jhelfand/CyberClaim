export const SECURITY_CLAIM_PROCESS_KEY = "SECURITY_CLAIM" as const;

export const CLAIM_STAGES = [
  "Intake",
  "Initial Triage",
  "Security Assessment",
  "Forensic Review",
  "Settle",
  "Close",
] as const;

export const CLAIM_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export const CLAIM_STATUS_VALUES = ["Open", "Pending Review", "Settled", "Closed"] as const;
export const NOTE_KINDS = ["note", "decision"] as const;

export type ClaimStage = (typeof CLAIM_STAGES)[number];
export type ClaimPriority = (typeof CLAIM_PRIORITIES)[number];
export type ClaimStatus = (typeof CLAIM_STATUS_VALUES)[number];
export type NoteKind = (typeof NOTE_KINDS)[number];

export interface IncidentDetails {
  policyholder: string;
  incidentType: string;
  dateTime: string;
  location: string;
  securityVendor: string;
  policeReportNumber: string;
  lawEnforcementContact: string;
  cctvAvailable: boolean;
  propertyType: string;
  description: string;
}

export interface ClaimEvidence {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  source: "public" | "local" | "bucket";
  publicPath?: string;
  storagePath?: string;
  bucketPath?: string;
  bucketId?: number;
}

export interface ClaimTask {
  id: string;
  stage: ClaimStage;
  title: string;
  description: string;
  priority: ClaimPriority;
  status: "pending" | "completed";
  dueAt?: string;
  completedAt?: string;
  completedBy?: string;
  assignedTo?: string;
  uipathTaskId?: number;
}

export interface ClaimNote {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  kind: NoteKind;
}

export interface UiPathStageSnapshot {
  name: string;
  status: string;
  taskCount: number;
}

export interface UiPathActionTaskSnapshot {
  id: number;
  title: string;
  status: string;
  priority?: string;
}

export interface UiPathSyncMetadata {
  syncState: "mock" | "connected" | "partial" | "error";
  folderId?: number;
  folderKey?: string;
  bucketId?: number;
  processKey?: string;
  processJobIds: string[];
  caseInstanceId?: string;
  lastSyncAttemptAt?: string;
  lastSyncError?: string;
  stageSnapshot?: UiPathStageSnapshot[];
  actionTasks?: UiPathActionTaskSnapshot[];
}

export interface SecurityClaim {
  id: string;
  claimNumber: string;
  priority: ClaimPriority;
  status: ClaimStatus;
  stage: ClaimStage;
  createdAt: string;
  updatedAt: string;
  assignedAdjuster?: string;
  details: IncidentDetails;
  evidence: ClaimEvidence[];
  tasks: ClaimTask[];
  notes: ClaimNote[];
  uipath: UiPathSyncMetadata;
}

export interface ClaimMetrics {
  totalClaims: number;
  pendingReview: number;
  openClaims: number;
  highPriority: number;
}

export interface ClaimsResponse {
  claims: SecurityClaim[];
  metrics: ClaimMetrics;
}

export interface StageTaskTemplate {
  title: string;
  description: string;
  priority?: ClaimPriority;
}

export const STAGE_TASK_TEMPLATES: Record<ClaimStage, StageTaskTemplate[]> = {
  Intake: [
    {
      title: "Collect police reports and alarm logs",
      description: "Obtain incident reports, alarm timelines, and the first on-scene summary.",
      priority: "High",
    },
    {
      title: "Verify policyholder intake package",
      description: "Confirm policy details, location, and reported loss narrative are complete.",
    },
  ],
  "Initial Triage": [
    {
      title: "Confirm law enforcement contact details",
      description: "Validate detective contact information and response status.",
    },
    {
      title: "Prepare adjuster triage summary",
      description: "Document the immediate exposure, vendor involvement, and open evidence gaps.",
      priority: "High",
    },
  ],
  "Security Assessment": [
    {
      title: "Schedule on-site assessment",
      description: "Coordinate site access with the insured and the security vendor.",
      priority: "High",
    },
    {
      title: "Review alarm vendor maintenance history",
      description: "Determine if service issues or bypass events contributed to the loss.",
    },
  ],
  "Forensic Review": [
    {
      title: "Obtain CCTV footage",
      description: "Secure footage from the property, neighboring businesses, or third-party monitoring tools.",
      priority: "High",
    },
    {
      title: "Review evidence package",
      description: "Compare the scene evidence, police report, and security logs for consistency.",
      priority: "High",
    },
  ],
  Settle: [
    {
      title: "Draft settlement recommendation",
      description: "Outline liability position, recommended reserve movement, and next approval step.",
      priority: "High",
    },
  ],
  Close: [
    {
      title: "Issue closure memo",
      description: "Capture final disposition, subrogation notes, and file retention details.",
    },
  ],
};
