import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Column } from "@/components/admin/DataTable";
import { PageHeader, StatusPill } from "@/components/admin/Primitives";
import { DEVICES } from "@/lib/dummy-data";
import { useState, useEffect } from "react";
import { fetchResource } from "@/lib/services/resources";
import { Smartphone, Tablet, Tv2, Monitor } from "lucide-react";

export const Route = createFileRoute("/devices")({
  head: () => ({ meta: [{ title: "Device Management — Uthsava Admin" }] }),
  component: DevicesPage,
});

const ICON: Record<string, any> = {
  Android: Smartphone,
  iOS: Smartphone,
  "Smart TV": Tv2,
  Web: Monitor,
  Tablet,
};

type D = (typeof DEVICES)[number];

function DevicesPage() {
  const [rows, setRows] = useState<any[]>(DEVICES);
  useEffect(() => {
    let mounted = true;
    fetchResource("/devices")
      .then((data: any[]) => {
        if (mounted && Array.isArray(data) && data.length) setRows(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const cols: Column<D>[] = [
    { key: "id", header: "Device" },
    { key: "user", header: "User" },
    {
      key: "type",
      header: "Type",
      render: (r) => {
        const I = ICON[r.type] || Monitor;
        return (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <I className="h-3.5 w-3.5 text-muted-foreground" />
            {r.type}
          </span>
        );
      },
    },
    { key: "os", header: "OS" },
    { key: "login", header: "Login date" },
    { key: "lastActive", header: "Last active" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
  ];
  return (
    <>
      <PageHeader
        title="Device Management"
        description="Active sessions, blocked devices and concurrency limits."
      />
      <DataTable
        columns={cols}
        rows={rows}
        searchKeys={["id", "user", "type", "os"]}
        filters={[
          { label: "Type", options: [] },
          { label: "Status", options: [] },
        ]}
      />
    </>
  );
}
