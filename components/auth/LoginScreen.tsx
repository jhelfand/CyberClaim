"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useAuth } from "@/components/providers/AuthProvider";

const workflowStages = [
  "Intake",
  "Initial Triage",
  "Security Assessment",
  "Forensic Review",
  "Settle",
  "Close",
];

export function LoginScreen() {
  const router = useRouter();
  const {
    error,
    isAuthenticated,
    isLoading,
    oauthConfigured,
    secretConfigured,
    loginWithOAuth,
    loginWithSecret,
  } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="login-page">
      <section className="hero-panel">
        <BrandLogo />
        <p className="hero-panel__lede">
          A standalone specialty security-claims workspace for burglary, break-in, and false-alarm exposures.
        </p>

        <div className="stage-strip">
          {workflowStages.map((stage) => (
            <span key={stage} className="stage-strip__item">
              {stage}
            </span>
          ))}
        </div>

        <div className="hero-panel__grid">
          <article className="hero-card">
            <p className="hero-card__eyebrow">What this app handles</p>
            <h2>Security-first intake, evidence review, and case orchestration.</h2>
            <p>
              Capture incident details, upload CCTV and reports, create UiPath tasks, and drive the claim through a purpose-built SECURITY_CLAIM workflow.
            </p>
          </article>

          <article className="hero-card hero-card--accent">
            <p className="hero-card__eyebrow">UiPath scopes</p>
            <h2>OAuth is recommended for adjuster access.</h2>
            <p>
              Configure your external app with `OR.Administration`, `OR.Jobs.Write`, `OR.Tasks`, `PIMS`, and `OR.Execution.Read`.
            </p>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__header">
          <p className="auth-panel__eyebrow">Access</p>
          <h2>Open the command center</h2>
          <p>Use OAuth for an end-user session, or a PAT-backed service account when you need a quick demo path.</p>
        </div>

        <div className="auth-panel__options">
          <article className="auth-option">
            <div>
              <span className="auth-option__tag">Recommended</span>
              <h3>UiPath OAuth</h3>
            </div>
            <p>Redirect through your UiPath external app and return with an authenticated browser session.</p>
            <button
              className="button"
              disabled={!oauthConfigured || isLoading}
              onClick={() => void loginWithOAuth()}
              type="button"
            >
              {oauthConfigured ? "Continue with OAuth" : "OAuth not configured"}
            </button>
          </article>

          <article className="auth-option">
            <div>
              <span className="auth-option__tag auth-option__tag--subtle">Server-side</span>
              <h3>UiPath PAT secret</h3>
            </div>
            <p>Use a configured `UIPATH_SECRET` so the server can create cases, upload evidence, and manage tasks without a browser redirect.</p>
            <button
              className="button button--ghost"
              disabled={!secretConfigured || isLoading}
              onClick={() => void loginWithSecret()}
              type="button"
            >
              {secretConfigured ? "Use PAT session" : "PAT not configured"}
            </button>
          </article>
        </div>

        {error ? <p className="auth-panel__error">{error}</p> : null}

        {!oauthConfigured && !secretConfigured ? (
          <div className="setup-callout">
            <h3>Setup required</h3>
            <p>Add the UiPath values from `.env.example` and restart `npm run dev` to enable sign-in.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
