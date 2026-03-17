"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

const navigationItems = [
  {
    href: "/dashboard",
    label: "Claims Dashboard",
    description: "Monitor open specialty security claims and triage exposure.",
  },
  {
    href: "/claims/new",
    label: "New Intake",
    description: "Capture a new security incident and push it into SECURITY_CLAIM.",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authMode, logout, sdk } = useAuth();

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <BrandLogo />

        <nav className="app-shell__nav">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              className={cn("nav-card", pathname.startsWith(item.href) && "nav-card--active")}
              href={item.href}
            >
              <span className="nav-card__label">{item.label}</span>
              <span className="nav-card__description">{item.description}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-card__eyebrow">Workflow</p>
          <h3>SECURITY_CLAIM</h3>
          <p>Intake to closure with evidence capture, Action Center tasks, and Maestro case visibility.</p>
        </div>
      </aside>

      <div className="app-shell__content">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">Connected Tenant</p>
            <strong>
              {sdk?.config.orgName ?? process.env.NEXT_PUBLIC_UIPATH_ORG_NAME ?? "Demo workspace"}
            </strong>
          </div>

          <div className="topbar__actions">
            <StatusBadge
              kind="sync"
              value={authMode === "oauth" ? "connected" : authMode === "secret" ? "partial" : "mock"}
            />
            <span className="topbar__mode">
              {authMode === "oauth" ? "OAuth session" : authMode === "secret" ? "PAT session" : "Demo session"}
            </span>
            <button className="button button--ghost" onClick={() => void logout()} type="button">
              Sign out
            </button>
          </div>
        </header>

        <main className="workspace">{children}</main>
      </div>
    </div>
  );
}
