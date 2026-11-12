import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const norm = String(status || "").toLowerCase().trim();

  const getStyle = () => {
    switch (norm) {
      case "active":
      case "approved":
      case "success":
      case "published":
      case "resolved":
      case "sent":
      case "completed":
        return "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 shadow-[0_0_12px_-4px_rgba(16,185,129,0.2)]";
      case "re_edit_requested":
      case "re-edit requested":
      case "re_edit":
      case "re-edit":
      case "reedit":
      case "changes_requested":
        return "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 shadow-[0_0_12px_-4px_rgba(244,63,94,0.2)]";
      case "on_hold":
      case "hold":
      case "hold (24h)":
      case "on hold (24h)":
      case "hold_24h":
      case "holded for 24hrs":
      case "paused":
        return "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-400 shadow-[0_0_12px_-4px_rgba(245,158,11,0.2)]";
      case "pending":
      case "awaiting":
      case "under_review":
      case "in_review":
      case "in progress":
      case "scheduled":
      case "processing":
        return "border-orange-500/25 bg-orange-500/10 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-400";
      case "inactive":
      case "suspended":
      case "rejected":
      case "failed":
      case "expired":
      case "blocked":
      case "closed":
      case "deleted":
        return "border-red-500/25 bg-red-500/10 text-red-600 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-400";
      case "draft":
      case "refunded":
      case "open":
      case "new":
        return "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400";
      default:
        return "border-border/80 bg-secondary/60 text-foreground/80";
    }
  };

  const getDot = () => {
    switch (norm) {
      case "active":
      case "approved":
      case "success":
      case "published":
      case "resolved":
      case "sent":
      case "completed":
        return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]";
      case "re_edit_requested":
      case "re-edit requested":
      case "re_edit":
      case "re-edit":
      case "reedit":
      case "changes_requested":
        return "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]";
      case "on_hold":
      case "hold":
      case "hold (24h)":
      case "on hold (24h)":
      case "hold_24h":
      case "holded for 24hrs":
      case "paused":
        return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]";
      case "pending":
      case "awaiting":
      case "under_review":
      case "in_review":
      case "in progress":
      case "scheduled":
      case "processing":
        return "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.7)]";
      case "inactive":
      case "suspended":
      case "rejected":
      case "failed":
      case "expired":
      case "blocked":
      case "closed":
      case "deleted":
        return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]";
      case "draft":
      case "refunded":
      case "open":
      case "new":
        return "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]";
      default:
        return "bg-muted-foreground";
    }
  };

  const formatLabel = (val: string) => {
    if (!val) return "";
    switch (norm) {
      case "re_edit_requested":
      case "re-edit requested":
      case "re_edit":
      case "re-edit":
      case "reedit":
        return "Re-edit";
      case "on_hold":
      case "hold":
      case "hold (24h)":
      case "on hold (24h)":
      case "hold_24h":
        return "Hold (24h)";
      case "under_review":
      case "in_review":
        return "Under Review";
      default:
        return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-normal transition-all",
        getStyle(),
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", getDot())} />
      <span>{formatLabel(status)}</span>
    </span>
  );
}

export function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("surface-card rounded-2xl", className)}>{children}</div>;
}
