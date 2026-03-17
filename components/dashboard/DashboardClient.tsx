"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  CLAIM_PRIORITIES,
  CLAIM_STATUS_VALUES,
  type ClaimMetrics,
  type SecurityClaim,
} from "@/types/security-claim";
import { formatDateTime } from "@/lib/utils";

export function DashboardClient() {
  const { authorizedFetch } = useAuth();
  const [claims, setClaims] = useState<SecurityClaim[]>([]);
  const [metrics, setMetrics] = useState<ClaimMetrics | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  async function loadClaims() {
    setIsLoading(true);

    try {
      const response = await authorizedFetch("/api/claims");
      if (!response.ok) {
        throw new Error("The dashboard could not load claims.");
      }

      const payload = (await response.json()) as {
        claims: SecurityClaim[];
        metrics: ClaimMetrics;
      };
      setClaims(payload.claims);
      setMetrics(payload.metrics);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The dashboard could not load claims.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadClaims();
  }, []);

  const filteredClaims = claims.filter((claim) => {
    if (statusFilter !== "All" && claim.status !== statusFilter) {
      return false;
    }

    if (priorityFilter !== "All" && claim.priority !== priorityFilter) {
      return false;
    }

    if (!deferredSearch.trim()) {
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
      .includes(deferredSearch.toLowerCase());
  });

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">Claims Dashboard</p>
          <h2>Security incidents at a glance</h2>
          <p>
            Track claims by status and priority, then jump directly into evidence
            review, tasks, and workflow decisions.
          </p>
        </div>

        <div className="page-hero__actions">
          <Link className="button" href="/claims/new">
            Start new intake
          </Link>
          <button
            className="button button--ghost"
            onClick={() => void loadClaims()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          accent="linear-gradient(135deg, #7f1d3b, #bc2e5a)"
          label="Total claims"
          value={metrics?.totalClaims ?? "-"}
        />
        <MetricCard
          accent="linear-gradient(135deg, #17345f, #2b5d90)"
          label="Pending review"
          value={metrics?.pendingReview ?? "-"}
        />
        <MetricCard
          accent="linear-gradient(135deg, #2f4b5e, #4f728a)"
          label="Open claims"
          value={metrics?.openClaims ?? "-"}
        />
        <MetricCard
          accent="linear-gradient(135deg, #7b2d26, #c96552)"
          label="High priority"
          value={metrics?.highPriority ?? "-"}
        />
      </section>

      <section className="panel">
        <div className="panel__toolbar">
          <input
            className="search-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search policyholder, incident type, location, or claim number"
            value={search}
          />

          <div className="filter-group">
            <div className="filter-row">
              <button
                className={`filter-chip ${
                  statusFilter === "All" ? "filter-chip--active" : ""
                }`}
                onClick={() => setStatusFilter("All")}
                type="button"
              >
                All statuses
              </button>
              {CLAIM_STATUS_VALUES.map((status) => (
                <button
                  key={status}
                  className={`filter-chip ${
                    statusFilter === status ? "filter-chip--active" : ""
                  }`}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="filter-row">
              <button
                className={`filter-chip ${
                  priorityFilter === "All" ? "filter-chip--active" : ""
                }`}
                onClick={() => setPriorityFilter("All")}
                type="button"
              >
                All priorities
              </button>
              {CLAIM_PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  className={`filter-chip ${
                    priorityFilter === priority ? "filter-chip--active" : ""
                  }`}
                  onClick={() => setPriorityFilter(priority)}
                  type="button"
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="panel__error">{error}</p> : null}
        {isLoading ? <p className="panel__empty">Loading claims...</p> : null}
        {!isLoading && filteredClaims.length === 0 ? (
          <p className="panel__empty">No claims match the current filters.</p>
        ) : null}

        <div className="claim-grid">
          {filteredClaims.map((claim) => (
            <Link key={claim.id} className="claim-card" href={`/claims/${claim.id}`}>
              <div className="claim-card__header">
                <div>
                  <p className="claim-card__number">{claim.claimNumber}</p>
                  <h3>{claim.details.policyholder}</h3>
                </div>

                <StatusBadge kind="priority" value={claim.priority} />
              </div>

              <p className="claim-card__incident">{claim.details.incidentType}</p>
              <p className="claim-card__location">{claim.details.location}</p>

              <div className="claim-card__meta">
                <StatusBadge kind="status" value={claim.status} />
                <StatusBadge kind="stage" value={claim.stage} />
                <StatusBadge kind="sync" value={claim.uipath.syncState} />
              </div>

              <dl className="claim-card__details">
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDateTime(claim.updatedAt)}</dd>
                </div>
                <div>
                  <dt>Adjuster</dt>
                  <dd>{claim.assignedAdjuster ?? "Unassigned"}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
