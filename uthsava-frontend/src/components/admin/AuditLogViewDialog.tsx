import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusPill } from "./Primitives";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: any;
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[160px_1fr] items-start gap-4 border-b border-border/60 py-2.5">
    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="break-all text-sm">{value ?? "—"}</div>
  </div>
);

export function AuditLogViewDialog({ open, onOpenChange, log }: Props) {
  if (!log) return null;

  const adminName =
    log.adminId?.fullName ||
    `${log.adminId?.firstName ?? ""} ${log.adminId?.lastName ?? ""}`.trim() ||
    log.adminId?.companyName ||
    "System / Admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Audit Log Details</span>
            <StatusPill status={log.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          {log.failureReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <strong>Failure Reason:</strong> {log.failureReason}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <Row label="Action" value={<span className="font-semibold text-foreground">{log.action}</span>} />
            <Row
              label="Module"
              value={
                <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold uppercase">
                  {log.module}
                </span>
              }
            />
            <Row
              label="Performed By"
              value={
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">{adminName}</span>
                  {log.adminId?.email && (
                    <span className="text-xs text-muted-foreground">{log.adminId.email}</span>
                  )}
                  {log.adminId?.role && (
                    <span className="text-[11px] uppercase text-primary">{log.adminId.role}</span>
                  )}
                </div>
              }
            />
            <Row label="IP Address" value={<code className="text-xs">{log.ipAddress || "—"}</code>} />
            <Row label="Device / Agent" value={log.device || "—"} />
            {log.entityId && <Row label="Entity ID" value={<code className="text-xs">{log.entityId}</code>} />}
            <Row
              label="Timestamp"
              value={log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
            />
          </div>

          {log.newData && Object.keys(log.newData).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payload / Changes Recorded
              </h4>
              <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-secondary/50 p-3 text-xs font-mono text-foreground">
                {JSON.stringify(log.newData, null, 2)}
              </pre>
            </div>
          )}

          {log.oldData && Object.keys(log.oldData).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Previous Snapshot
              </h4>
              <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-secondary/50 p-3 text-xs font-mono text-muted-foreground">
                {JSON.stringify(log.oldData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
