import { cn } from "@/lib/utils";

type BadgeKind = "priority" | "status" | "stage" | "sync";

const badgeClasses: Record<BadgeKind, Record<string, string>> = {
  priority: {
    Low: "badge--cool",
    Medium: "badge--neutral",
    High: "badge--warm",
    Critical: "badge--critical",
  },
  status: {
    Open: "badge--warm",
    "Pending Review": "badge--critical",
    Settled: "badge--cool",
    Closed: "badge--neutral",
  },
  stage: {
    Intake: "badge--neutral",
    "Initial Triage": "badge--warm",
    "Security Assessment": "badge--warm",
    "Forensic Review": "badge--critical",
    Settle: "badge--cool",
    Close: "badge--neutral",
  },
  sync: {
    connected: "badge--cool",
    partial: "badge--warm",
    mock: "badge--neutral",
    error: "badge--critical",
  },
};

export function StatusBadge({
  kind,
  value,
}: {
  kind: BadgeKind;
  value: string;
}) {
  return <span className={cn("badge", badgeClasses[kind][value] ?? "badge--neutral")}>{value}</span>;
}
