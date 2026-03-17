"use client";

import { startTransition, useEffect, useState } from "react";
import { CLAIM_STAGES, type SecurityClaim } from "@/types/security-claim";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime, formatFileSize } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

type DetailTab = "details" | "evidence" | "tasks" | "notes";

const detailTabs: Array<{ id: DetailTab; label: string }> = [
  { id: "details", label: "Incident Details" },
  { id: "evidence", label: "Evidence" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes & Decisions" },
];

export function ClaimDetailClient({ claimId }: { claimId: string }) {
  const { authorizedFetch } = useAuth();
  const [claim, setClaim] = useState<SecurityClaim | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [operatorName, setOperatorName] = useState("GAIG Adjuster");
  const [noteBody, setNoteBody] = useState("");
  const [transitionNote, setTransitionNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  async function loadClaim() {
    setIsLoading(true);

    try {
      const response = await authorizedFetch(`/api/claims/${claimId}`);
      if (!response.ok) {
        throw new Error("The claim could not be loaded.");
      }

      const payload = (await response.json()) as SecurityClaim;
      setClaim(payload);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "The claim could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadClaim();
  }, [claimId]);

  async function completeTask(taskId: string) {
    setIsMutating(true);

    try {
      const response = await authorizedFetch(`/api/claims/${claimId}/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completedBy: operatorName,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Task completion failed.");
      }

      const payload = (await response.json()) as SecurityClaim;
      setClaim(payload);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Task completion failed.");
    } finally {
      setIsMutating(false);
    }
  }

  async function submitNote() {
    if (!noteBody.trim()) {
      return;
    }

    setIsMutating(true);

    try {
      const response = await authorizedFetch(`/api/claims/${claimId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: noteBody,
          author: operatorName,
          kind: "note",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Note submission failed.");
      }

      const payload = (await response.json()) as SecurityClaim;
      setClaim(payload);
      setNoteBody("");
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Note submission failed.");
    } finally {
      setIsMutating(false);
    }
  }

  async function advanceClaim() {
    setIsMutating(true);

    try {
      const response = await authorizedFetch(`/api/claims/${claimId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: operatorName,
          note: transitionNote,
        }),
      });

      const payload = (await response.json()) as SecurityClaim | { error?: string };
      if (!response.ok || !("id" in payload)) {
        throw new Error(("error" in payload && payload.error) || "Workflow transition failed.");
      }

      setClaim(payload);
      setTransitionNote("");
      setError(null);
      startTransition(() => {
        setActiveTab("tasks");
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Workflow transition failed.");
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="panel">
        <p className="panel__empty">Loading claim detail...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="panel">
        <p className="panel__error">{error ?? "Claim not found."}</p>
      </div>
    );
  }

  const currentStageIndex = CLAIM_STAGES.indexOf(claim.stage);
  const nextStage = CLAIM_STAGES[currentStageIndex + 1] ?? null;
  const hasOpenStageTasks = claim.tasks.some(
    (task) => task.stage === claim.stage && task.status !== "completed",
  );

  return (
    <div className="page-stack">
      <section className="detail-hero">
        <div>
          <p className="detail-hero__number">{claim.claimNumber}</p>
          <h2>{claim.details.policyholder}</h2>
          <p>
            {claim.details.incidentType} at {claim.details.location}
          </p>
        </div>

        <div className="detail-hero__badges">
          <StatusBadge kind="priority" value={claim.priority} />
          <StatusBadge kind="status" value={claim.status} />
          <StatusBadge kind="stage" value={claim.stage} />
          <StatusBadge kind="sync" value={claim.uipath.syncState} />
        </div>
      </section>

      <section className="workflow-rail">
        {CLAIM_STAGES.map((stage, index) => {
          const state =
            index < currentStageIndex
              ? "workflow-step--complete"
              : index === currentStageIndex
                ? "workflow-step--active"
                : "";

          return (
            <div key={stage} className={`workflow-step ${state}`}>
              <span className="workflow-step__index">{index + 1}</span>
              <div>
                <strong>{stage}</strong>
                <p>
                  {index < currentStageIndex
                    ? "Completed"
                    : index === currentStageIndex
                      ? "Current stage"
                      : "Upcoming"}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel__toolbar">
          <div className="tab-row">
            {detailTabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? "tab-button--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="operator-row">
            <label className="field field--compact">
              <span>Working as</span>
              <input
                onChange={(event) => setOperatorName(event.target.value)}
                value={operatorName}
              />
            </label>
            <button
              className="button button--ghost"
              onClick={() => void loadClaim()}
              type="button"
            >
              Refresh snapshot
            </button>
          </div>
        </div>

        {error ? <p className="panel__error">{error}</p> : null}

        {activeTab === "details" ? (
          <div className="detail-grid">
            <article className="detail-card">
              <h3>Incident profile</h3>
              <dl className="detail-list">
                <div>
                  <dt>Policyholder</dt>
                  <dd>{claim.details.policyholder}</dd>
                </div>
                <div>
                  <dt>Incident type</dt>
                  <dd>{claim.details.incidentType}</dd>
                </div>
                <div>
                  <dt>Date & time</dt>
                  <dd>{formatDateTime(claim.details.dateTime)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{claim.details.location}</dd>
                </div>
                <div>
                  <dt>Property type</dt>
                  <dd>{claim.details.propertyType}</dd>
                </div>
                <div>
                  <dt>CCTV available</dt>
                  <dd>{claim.details.cctvAvailable ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </article>

            <article className="detail-card">
              <h3>Security context</h3>
              <dl className="detail-list">
                <div>
                  <dt>Security vendor</dt>
                  <dd>{claim.details.securityVendor}</dd>
                </div>
                <div>
                  <dt>Police report</dt>
                  <dd>{claim.details.policeReportNumber}</dd>
                </div>
                <div>
                  <dt>Law enforcement</dt>
                  <dd>{claim.details.lawEnforcementContact}</dd>
                </div>
                <div>
                  <dt>Assigned adjuster</dt>
                  <dd>{claim.assignedAdjuster ?? "Unassigned"}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(claim.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatDateTime(claim.updatedAt)}</dd>
                </div>
              </dl>
            </article>

            <article className="detail-card detail-card--wide">
              <h3>Description</h3>
              <p>{claim.details.description}</p>
            </article>

            <article className="detail-card detail-card--wide">
              <h3>UiPath synchronization</h3>
              <div className="sync-grid">
                <div>
                  <p className="sync-grid__label">Process jobs</p>
                  <p>
                    {claim.uipath.processJobIds.length > 0
                      ? claim.uipath.processJobIds.join(", ")
                      : "Not started"}
                  </p>
                </div>
                <div>
                  <p className="sync-grid__label">Case instance</p>
                  <p>{claim.uipath.caseInstanceId ?? "Pending discovery"}</p>
                </div>
                <div>
                  <p className="sync-grid__label">Last attempt</p>
                  <p>
                    {claim.uipath.lastSyncAttemptAt
                      ? formatDateTime(claim.uipath.lastSyncAttemptAt)
                      : "No sync yet"}
                  </p>
                </div>
                <div>
                  <p className="sync-grid__label">Sync state</p>
                  <p>{claim.uipath.syncState}</p>
                </div>
              </div>

              {claim.uipath.lastSyncError ? (
                <p className="panel__error">{claim.uipath.lastSyncError}</p>
              ) : null}

              {claim.uipath.stageSnapshot?.length ? (
                <div className="remote-stage-grid">
                  {claim.uipath.stageSnapshot.map((stage) => (
                    <div key={stage.name} className="remote-stage-card">
                      <strong>{stage.name}</strong>
                      <span>{stage.status}</span>
                      <small>{stage.taskCount} task slots</small>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          </div>
        ) : null}

        {activeTab === "evidence" ? (
          <div className="evidence-list">
            {claim.evidence.length === 0 ? (
              <p className="panel__empty">No evidence has been attached yet.</p>
            ) : null}
            {claim.evidence.map((evidence) => (
              <article key={evidence.id} className="evidence-card">
                <div>
                  <h3>{evidence.fileName}</h3>
                  <p>{evidence.mimeType}</p>
                </div>

                <div className="evidence-card__meta">
                  <span>{formatFileSize(evidence.size)}</span>
                  <span>{formatDateTime(evidence.uploadedAt)}</span>
                  <a
                    className="button button--ghost"
                    href={`/api/claims/${claim.id}/evidence/${evidence.id}/download`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open file
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {activeTab === "tasks" ? (
          <div className="task-stack">
            {claim.tasks.map((task) => (
              <article key={task.id} className="task-card">
                <div>
                  <div className="task-card__meta">
                    <StatusBadge kind="stage" value={task.stage} />
                    <StatusBadge kind="priority" value={task.priority} />
                  </div>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                </div>

                <div className="task-card__actions">
                  <span className={`task-card__state task-card__state--${task.status}`}>
                    {task.status === "completed"
                      ? `Completed by ${task.completedBy}`
                      : "Pending"}
                  </span>
                  {task.status !== "completed" ? (
                    <button
                      className="button"
                      disabled={isMutating}
                      onClick={() => void completeTask(task.id)}
                      type="button"
                    >
                      Mark complete
                    </button>
                  ) : null}
                </div>
              </article>
            ))}

            {claim.uipath.actionTasks?.length ? (
              <article className="detail-card detail-card--wide">
                <h3>UiPath action tasks snapshot</h3>
                <div className="remote-task-grid">
                  {claim.uipath.actionTasks.map((task) => (
                    <div key={task.id} className="remote-task-card">
                      <strong>{task.title}</strong>
                      <span>{task.status}</span>
                      <small>{task.priority ?? "Priority unavailable"}</small>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        ) : null}

        {activeTab === "notes" ? (
          <div className="notes-layout">
            <div className="notes-column">
              <div className="detail-card">
                <h3>Add note</h3>
                <textarea
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Capture a coverage observation, evidence finding, or next-step summary."
                  rows={5}
                  value={noteBody}
                />
                <button
                  className="button"
                  disabled={isMutating || !noteBody.trim()}
                  onClick={() => void submitNote()}
                  type="button"
                >
                  Save note
                </button>
              </div>

              <div className="detail-card">
                <h3>Advance workflow</h3>
                <p>
                  {nextStage
                    ? `The next stage is ${nextStage}.`
                    : "This claim is already in the final stage."}
                </p>
                <textarea
                  onChange={(event) => setTransitionNote(event.target.value)}
                  placeholder="Add the decision rationale that should follow the stage transition."
                  rows={4}
                  value={transitionNote}
                />
                <button
                  className="button"
                  disabled={!nextStage || hasOpenStageTasks || isMutating}
                  onClick={() => void advanceClaim()}
                  type="button"
                >
                  {nextStage ? `Advance to ${nextStage}` : "Workflow complete"}
                </button>
                {hasOpenStageTasks ? (
                  <p className="panel__hint">
                    Finish all current stage tasks before advancing.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="notes-column">
              {claim.notes.map((note) => (
                <article key={note.id} className="note-card">
                  <div className="note-card__meta">
                    <span>{note.kind === "decision" ? "Decision" : "Note"}</span>
                    <span>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <h3>{note.author}</h3>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
