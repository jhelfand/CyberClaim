import { randomUUID } from "node:crypto";
import { createStageTasks, deriveStatusFromStage } from "@/lib/workflow";
import type {
  ClaimEvidence,
  ClaimNote,
  ClaimPriority,
  ClaimStage,
  ClaimTask,
  SecurityClaim,
} from "@/types/security-claim";

function completeTasks(tasks: ClaimTask[], completedBy: string, completedAt: string) {
  return tasks.map((task) => ({
    ...task,
    status: "completed" as const,
    completedBy,
    completedAt,
  }));
}

function buildTaskTimeline(stage: ClaimStage, priority: ClaimPriority, adjuster: string, completedAt: string) {
  const stageOrder: ClaimStage[] = [
    "Intake",
    "Initial Triage",
    "Security Assessment",
    "Forensic Review",
    "Settle",
    "Close",
  ];

  return stageOrder.flatMap((currentStage) => {
    const tasks = createStageTasks(currentStage, priority);

    if (stageOrder.indexOf(currentStage) < stageOrder.indexOf(stage)) {
      return completeTasks(tasks, adjuster, completedAt);
    }

    if (currentStage === stage) {
      return tasks;
    }

    return [];
  });
}

function buildNotes(entries: Array<[string, string, "note" | "decision"]>): ClaimNote[] {
  return entries.map(([createdAt, body, kind]) => ({
    id: randomUUID(),
    author: "GAIG Specialty Desk",
    body,
    createdAt,
    kind,
  }));
}

function buildEvidence(
  files: Array<Pick<ClaimEvidence, "fileName" | "mimeType" | "size" | "publicPath" | "uploadedAt">>,
) {
  return files.map<ClaimEvidence>((file) => ({
    id: randomUUID(),
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: file.uploadedAt,
    source: "public",
    publicPath: file.publicPath,
  }));
}

export function getSeedClaims(): SecurityClaim[] {
  return [
    {
      id: randomUUID(),
      claimNumber: "SC-2026-001",
      priority: "Critical",
      stage: "Forensic Review",
      status: deriveStatusFromStage("Forensic Review"),
      createdAt: "2026-03-12T09:18:00.000Z",
      updatedAt: "2026-03-15T14:22:00.000Z",
      assignedAdjuster: "Morgan Diaz",
      details: {
        policyholder: "MetroTrust Community Bank",
        incidentType: "Bank burglary",
        dateTime: "2026-03-11T02:15:00.000Z",
        location: "1201 Wacker Drive, Chicago, IL",
        securityVendor: "Sentinel Integrated Security",
        policeReportNumber: "CPD-26-44192",
        lawEnforcementContact: "Det. Irene Hall, Chicago PD Burglary Unit",
        cctvAvailable: true,
        propertyType: "Commercial bank branch",
        description:
          "An overnight forced-entry burglary disabled the rear vestibule alarm before access to the cash recycler room. Loss details remain under forensic review.",
      },
      evidence: buildEvidence([
        {
          fileName: "metrotrust-police-report.txt",
          mimeType: "text/plain",
          size: 2450,
          publicPath: "/mock-evidence/metrotrust-police-report.txt",
          uploadedAt: "2026-03-12T09:44:00.000Z",
        },
        {
          fileName: "metrotrust-cctv-still.svg",
          mimeType: "image/svg+xml",
          size: 1875,
          publicPath: "/mock-evidence/metrotrust-cctv-still.svg",
          uploadedAt: "2026-03-12T10:10:00.000Z",
        },
      ]),
      tasks: buildTaskTimeline("Forensic Review", "Critical", "Morgan Diaz", "2026-03-14T18:30:00.000Z"),
      notes: buildNotes([
        ["2026-03-12T09:30:00.000Z", "Initial intake confirmed with branch operations and alarm monitoring vendor.", "note"],
        ["2026-03-14T18:30:00.000Z", "Escalated to forensic review after alarm panel logs showed an unexplained bypass event.", "decision"],
      ]),
      uipath: {
        syncState: "partial",
        processKey: "SECURITY_CLAIM",
        processJobIds: ["901142"],
        folderId: 456789,
        folderKey: "metro-risk-claims",
        bucketId: 778899,
        lastSyncAttemptAt: "2026-03-15T14:20:00.000Z",
      },
    },
    {
      id: randomUUID(),
      claimNumber: "SC-2026-002",
      priority: "High",
      stage: "Settle",
      status: deriveStatusFromStage("Settle"),
      createdAt: "2026-03-10T13:05:00.000Z",
      updatedAt: "2026-03-15T11:45:00.000Z",
      assignedAdjuster: "Nina Patel",
      details: {
        policyholder: "Carlton Jewelers",
        incidentType: "Jewellery store break-in",
        dateTime: "2026-03-09T04:42:00.000Z",
        location: "54 E Oak Street, Chicago, IL",
        securityVendor: "Aegis Alarm & Vault",
        policeReportNumber: "CPD-26-43811",
        lawEnforcementContact: "Sgt. Calvin Reese, Area Three Property Crimes",
        cctvAvailable: true,
        propertyType: "Luxury retail storefront",
        description:
          "Front glass entry compromise triggered a partial alarm response. CCTV and police evidence confirm a fast smash-and-grab with limited vault penetration.",
      },
      evidence: buildEvidence([
        {
          fileName: "carlton-alarm-log.txt",
          mimeType: "text/plain",
          size: 1980,
          publicPath: "/mock-evidence/carlton-alarm-log.txt",
          uploadedAt: "2026-03-10T14:02:00.000Z",
        },
      ]),
      tasks: buildTaskTimeline("Settle", "High", "Nina Patel", "2026-03-14T16:05:00.000Z"),
      notes: buildNotes([
        ["2026-03-10T13:20:00.000Z", "Security vendor confirmed no maintenance exceptions within the prior 90 days.", "note"],
        ["2026-03-15T11:45:00.000Z", "Forensic review complete. Settlement recommendation is waiting for authority sign-off.", "decision"],
      ]),
      uipath: {
        syncState: "mock",
        processKey: "SECURITY_CLAIM",
        processJobIds: [],
      },
    },
    {
      id: randomUUID(),
      claimNumber: "SC-2026-003",
      priority: "Medium",
      stage: "Intake",
      status: deriveStatusFromStage("Intake"),
      createdAt: "2026-03-15T08:12:00.000Z",
      updatedAt: "2026-03-15T09:02:00.000Z",
      assignedAdjuster: "Jordan Blake",
      details: {
        policyholder: "Riverside Distribution Warehouse",
        incidentType: "False alarm",
        dateTime: "2026-03-15T01:27:00.000Z",
        location: "7820 W 47th Street, Lyons, IL",
        securityVendor: "Nightwatch Monitoring",
        policeReportNumber: "LYN-26-1829",
        lawEnforcementContact: "Officer Sasha Wren, Lyons PD",
        cctvAvailable: false,
        propertyType: "Warehouse",
        description:
          "Repeated overnight motion activations triggered law enforcement dispatch, but on-site review suggests sensor drift and no confirmed intrusion.",
      },
      evidence: buildEvidence([
        {
          fileName: "riverside-dispatch-summary.txt",
          mimeType: "text/plain",
          size: 1424,
          publicPath: "/mock-evidence/riverside-dispatch-summary.txt",
          uploadedAt: "2026-03-15T08:50:00.000Z",
        },
      ]),
      tasks: buildTaskTimeline("Intake", "Medium", "Jordan Blake", "2026-03-15T09:02:00.000Z"),
      notes: buildNotes([
        ["2026-03-15T08:30:00.000Z", "Opened in demo mode to illustrate a low-severity specialty security claim.", "note"],
      ]),
      uipath: {
        syncState: "mock",
        processKey: "SECURITY_CLAIM",
        processJobIds: [],
      },
    },
  ];
}
