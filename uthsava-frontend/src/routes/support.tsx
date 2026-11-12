import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Column } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import { TICKETS } from "@/lib/dummy-data";
import { useState, useEffect } from "react";
import { fetchResource } from "@/lib/services/resources";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support Center — Uthsava Admin" }] }),
  component: SupportPage,
});

type T = (typeof TICKETS)[number];

function priorityColor(p: string) {
  return p === "Urgent"
    ? "text-destructive"
    : p === "High"
      ? "text-warning"
      : p === "Medium"
        ? "text-info"
        : "text-muted-foreground";
}

function SupportPage() {
  const [rows, setRows] = useState<any[]>(TICKETS);
  useEffect(() => {
    let mounted = true;
    fetchResource("/tickets")
      .then((data: any[]) => {
        if (mounted && Array.isArray(data) && data.length) setRows(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const cols: Column<T>[] = [
    { key: "id", header: "Ticket" },
    { key: "user", header: "User" },
    { key: "issue", header: "Issue" },
    {
      key: "priority",
      header: "Priority",
      render: (r) => (
        <span className={`text-xs font-medium ${priorityColor(r.priority)}`}>{r.priority}</span>
      ),
    },
    { key: "agent", header: "Agent" },
    { key: "created", header: "Created" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
  ];
  return (
    <>
      <PageHeader
        title="Support Center"
        description="User tickets, issue routing, and agent performance."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Open tickets", v: "184", tone: "text-info" },
          { l: "Urgent", v: "12", tone: "text-destructive" },
          { l: "Avg. response", v: "1h 24m" },
          { l: "Resolved (7d)", v: "412", tone: "text-success" },
        ].map((s) => (
          <Surface key={s.l} className="p-4">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className={`mt-1 text-xl font-semibold ${s.tone || ""}`}>{s.v}</div>
          </Surface>
        ))}
      </div>
      <DataTable
        columns={cols}
        rows={rows}
        searchKeys={["id", "user", "issue", "agent"]}
        filters={[
          { label: "Priority", options: [] },
          { label: "Status", options: [] },
          { label: "Agent", options: [] },
        ]}
      />
    </>
  );
}
