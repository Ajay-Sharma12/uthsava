import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { DataTable, Column } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import { PAYOUTS } from "@/lib/dummy-data";
import { fetchResource, updateResource } from "@/lib/services/resources";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check, Download, Wallet, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/payouts")({
  head: () => ({ meta: [{ title: "Producer Payouts — Uthsava Admin" }] }),
  component: PayoutsPage,
});

type P = (typeof PAYOUTS)[number];

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function PayoutsPage() {
  const [rows, setRows] = useState<P[]>(PAYOUTS);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchResource("/payouts")
      .then((data: any[]) => {
        if (mounted && Array.isArray(data) && data.length) setRows(data as P[]);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  const [active, setActive] = useState<P | null>(null);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.net, 0);
    const pending = rows.filter((r) => r.status === "Pending").reduce((s, r) => s + r.net, 0);
    const paid = rows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.net, 0);
    const top = [...rows].sort((a, b) => b.net - a.net)[0];
    return { total, pending, paid, top };
  }, [rows]);

  const updateStatus = (id: string, status: P["status"]) => {
    // Optimistic update
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              paidOn: status === "Paid" ? new Date().toISOString().slice(0, 10) : r.paidOn,
            }
          : r,
      ),
    );
    setActive((a) => (a && a.id === id ? { ...a, status } : a));
    updateResource("/payouts", id, { status }).catch(() =>
      toast.error("Failed to update payout status"),
    );
    toast.success(`Payout ${id} → ${status}`);
  };

  const cols: Column<P>[] = [
    { key: "id", header: "Payout" },
    { key: "producer", header: "Producer" },
    { key: "period", header: "Period" },
    { key: "gross", header: "Gross", render: (r) => fmt(r.gross) },
    {
      key: "platform",
      header: "Platform",
      render: (r) => `${fmt(r.platform)} (${r.platformPct}%)`,
    },
    { key: "tax", header: "Tax", render: (r) => fmt(r.tax) },
    {
      key: "net",
      header: "Net payable",
      render: (r) => <span className="font-semibold">{fmt(r.net)}</span>,
    },
    { key: "method", header: "Method" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "requestedOn", header: "Requested" },
  ];

  const kpis = [
    { l: "Total payouts", v: fmt(stats.total), icon: Wallet },
    { l: "Pending approval", v: fmt(stats.pending), icon: Clock, tone: "text-warning" },
    { l: "Completed", v: fmt(stats.paid), icon: CheckCircle2, tone: "text-success" },
    {
      l: "Top earner",
      v: stats.top?.producer || "—",
      sub: stats.top ? fmt(stats.top.net) : "",
      icon: AlertCircle,
    },
  ];

  return (
    <>
      <PageHeader
        title="Producer Payouts"
        description="Review, approve, and disburse monthly producer earnings."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((s) => {
          const Icon = s.icon;
          return (
            <Surface key={s.l} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{s.l}</div>
                <Icon className={`h-4 w-4 ${s.tone || "text-muted-foreground"}`} />
              </div>
              <div className={`mt-1 text-xl font-semibold ${s.tone || ""}`}>{s.v}</div>
              {s.sub && <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>}
            </Surface>
          );
        })}
      </div>

      <DataTable
        columns={cols}
        rows={rows}
        searchKeys={["id", "producer", "period"]}
        filters={[
          { label: "Status", options: ["Pending", "Approved", "Paid", "On Hold"] },
          { label: "Method", options: ["Bank Transfer", "UPI", "PayPal", "Wire"] },
          { label: "Period", options: [] },
        ]}
        primaryAction={{
          label: "Generate Monthly Payouts",
          onClick: () => toast.success("Generated payouts for current cycle"),
        }}
        onRowClick={(r) => setActive(r)}
      />

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.id}</SheetTitle>
                <SheetDescription>
                  {active.producer} · {active.period}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">Net payable</div>
                  <div className="mt-1 text-3xl font-semibold">{fmt(active.net)}</div>
                  <div className="mt-1">
                    <StatusPill status={active.status} />
                  </div>
                </div>

                <div className="rounded-xl border border-border">
                  <div className="border-b border-border p-3 text-sm font-semibold">
                    Revenue breakup
                  </div>
                  <dl className="divide-y divide-border text-sm">
                    {[
                      ["Gross revenue", fmt(active.gross)],
                      [`Platform share (${active.platformPct}%)`, `− ${fmt(active.platform)}`],
                      ["Tax deduction (10%)", `− ${fmt(active.tax)}`],
                      ["Net payable", fmt(active.net)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between p-3">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info l="Method" v={active.method} />
                  <Info l="Invoice" v={active.invoice} />
                  <Info l="Requested" v={active.requestedOn} />
                  <Info l="Paid on" v={active.paidOn} />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {active.status === "Pending" && (
                    <Button onClick={() => updateStatus(active.id, "Approved")}>
                      <Check className="mr-1.5 h-4 w-4" /> Approve
                    </Button>
                  )}
                  {active.status === "Approved" && (
                    <Button onClick={() => updateStatus(active.id, "Paid")}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark as Paid
                    </Button>
                  )}
                  {active.status !== "On Hold" && active.status !== "Paid" && (
                    <Button variant="outline" onClick={() => updateStatus(active.id, "On Hold")}>
                      Hold
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => toast.success(`Invoice ${active.invoice} downloaded`)}
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Invoice
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Info({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</div>
      <div className="mt-0.5 font-medium">{v}</div>
    </div>
  );
}
