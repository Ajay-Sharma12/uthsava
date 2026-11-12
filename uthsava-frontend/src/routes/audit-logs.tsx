import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Column, RowAction } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import { fetchAuditLogs, getAuditLogById } from "@/lib/services/audit-logs";
import { AuditLogViewDialog } from "@/components/admin/AuditLogViewDialog";
import { useState, useEffect, useCallback } from "react";
import { Eye, ShieldAlert, Activity, CheckCircle, RefreshCw, Laptop, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Uthsava Admin" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAuditLogs({ limit: 100 });
      setRows(res.data);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const actions: RowAction<any>[] = [
    {
      label: "View Details",
      icon: Eye,
      onClick: async (r) => {
        try {
          const data = await getAuditLogById(r._id);
          setSelectedLog(data || r);
          setViewOpen(true);
        } catch (err) {
          console.error(err);
          setSelectedLog(r);
          setViewOpen(true);
        }
      },
    },
  ];

  const cols: Column<any>[] = [
    {
      key: "action",
      header: "Action",
      render: (r) => <span className="font-semibold text-foreground">{r.action}</span>,
    },
    {
      key: "module",
      header: "Module",
      render: (r) => (
        <span className="inline-flex rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">
          {r.module}
        </span>
      ),
    },
    {
      key: "admin",
      header: "Performed By",
      render: (r) => {
        const name =
          r.adminId?.fullName ||
          `${r.adminId?.firstName ?? ""} ${r.adminId?.lastName ?? ""}`.trim() ||
          r.adminId?.companyName ||
          "System / Admin";
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{name}</span>
            {r.adminId?.email && (
              <span className="text-[11px] text-muted-foreground">{r.adminId.email}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Timestamp",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">
            {new Date(r.createdAt).toLocaleDateString()}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {new Date(r.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (r) => (
        <code className="rounded bg-secondary/50 px-1.5 py-0.5 text-xs text-muted-foreground">
          {r.ipAddress || "—"}
        </code>
      ),
    },
    {
      key: "device",
      header: "Device / Agent",
      render: (r) => {
        const device = r.device ?? "";
        let Icon = Monitor;
        if (/Mac|iOS|iPhone|iPad/i.test(device)) Icon = Laptop;
        else if (/Android|Mobile/i.test(device)) Icon = Smartphone;

        return (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span>{device || "Unknown"}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} />,
    },
  ];

  const totalLogs = rows.length;
  const authEvents = rows.filter((r) => r.module === "AUTH").length;
  const contentEvents = rows.filter((r) => r.module === "CONTENT").length;
  const failedEvents = rows.filter((r) => r.status === "FAILED").length;

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Comprehensive audit trail tracking authentication, catalog updates, user changes, and security events."
        actions={
          <button
            onClick={() => loadAuditLogs()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Surface className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{totalLogs}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </div>
        </Surface>

        <Surface className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{authEvents}</div>
            <div className="text-xs text-muted-foreground">Auth & Access</div>
          </div>
        </Surface>

        <Surface className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{contentEvents}</div>
            <div className="text-xs text-muted-foreground">Content Changes</div>
          </div>
        </Surface>

        <Surface className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{failedEvents}</div>
            <div className="text-xs text-muted-foreground">Failed Attempts</div>
          </div>
        </Surface>
      </div>

      <DataTable
        loading={loading}
        columns={cols}
        rows={rows}
        rowActions={actions}
        searchKeys={["action", "module", "ipAddress", "device"]}
        filters={[
          {
            label: "Module",
            options: [
              "AUTH",
              "USERS",
              "CONTENT",
              "PRODUCERS",
              "CATEGORIES",
              "GENRES",
              "COUPONS",
              "SUBSCRIPTIONS",
              "NOTIFICATIONS",
              "SETTINGS",
              "SUB_ADMINS",
              "ROLES",
            ],
          },
          {
            label: "Status",
            options: ["SUCCESS", "FAILED"],
          },
        ]}
      />

      <AuditLogViewDialog open={viewOpen} onOpenChange={setViewOpen} log={selectedLog} />
    </>
  );
}
