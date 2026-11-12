import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuickAction } from "@/hooks/use-quick-action";
import { QA } from "@/lib/quick-actions";
import { PageHeader, Surface, StatusPill } from "@/components/admin/Primitives";
import { PLANS } from "@/lib/dummy-data";
import {
  fetchResource,
  createResource,
  updateResource,
  deleteResource,
} from "@/lib/services/resources";
import { Check, Plus, Pencil, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddPlanDialog, PlanValue } from "@/components/admin/AddPlanDialog";
import { ViewSheet } from "@/components/admin/ViewSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Subscription Plans — Uthsava Admin" }] }),
  component: PlansPage,
});

const seedPlans: PlanValue[] = PLANS.map((p, i) => ({
  name: p.name,
  monthly: p.monthly,
  quarterly: Math.round(p.monthly * 2.7),
  yearly: p.yearly,
  currency: "INR",
  trial: p.trial,
  description: `${p.name} plan with ${p.quality} streaming.`,
  quality: p.quality,
  hd: true,
  uhd: p.quality.includes("4K"),
  streams: p.devices,
  download: String(p.download),
  adFree: i > 0,
  devices: p.devices,
  deviceMobile: true,
  deviceTablet: true,
  deviceTv: i > 0,
  deviceWeb: true,
  premium: i >= 2,
  earlyAccess: i >= 2,
  liveStream: i === 3,
  status: p.status as "Active" | "Inactive",
  featured: i === 2,
  recommended: i === 2,
}));

function PlansPage() {
  const [plans, setPlans] = useState<PlanValue[]>(seedPlans);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchResource("/plans")
      .then((data: any[]) => {
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          // map API plans to PlanValue shape where possible
          const mapped = data.map((p: any, i: number) => ({
            name: p.name || `Plan ${i + 1}`,
            monthly: p.monthly ?? p.priceMonthly ?? 0,
            quarterly: Math.round((p.monthly ?? p.priceMonthly ?? 0) * 2.7),
            yearly: p.yearly ?? p.priceYearly ?? 0,
            currency: p.currency ?? "INR",
            trial: p.trial ?? "7 days",
            description: p.description ?? `${p.name} plan`,
            quality: p.quality ?? "HD",
            hd: true,
            uhd: (p.quality || "").includes("4K"),
            streams: p.devices ?? p.streams ?? 1,
            download: String(p.download ?? "0"),
            adFree: p.adFree ?? false,
            devices: p.devices ?? 1,
            deviceMobile: true,
            deviceTablet: true,
            deviceTv: p.deviceTv ?? false,
            deviceWeb: true,
            premium: p.premium ?? false,
            earlyAccess: p.earlyAccess ?? false,
            liveStream: p.liveStream ?? false,
            status: p.status ?? "Active",
            featured: p.featured ?? false,
            recommended: p.recommended ?? false,
          }));
          setPlans(mapped as PlanValue[]);
        }
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PlanValue | null>(null);
  const [view, setView] = useState<PlanValue | null>(null);
  useQuickAction(QA.ADD_PLAN, () => {
    setEdit(null);
    setOpen(true);
  });

  const onSave = (p: PlanValue) => {
    setPlans((prev) => {
      const idx = prev.findIndex((x) => x.name === (edit?.name ?? p.name));
      if (edit && idx >= 0) {
        const next = [...prev];
        next[idx] = p;
        return next;
      }
      return [...prev, p];
    });
    setEdit(null);
  };
  const remove = (name: string) => {
    setPlans((p) => p.filter((x) => x.name !== name));
    toast.error(`${name} plan deleted`);
  };

  return (
    <>
      <PageHeader
        title="Subscription Plans"
        description="Configure pricing, devices, quality and trial settings."
        actions={
          <button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-[oklch(0.65_0.22_18)] px-3 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Add Plan
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <Surface
            key={p.name}
            className={cn(
              "relative p-5 transition",
              p.recommended && "border-primary/40 shadow-[var(--shadow-glow)]",
            )}
          >
            {p.recommended && (
              <span className="absolute right-4 top-4 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                Most popular
              </span>
            )}
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-semibold">₹{p.monthly}</span>
              <span className="text-xs text-muted-foreground">/mo</span>
            </div>
            <div className="text-[11px] text-muted-foreground">or ₹{p.yearly} / year</div>

            <ul className="mt-4 space-y-2 text-sm">
              {[
                `${p.streams} stream${p.streams > 1 ? "s" : ""}`,
                `${p.quality} streaming`,
                `${p.download} downloads`,
                `${p.trial} free trial`,
                p.adFree ? "Ad-free experience" : "With ads",
              ].map((l) => (
                <li key={l} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-success" /> {l}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between">
              <StatusPill status={p.status} />
              <div className="flex gap-0.5">
                <button
                  onClick={() => setView(p)}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setEdit(p);
                    setOpen(true);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(p.name)}
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Surface>
        ))}
      </div>

      <AddPlanDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEdit(null);
        }}
        initial={edit}
        onSave={onSave}
      />

      <ViewSheet
        open={!!view}
        onOpenChange={(o) => !o && setView(null)}
        title={view?.name ?? ""}
        subtitle={view?.description}
        status={view?.status}
        sections={
          view
            ? [
                {
                  title: "Pricing",
                  rows: [
                    { label: "Currency", value: view.currency },
                    { label: "Monthly", value: `${view.currency} ${view.monthly}` },
                    { label: "Quarterly", value: `${view.currency} ${view.quarterly}` },
                    { label: "Yearly", value: `${view.currency} ${view.yearly}` },
                    { label: "Free trial", value: view.trial },
                  ],
                },
                {
                  title: "Streaming",
                  rows: [
                    { label: "Quality", value: view.quality },
                    { label: "Concurrent streams", value: view.streams },
                    { label: "Downloads", value: view.download },
                    { label: "Ad-free", value: view.adFree ? "Yes" : "No" },
                  ],
                },
                {
                  title: "Devices & Access",
                  rows: [
                    {
                      label: "Devices",
                      value: [
                        view.deviceMobile && "Mobile",
                        view.deviceTablet && "Tablet",
                        view.deviceTv && "Smart TV",
                        view.deviceWeb && "Web",
                      ]
                        .filter(Boolean)
                        .join(", "),
                    },
                    { label: "Premium content", value: view.premium ? "Yes" : "No" },
                    { label: "Early release", value: view.earlyAccess ? "Yes" : "No" },
                    { label: "Live streaming", value: view.liveStream ? "Yes" : "No" },
                  ],
                },
              ]
            : []
        }
        actions={[
          {
            label: "Edit Plan",
            variant: "primary",
            onClick: () => {
              if (view) {
                setEdit(view);
                setOpen(true);
                setView(null);
              }
            },
          },
          { label: "Close", onClick: () => setView(null) },
        ]}
      />
    </>
  );
}
