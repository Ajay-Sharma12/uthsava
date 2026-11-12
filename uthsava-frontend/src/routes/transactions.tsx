import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Column } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import { KPI_TRENDS } from "@/lib/dummy-data";
import { useState, useEffect } from "react";
import { fetchResource } from "@/lib/services/resources";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Revenue & Transactions — Uthsava Admin" }] }),
  component: TransactionsPage,
});

type T = any;

function TransactionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchResource("/transactions")
      .then((data) => {
        if (mounted) setRows(data as any[]);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  const cols: Column<T>[] = [
    { key: "id", header: "Transaction" },
    { key: "user", header: "User" },
    { key: "plan", header: "Plan" },
    { key: "method", header: "Method" },
    { key: "amount", header: "Amount", render: (r) => `₹${r.amount}` },
    { key: "tax", header: "Tax", render: (r) => `₹${r.tax}` },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "date", header: "Date" },
  ];
  return (
    <>
      <PageHeader
        title="Revenue & Transactions"
        description="All payments, payouts and refunds across the platform."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Today's revenue", v: "₹16.4 L" },
          { l: "This month", v: "₹4.82 Cr" },
          { l: "Refunds issued", v: "₹38.2 L" },
          { l: "Failed payments", v: "1,284", tone: "text-destructive" },
        ].map((s) => (
          <Surface key={s.l} className="p-4">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className={`mt-1 text-xl font-semibold ${s.tone || ""}`}>{s.v}</div>
          </Surface>
        ))}
      </div>

      <Surface className="mb-4 p-5">
        <h3 className="text-sm font-semibold">Revenue trend</h3>
        <div className="mt-2 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={KPI_TRENDS}>
              <defs>
                <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="m"
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "var(--shadow-card)",
                }}
              />
              <Area
                dataKey="revenue"
                stroke="var(--color-accent)"
                strokeWidth={2.4}
                fill="url(#rev2)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <DataTable
        columns={cols}
        rows={rows}
        searchKeys={["id", "user", "method"]}
        filters={[
          { label: "Method", options: [] },
          { label: "Status", options: [] },
          { label: "Date range", options: [] },
        ]}
        primaryAction={{ label: "Generate Invoice" }}
      />
    </>
  );
}
