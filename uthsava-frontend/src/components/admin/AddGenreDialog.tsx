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
import { Upload, Layers } from "lucide-react";
import { toast } from "sonner";

export type GenreValue = {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  featured: boolean;
  status: "active" | "inactive";
  metaTitle: string;
  metaDesc: string;
};

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20";
const empty: GenreValue = {
  name: "",
  slug: "",
  description: "",
  order: 1,
  featured: false,
  status: "active",
  metaTitle: "",
  metaDesc: "",
};

export function AddGenreDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  existingNames = [],
  existingOrders = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: GenreValue | null;
  onSave: (g: GenreValue) => Promise<void> | void;
  existingNames?: string[];
  existingOrders?: { id?: string; order: number; name: string }[];
}) {
  const [v, setV] = useState<GenreValue>(empty);
  const [nameError, setNameError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNameError("");
    setOrderError("");
    setSubmitting(false);

    if (initial) {
      const initialOrder = Math.max(
        1,
        (initial as any).displayOrder ?? initial.order ?? 1,
      );
      setV({
        ...initial,
        name: initial.name ?? "",
        slug: initial.slug ?? slugify(initial.name ?? ""),
        description: initial.description ?? "",
        featured: Boolean(initial.featured),
        status: initial.status === "inactive" ? "inactive" : "active",
        metaTitle: initial.metaTitle ?? (initial as any).seoTitle ?? "",
        metaDesc: initial.metaDesc ?? (initial as any).seoDescription ?? "",
        order: initialOrder,
        displayOrder: initialOrder,
      } as any);
    } else {
      const nextOrder =
        existingOrders.length > 0
          ? Math.max(...existingOrders.map((o) => o.order || 0)) + 1
          : 1;
      setV({ ...empty, order: nextOrder });
    }
  }, [initial, open]);

  const upd = <K extends keyof GenreValue>(k: K, val: GenreValue[K]) => {
    setV((p) => ({ ...p, [k]: val, ...(k === "order" ? { displayOrder: val } : {}) }));
    if (k === "name" && nameError) {
      setNameError("");
    }
    if (k === "order" && orderError) {
      setOrderError("");
    }
  };

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const submit = async () => {
    const trimmedName = v.name.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError("Genre name is required");
      hasError = true;
    } else {
      const isDuplicate = existingNames.some(
        (n) =>
          n.toLowerCase() === trimmedName.toLowerCase() &&
          (!initial || initial.name?.toLowerCase() !== trimmedName.toLowerCase()),
      );
      if (isDuplicate) {
        setNameError("A genre with this name already exists");
        hasError = true;
      }
    }

    const orderNum = Number(v.order);
    if (!v.order || isNaN(orderNum)) {
      setOrderError("Display order is required");
      hasError = true;
    } else if (orderNum < 1 || !Number.isInteger(orderNum)) {
      setOrderError("Display order must be at least 1 (positive whole number)");
      hasError = true;
    } else {
      const duplicateOrder = existingOrders.find(
        (o) =>
          o.order === orderNum &&
          (!initial ||
            (o.id !== (initial as any)._id &&
              o.name.toLowerCase() !== initial.name?.toLowerCase())),
      );
      if (duplicateOrder) {
        setOrderError(
          `Display order ${orderNum} is already assigned to "${duplicateOrder.name}"`,
        );
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      setSubmitting(true);
      setNameError("");
      setOrderError("");

      const out = {
        ...v,
        name: trimmedName,
        order: orderNum,
        displayOrder: orderNum,
        slug: v.slug || slugify(trimmedName),
      };
      await onSave(out);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save Genre Error:", err);
      const backendData = err?.response?.data?.data || err?.data?.data;
      const errorMsg =
        backendData?.name ||
        backendData?.displayOrder ||
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to save genre";

      const lower = String(errorMsg).toLowerCase();
      if (
        lower.includes("name_exists") ||
        (lower.includes("name") && lower.includes("already exists"))
      ) {
        setNameError("A genre with this name already exists");
      } else if (backendData?.name) {
        setNameError(backendData.name);
      }

      if (
        lower.includes("display_order_exists") ||
        lower.includes("display order")
      ) {
        setOrderError(backendData?.displayOrder || errorMsg);
      } else if (backendData?.displayOrder) {
        setOrderError(backendData.displayOrder);
      }

      if (!backendData?.name && !backendData?.displayOrder && !lower.includes("exists")) {
        setNameError(errorMsg);
      }
      // Keep dialog open!
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {initial ? "Edit Genre" : "Add Genre"}
          </DialogTitle>
          <DialogDescription>
            Genres power discovery, recommendations and trending rails.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Genre Name *</label>
            <input
              className={`h-10 w-full rounded-lg border bg-card px-3 text-sm placeholder:text-muted-foreground/70 transition focus:outline-none focus:ring-2 ${
                nameError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                  : "border-border focus:border-primary/40 focus:ring-primary/20"
              }`}
              value={v.name}
              onChange={(e) => {
                upd("name", e.target.value);
                if (!initial) upd("slug", slugify(e.target.value));
              }}
              placeholder="e.g., Mythology"
            />
            {nameError && (
              <p className="text-[11px] font-medium text-destructive mt-1">{nameError}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Slug</label>
            <input
              className={inputCls}
              value={v.slug}
              onChange={(e) => upd("slug", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Display Order (min: 1) *</label>
            <input
              type="number"
              min={1}
              step={1}
              className={`h-10 w-full rounded-lg border bg-card px-3 text-sm placeholder:text-muted-foreground/70 transition focus:outline-none focus:ring-2 ${
                orderError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                  : "border-border focus:border-primary/40 focus:ring-primary/20"
              }`}
              value={v.order || ""}
              onChange={(e) => {
                const num = e.target.value === "" ? 0 : Number(e.target.value);
                upd("order", num);
              }}
              placeholder="1"
            />
            {orderError && (
              <p className="text-[11px] font-medium text-destructive mt-1">{orderError}</p>
            )}
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={v.description}
              onChange={(e) => upd("description", e.target.value)}
            />
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div>
              <div className="text-sm font-medium">Featured Genre</div>
              <div className="text-xs text-muted-foreground">
                Surface in trending and recommendations.
              </div>
            </div>
            <Switch checked={v.featured} onCheckedChange={(b) => upd("featured", b)} />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className="text-xs text-muted-foreground">
                Inactive genres are hidden from filters.
              </div>
            </div>
            <Switch
              checked={v.status === "active"}
              onCheckedChange={(b) => upd("status", b ? "active" : "inactive")}
            />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground">SEO Meta Title</label>
            <input
              className={inputCls}
              value={v.metaTitle}
              onChange={(e) => upd("metaTitle", e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              SEO Meta Description
            </label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={v.metaDesc}
              onChange={(e) => upd("metaDesc", e.target.value)}
              maxLength={160}
            />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-secondary transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="h-10 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Saving…" : initial ? "Update Genre" : "Save Genre"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
