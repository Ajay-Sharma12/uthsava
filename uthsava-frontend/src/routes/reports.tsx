import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface } from "@/components/admin/Primitives";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { KPI_TRENDS, DEVICE_USAGE } from "@/lib/dummy-data";
import { useEffect, useState } from "react";
import { fetchResource } from "@/lib/services/resources";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics — Uthsava Admin" }] }),
  component: ReportsPage,
});

const REPORTS = [
  "User Reports",
  "Revenue Reports",
  "Watch Time Reports",
  "Subscription Reports",
  "Content Performance Reports",
  "Producer Reports",
  "Device Reports",
  "Failed Payment Reports",
];

function ReportsPage() {
  const [kpi, setKpi] = useState(KPI_TRENDS);
  const [devices, setDevices] = useState(DEVICE_USAGE);
  const [reportToExport, setReportToExport] = useState<string | null>(null);

  const downloadReport = (reportName: string) => {
    const filename = `${reportName.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    const dummyContent = "Metric,Value,Date\r\nSample 1,1200," + new Date().toISOString().slice(0, 10) + "\r\nSample 2,2400," + new Date().toISOString().slice(0, 10);
    const blob = new Blob(["\uFEFF" + dummyContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  useEffect(() => {
    let mounted = true;
    fetchResource("/reports/kpi")
      .then((d: any[]) => {
        if (mounted && Array.isArray(d) && d.length) setKpi(d);
      })
      .catch(() => {});
    fetchResource("/reports/device-usage")
      .then((d: any[]) => {
        if (mounted && Array.isArray(d) && d.length) setDevices(d);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Generate operational and financial reports."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Surface className="p-5">
          <h3 className="text-sm font-semibold">Watch-time trend</h3>
          <div className="mt-2 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi}>
                <defs>
                  <linearGradient id="wt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
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
                  dataKey="watch"
                  stroke="var(--color-info)"
                  strokeWidth={2.4}
                  fill="url(#wt)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-semibold">Device split</h3>
          <div className="mt-2 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={devices}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="device" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
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
                <Bar dataKey="sessions" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <Surface className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Generate report</h3>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="h-9 rounded-md border border-border bg-secondary/50 px-3 text-xs"
            />
            <input
              type="date"
              className="h-9 rounded-md border border-border bg-secondary/50 px-3 text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {REPORTS.map((r) => (
            <div
              key={r}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-4"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r}</div>
                <div className="text-[11px] text-muted-foreground">CSV · PDF · Excel</div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  title="Download CSV"
                  onClick={() => setReportToExport(r)}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-secondary cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                </button>
                <button
                  type="button"
                  title="Download Report"
                  onClick={() => setReportToExport(r)}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-secondary cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Surface>

      {/* CSV Export Confirmation Dialog */}
      <AlertDialog open={Boolean(reportToExport)} onOpenChange={(open) => !open && setReportToExport(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Download className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center">Download CSV Report?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground">
              Are you sure you want to download{" "}
              <span className="font-semibold text-foreground">
                {reportToExport ? `${reportToExport.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv` : "report.csv"}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5"
              onClick={() => {
                if (reportToExport) {
                  downloadReport(reportToExport);
                }
                setReportToExport(null);
              }}
            >
              <Download className="h-4 w-4" /> Download CSV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
