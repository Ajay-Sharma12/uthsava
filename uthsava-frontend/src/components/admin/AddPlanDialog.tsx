import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type PlanValue = {
  name: string;
  monthly: number;
  quarterly: number;
  yearly: number;
  currency: string;
  trial: string;
  description: string;
  quality: string;
  hd: boolean;
  uhd: boolean;
  streams: number;
  download: string;
  adFree: boolean;
  devices: number;
  deviceMobile: boolean;
  deviceTablet: boolean;
  deviceTv: boolean;
  deviceWeb: boolean;
  premium: boolean;
  earlyAccess: boolean;
  liveStream: boolean;
  status: "Active" | "Inactive";
  featured: boolean;
  recommended: boolean;
};

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20";
const TABS = ["Pricing", "Streaming", "Devices & Access", "Status"] as const;

const empty: PlanValue = {
  name: "",
  monthly: 199,
  quarterly: 549,
  yearly: 1799,
  currency: "INR",
  trial: "7 days",
  description: "",
  quality: "HD",
  hd: true,
  uhd: false,
  streams: 1,
  download: "5 titles",
  adFree: true,
  devices: 2,
  deviceMobile: true,
  deviceTablet: true,
  deviceTv: false,
  deviceWeb: true,
  premium: false,
  earlyAccess: false,
  liveStream: false,
  status: "Active",
  featured: false,
  recommended: false,
};

export function AddPlanDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: PlanValue | null;
  onSave: (p: PlanValue, mode: "draft" | "publish") => void;
}) {
  const [tab, setTab] = useState(0);
  const [v, setV] = useState<PlanValue>(empty);
  useEffect(() => {
    setV(initial ?? empty);
    setTab(0);
  }, [initial, open]);

  const upd = <K extends keyof PlanValue>(k: K, val: PlanValue[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const submit = (mode: "draft" | "publish") => {
    if (!v.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    onSave({ ...v, status: mode === "publish" ? "Active" : v.status }, mode);
    toast.success(
      initial ? "Plan updated" : mode === "publish" ? `${v.name} published` : `${v.name} saved`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {initial ? "Edit Plan" : "Add Subscription Plan"}
          </DialogTitle>
          <DialogDescription>Configure pricing, features and access controls.</DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex gap-1 border-b border-border">
          {TABS.map((s, i) => (
            <button
              key={s}
              onClick={() => setTab(i)}
              className={cn(
                "h-9 px-3 text-xs font-medium transition",
                i === tab
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Plan Name *</label>
                <input
                  className={inputCls}
                  value={v.name}
                  onChange={(e) => upd("name", e.target.value)}
                  placeholder="e.g., Premium"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <select
                  className={inputCls}
                  value={v.currency}
                  onChange={(e) => upd("currency", e.target.value)}
                >
                  {["INR", "USD", "AED", "GBP", "EUR"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Free Trial</label>
                <select
                  className={inputCls}
                  value={v.trial}
                  onChange={(e) => upd("trial", e.target.value)}
                >
                  {["No trial", "3 days", "7 days", "14 days", "30 days"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Monthly Price</label>
                <input
                  type="number"
                  className={inputCls}
                  value={v.monthly}
                  onChange={(e) => upd("monthly", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Quarterly Price</label>
                <input
                  type="number"
                  className={inputCls}
                  value={v.quarterly}
                  onChange={(e) => upd("quarterly", Number(e.target.value))}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Yearly Price</label>
                <input
                  type="number"
                  className={inputCls}
                  value={v.yearly}
                  onChange={(e) => upd("yearly", Number(e.target.value))}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm"
                  value={v.description}
                  onChange={(e) => upd("description", e.target.value)}
                />
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Video Quality</label>
                <select
                  className={inputCls}
                  value={v.quality}
                  onChange={(e) => upd("quality", e.target.value)}
                >
                  {["SD", "HD", "Full HD", "4K HDR", "Dolby Vision"].map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Concurrent Streams</label>
                <input
                  type="number"
                  className={inputCls}
                  value={v.streams}
                  onChange={(e) => upd("streams", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Offline Downloads</label>
                <input
                  className={inputCls}
                  value={v.download}
                  onChange={(e) => upd("download", e.target.value)}
                  placeholder="Unlimited / 25 titles"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <span className="text-sm">HD Support</span>
                <Switch checked={v.hd} onCheckedChange={(b) => upd("hd", b)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <span className="text-sm">4K / UHD</span>
                <Switch checked={v.uhd} onCheckedChange={(b) => upd("uhd", b)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <span className="text-sm">Ad-Free</span>
                <Switch checked={v.adFree} onCheckedChange={(b) => upd("adFree", b)} />
              </div>
            </div>
          )}

          {tab === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Device Support
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { k: "deviceMobile", l: "Mobile" },
                    { k: "deviceTablet", l: "Tablet" },
                    { k: "deviceTv", l: "Smart TV" },
                    { k: "deviceWeb", l: "Web" },
                  ].map((r) => (
                    <label
                      key={r.k}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <span>{r.l}</span>
                      <Switch
                        checked={(v as any)[r.k]}
                        onCheckedChange={(b) => upd(r.k as keyof PlanValue, b as any)}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Access Controls
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      k: "premium",
                      l: "Premium Content Access",
                      h: "Unlock originals and exclusives.",
                    },
                    {
                      k: "earlyAccess",
                      l: "Early Release Access",
                      h: "Watch episodes before public release.",
                    },
                    {
                      k: "liveStream",
                      l: "Live Streaming Access",
                      h: "Access to live events and channels.",
                    },
                  ].map((r) => (
                    <div
                      key={r.k}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{r.l}</div>
                        <div className="text-xs text-muted-foreground">{r.h}</div>
                      </div>
                      <Switch
                        checked={(v as any)[r.k]}
                        onCheckedChange={(b) => upd(r.k as keyof PlanValue, b as any)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 3 && (
            <div className="space-y-2">
              {[
                { k: "status", l: "Active", h: "Available for purchase." },
                { k: "featured", l: "Featured Plan", h: "Pinned to subscription page." },
                { k: "recommended", l: "Recommended Plan", h: "Highlighted as most popular." },
              ].map((r) => (
                <div
                  key={r.k}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{r.l}</div>
                    <div className="text-xs text-muted-foreground">{r.h}</div>
                  </div>
                  {r.k === "status" ? (
                    <Switch
                      checked={v.status === "Active"}
                      onCheckedChange={(b) => upd("status", b ? "Active" : "Inactive")}
                    />
                  ) : (
                    <Switch
                      checked={(v as any)[r.k]}
                      onCheckedChange={(b) => upd(r.k as keyof PlanValue, b as any)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-5 gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => submit("draft")}
            className="h-10 rounded-lg border border-border bg-card px-4 text-sm hover:bg-secondary"
          >
            Save Plan
          </button>
          <button
            onClick={() => submit("publish")}
            className="h-10 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            {initial ? "Update Plan" : "Publish Plan"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
