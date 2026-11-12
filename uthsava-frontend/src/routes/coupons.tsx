import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DataTable, Column } from "@/components/admin/DataTable";
import { PageHeader, StatusPill } from "@/components/admin/Primitives";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  getCouponById,
  updateCouponStatus,
} from "@/lib/services/coupons";
import { useQuickAction } from "@/hooks/use-quick-action";
import { QA } from "@/lib/quick-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Pencil, Ticket, Copy, Check } from "lucide-react";
import { ViewSheet } from "@/components/admin/ViewSheet";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/admin/CustomSelect";

export const Route = createFileRoute("/coupons")({
  head: () => ({ meta: [{ title: "Coupons & Promotions — Uthsava Admin" }] }),
  component: CouponsPage,
});

function isCouponExpired(r: any): boolean {
  if (!r) return false;
  const rawExp = r.expiryDate || r.expiryAt || r.endDate;
  if (!rawExp) return false;
  const expTime = new Date(rawExp).getTime();
  if (Number.isNaN(expTime)) return false;
  const dateObj = new Date(rawExp);
  if (dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0 && dateObj.getUTCSeconds() === 0) {
    dateObj.setUTCHours(23, 59, 59, 999);
  }
  return dateObj.getTime() < Date.now();
}

function getEffectiveCouponStatus(r: any): "active" | "inactive" | "expired" {
  if (isCouponExpired(r)) return "expired";
  const rawStatus = (r?.status || "").toLowerCase();
  return rawStatus === "active" ? "active" : "inactive";
}

function formatCouponExpiry(r: any): string {
  const rawExp = r?.expiryDate || r?.expiryAt || r?.endDate;
  if (!rawExp) return "—";
  const d = new Date(rawExp);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type C = any;

function CouponsPage() {
  const [rows, setRows] = useState<C[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchCoupons()
      .then((response: any) => {
        if (mounted) {
          setRows(response.results.data);
          // console.log("Coupon:", response.results.data[0]);
        }
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [usageLimit, setUsageLimit] = useState("500");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [minOrderAmount, setMinOrderAmount] = useState("100");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("200");
  const [applicableUsers, setApplicableUsers] = useState("ALL_USERS");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [view, setView] = useState<any>(null);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  const handleOpenAddCoupon = () => {
    setEditingCoupon(null);
    setCode("");
    setValue("");
    setDiscountType("PERCENTAGE");
    setUsageLimit("500");
    setPerUserLimit("1");
    setMinOrderAmount("100");
    setMaxDiscountAmount("200");
    setApplicableUsers("ALL_USERS");
    setStartDate("");
    setExpiryDate("");
    setOpen(true);
  };

  useQuickAction(QA.ADD_COUPON, handleOpenAddCoupon);

  const handleToggleCouponStatus = async (coupon: any) => {
    const couponId = coupon.id ?? coupon._id;
    if (!couponId) {
      toast.error("Coupon ID is missing");
      return;
    }

    if (isCouponExpired(coupon)) {
      toast.error("This coupon has expired. Please edit the expiry date to reactivate.");
      return;
    }

    const currentActive = coupon.status?.toUpperCase() === "ACTIVE";
    const newStatus = currentActive ? "INACTIVE" : "ACTIVE";

    // Optimistic UI update
    setRows((prev) =>
      prev.map((item) =>
        (item.id ?? (item as any)._id) === couponId
          ? { ...item, status: newStatus }
          : item,
      ),
    );

    if (view && (view.id ?? view._id) === couponId) {
      setView((prev: any) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await updateCouponStatus(couponId, {
        status: newStatus,
      });

      toast.success(
        newStatus === "ACTIVE"
          ? `Coupon ${coupon.code} activated`
          : `Coupon ${coupon.code} deactivated`,
      );
    } catch (error: any) {
      // Revert optimistic update
      setRows((prev) =>
        prev.map((item) =>
          (item.id ?? (item as any)._id) === couponId
            ? { ...item, status: currentActive ? "ACTIVE" : "INACTIVE" }
            : item,
        ),
      );
      if (view && (view.id ?? view._id) === couponId) {
        setView((prev: any) => (prev ? { ...prev, status: currentActive ? "ACTIVE" : "INACTIVE" } : null));
      }
      console.error("Failed to update coupon status:", error);
      toast.error(
        error?.data?.message ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update coupon status",
      );
    }
  };

  const handleViewCoupon = async (r: any) => {
    try {
      const couponId = r.id ?? r._id;
      if (!couponId) {
        toast.error("Coupon ID is missing");
        return;
      }
      setView(r);
      const response: any = await getCouponById(couponId);
      const coupon = response.results?.coupon ?? response.results ?? response.data ?? response;
      if (coupon) {
        setView(coupon);
      }
    } catch (err) {
      console.error("Failed to load coupon details:", err);
    }
  };

  const handleOpenEditCoupon = async (r: any) => {
    try {
      const couponId = r.id ?? r._id;
      if (!couponId) {
        toast.error("Coupon ID is missing");
        return;
      }

      const response: any = await getCouponById(couponId).catch(() => null);
      const coupon =
        response?.results?.coupon ?? response?.results ?? response?.data ?? response ?? r;

      setEditingCoupon({
        ...coupon,
        id: coupon.id ?? coupon._id,
      });

      setCode(coupon.code ?? "");
      setValue(String(coupon.discountValue ?? ""));

      const normDiscountType =
        coupon.discountType === "FIXED" || coupon.discountType === "FIXED_AMOUNT"
          ? "FIXED_AMOUNT"
          : "PERCENTAGE";

      setDiscountType(normDiscountType);
      setUsageLimit(String(coupon.usageLimit ?? 500));
      setPerUserLimit(String(coupon.perUserLimit ?? 1));
      setMinOrderAmount(String(coupon.minOrderAmount ?? 100));
      setMaxDiscountAmount(String(coupon.maxDiscountAmount ?? 200));
      setApplicableUsers(
        coupon.applicableUserType ?? coupon.applicableUsers ?? "ALL_USERS",
      );

      setStartDate(
        coupon.startDate ? new Date(coupon.startDate).toISOString().split("T")[0] : "",
      );

      setExpiryDate(
        coupon.expiryDate
          ? new Date(coupon.expiryDate).toISOString().split("T")[0]
          : coupon.expiryAt
            ? new Date(coupon.expiryAt).toISOString().split("T")[0]
            : "",
      );

      setView(null);
      setOpen(true);
    } catch (err) {
      console.error("Failed to load coupon for editing:", err);
      toast.error("Failed to load coupon");
    }
  };

  const exportColumns: Column<C>[] = [
    {
      key: "serial",
      header: "S.No",
      accessor: (r) => r.serial ?? "",
    },
    {
      key: "code",
      header: "Coupon Code",
      accessor: (r) => r.code ?? "",
    },
    {
      key: "discountType",
      header: "Discount Type",
      accessor: (r) =>
        r.discountType === "FIXED_AMOUNT" || r.discountType === "FIXED"
          ? "Fixed Amount"
          : "Percentage",
    },
    {
      key: "discountValue",
      header: "Discount Value",
      accessor: (r) =>
        r.discountType === "FIXED_AMOUNT" || r.discountType === "FIXED"
          ? `₹${r.discountValue ?? 0}`
          : `${r.discountValue ?? 0}%`,
    },
    {
      key: "minOrderAmount",
      header: "Minimum Order Amount",
      accessor: (r) => r.minOrderAmount ?? 0,
    },
    {
      key: "maxDiscountAmount",
      header: "Maximum Discount",
      accessor: (r) => r.maxDiscountAmount ?? 0,
    },
    {
      key: "usageLimit",
      header: "Usage Limit",
      accessor: (r) => r.usageLimit ?? 0,
    },
    {
      key: "usedCount",
      header: "Used Count",
      accessor: (r) => r.usedCount ?? 0,
    },
    {
      key: "startDate",
      header: "Start Date",
      accessor: (r) => (r.startDate ? new Date(r.startDate).toLocaleDateString("en-IN") : ""),
    },
    {
      key: "expiryAt",
      header: "Expiry Date",
      accessor: (r) => formatCouponExpiry(r),
    },
    {
      key: "applicableUserType",
      header: "Applicable Users",
      accessor: (r) => r.applicableUserType ?? r.applicableUsers ?? "",
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => {
        const eff = getEffectiveCouponStatus(r);
        return eff.charAt(0).toUpperCase() + eff.slice(1);
      },
    },
  ];

  const cols: Column<C>[] = [
    {
      key: "code",
      header: "Code",
      render: (r) => (
        <div className="flex items-center gap-2">
          <code className="rounded-md bg-secondary/80 border border-border/60 px-2 py-1 text-xs font-mono font-semibold text-foreground">
            {r.code}
          </code>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) =>
        r.discountType === "FIXED_AMOUNT" || r.discountType === "FIXED"
          ? "Fixed Amount"
          : "Percentage",
    },
    {
      key: "value",
      header: "Value",
      render: (r) => (
        <span className="font-semibold text-foreground">
          {r.discountType === "FIXED_AMOUNT" || r.discountType === "FIXED"
            ? `₹${r.discountValue}`
            : `${r.discountValue}%`}
        </span>
      ),
    },
    {
      key: "expiry",
      header: "Expiry",
      render: (r) => {
        const expired = isCouponExpired(r);
        const formatted = formatCouponExpiry(r);
        return (
          <div className="flex items-center gap-1.5">
            <span className={expired ? "text-destructive font-medium text-xs" : "text-xs text-foreground"}>
              {formatted}
            </span>
            {expired && (
              <span className="rounded bg-destructive/15 border border-destructive/20 px-1.5 py-0.5 text-[10px] font-semibold text-destructive uppercase">
                Expired
              </span>
            )}
          </div>
        );
      },
    },
    { key: "limit", header: "Limit", render: (r) => r.usageLimit },
    {
      key: "used",
      header: "Used",
      render: (r) => (
        <span className="text-xs">
          <span className="font-medium text-foreground">{r.usedCount ?? 0}</span>
          <span className="text-muted-foreground"> / {r.usageLimit ?? "∞"}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => {
        const eff = getEffectiveCouponStatus(r);
        return eff.charAt(0).toUpperCase() + eff.slice(1);
      },
      render: (r) => {
        const eff = getEffectiveCouponStatus(r);
        const isExpired = eff === "expired";
        const isActive = eff === "active";

        return (
          <button
            type="button"
            title={
              isExpired
                ? "Coupon has expired"
                : `Click to mark as ${isActive ? "INACTIVE" : "ACTIVE"}`
            }
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCouponStatus(r);
            }}
            className={cn(
              "group transition",
              isExpired ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:opacity-80 active:scale-95",
            )}
          >
            <StatusPill status={eff} />
          </button>
        );
      },
    },
  ];

  const create = async () => {
    if (!code) {
      return toast.error("Coupon code required");
    }

    if (!/^[A-Za-z0-9]+$/.test(code)) {
      return toast.error("Coupon code can only contain alphanumeric characters without spaces");
    }
    const startDate = new Date();

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const payload = {
      code: code.toUpperCase(),

      discountType,
      discountValue: Number(value),

      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: Number(maxDiscountAmount),

      usageLimit: Number(usageLimit),
      perUserLimit: Number(perUserLimit),

      startDate: startDate.toISOString(),
      endDate: expiryDate.toISOString(),
      expiryDate: expiryDate.toISOString(),

      applicableUsers,
    };

    try {
      await createCoupon(payload);

      toast.success(`Coupon ${payload.code} created`);

      setCode("");
      setValue("");
      setUsageLimit("500");

      setStartDate("");
      setExpiryDate("");

      setOpen(false);

      const response: any = await fetchCoupons();
      setRows(response.results.data);
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      toast.error(error.data?.message || error.message || "Failed to create coupon");
    }
  };

  return (
    <>
      <PageHeader
        title="Coupons & Promotions"
        description="Discount codes, seasonal offers, and referral campaigns."
      />
      <DataTable
        columns={cols}
        exportColumns={exportColumns}
        rows={rows}
        loading={loading}
        searchKeys={["code", "discountType", "discountValue", "status"]}
        filters={[
          {
            label: "Status",
            options: ["Active", "Inactive", "Expired"],
            getValue: (r) => {
              const eff = getEffectiveCouponStatus(r);
              return eff.charAt(0).toUpperCase() + eff.slice(1);
            },
          },
        ]}
        onRowClick={(r) => handleViewCoupon(r)}
        rowActions={[
          {
            label: "View",
            icon: Eye,
            onClick: (r) => handleViewCoupon(r),
          },
          {
            label: "Edit",
            icon: Pencil,
            onClick: (r) => handleOpenEditCoupon(r),
          },
        ]}
        primaryAction={{
          label: "Create Coupon",
          onClick: handleOpenAddCoupon,
        }}
        emptyState={{
          title: "No coupons yet",
          description: "Create your first discount code or promotional campaign.",
          ctaLabel: "Add Coupon",
          onCta: handleOpenAddCoupon,
        }}
      />

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setEditingCoupon(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl font-semibold">
              {editingCoupon ? "Edit Coupon" : "Add New Coupon"}
            </DialogTitle>

            <p className="text-sm text-muted-foreground">
              {editingCoupon
                ? "Update coupon details, usage limits and validity."
                : "Create a discount code, set usage limits and define validity."}
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* BASIC DETAILS */}
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-semibold">Basic Details</h3>

                <p className="text-xs text-muted-foreground">Configure the coupon and discount.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* CODE */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Coupon Code
                  </span>

                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="SAVE20"
                    className="h-11 w-full rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>

                {/* DISCOUNT TYPE */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Discount Type
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType("PERCENTAGE")}
                      className={`h-11 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                        discountType === "PERCENTAGE"
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("FIXED_AMOUNT")}
                      className={`h-11 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                        discountType === "FIXED_AMOUNT" || discountType === "FIXED"
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                      }`}
                    >
                      Fixed Amount (₹)
                    </button>
                  </div>
                </div>

                {/* DISCOUNT VALUE */}
                <label className="block space-y-1.5 col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Discount Value ({discountType === "PERCENTAGE" ? "%" : "₹"})
                  </span>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={discountType === "PERCENTAGE" ? "20" : "100"}
                      className="h-11 w-full rounded-lg border border-border bg-secondary/40 px-3 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      {discountType === "PERCENTAGE" ? "%" : "₹"}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* USAGE & RESTRICTIONS */}
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Usage & Restrictions</h3>

                <p className="text-xs text-muted-foreground">
                  Control how and where this coupon can be used.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* USAGE LIMIT */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Usage Limit
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>

                {/* PER USER */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Per User Limit
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={perUserLimit}
                    onChange={(e) => setPerUserLimit(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>

                {/* MIN ORDER */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Minimum Order Amount
                  </span>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      className="h-11 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </label>

                {/* MAX DISCOUNT */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Maximum Discount
                  </span>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      className="h-11 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </label>
              </div>

              {/* APPLICABLE USERS */}
              <div className="mt-4 space-y-1.5">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Applicable Users
                </span>

                <CustomSelect
                  value={applicableUsers}
                  onChange={(val) => setApplicableUsers(val)}
                  options={[
                    { label: "All Users", value: "ALL_USERS" },
                    { label: "New Users", value: "NEW_USERS" },
                    { label: "Existing Users", value: "EXISTING_USERS" },
                  ]}
                  placeholder="Select Applicable Users"
                />
              </div>
            </div>

            {/* VALIDITY */}
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-semibold">Coupon Validity</h3>

                <p className="text-xs text-muted-foreground">
                  Choose when this coupon can be used.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* START DATE */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Start Date
                  </span>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-secondary/40 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>

                {/* EXPIRY DATE */}
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Expiry Date
                  </span>

                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-secondary/40 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setEditingCoupon(null);
              }}
            >
              Cancel
            </Button>

            <Button
              className="bg-primary"
              onClick={
                editingCoupon
                  ? async () => {
                      const payload = {
                        code: code.toUpperCase(),
                        discountType,
                        discountValue: Number(value),
                        minOrderAmount: Number(minOrderAmount),
                        maxDiscountAmount: Number(maxDiscountAmount),
                        usageLimit: Number(usageLimit),
                        perUserLimit: Number(perUserLimit),
                        startDate,
                        endDate: expiryDate,
                        expiryDate,
                        applicableUsers,
                      };

                      try {
                        const couponId = editingCoupon._id ?? editingCoupon.id;

                        console.log("========== COUPON UPDATE ==========");
                        console.log("Coupon ID:", couponId);
                        console.log("Update Payload:", payload);

                        const updateResponse = await updateCoupon(couponId, payload);

                        console.log("Update Response:", updateResponse);
                        console.log("==================================");

                        toast.success("Coupon updated");

                        setEditingCoupon(null);
                        setOpen(false);

                        const response: any = await fetchCoupons();
                        setRows(response.results.data);
                      } catch (err: any) {
                        toast.error(err?.message || "Update failed");
                      }
                    }
                  : create
              }
            >
              {editingCoupon ? "Update Coupon" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ViewSheet
        open={Boolean(view)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setView(null);
        }}
        title={view?.code ?? "Coupon Details"}
        subtitle={
          view
            ? view.discountType === "PERCENTAGE" || view.discountType === "PERCENT"
              ? `${view.discountValue}% Discount Promotion`
              : `₹${view.discountValue} Flat Discount Promotion`
            : undefined
        }
        status={view ? getEffectiveCouponStatus(view) : undefined}
        hero={
          view && (
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-accent/5 to-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary shadow-sm">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-bold tracking-wider text-foreground">
                        {view.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(view.code);
                          toast.success("Coupon code copied to clipboard!");
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                        title="Copy coupon code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {view.discountType === "PERCENTAGE" || view.discountType === "PERCENT"
                        ? `${view.discountValue}% OFF on eligible plans`
                        : `₹${view.discountValue} Flat Discount at checkout`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">
                    {view.discountType === "PERCENTAGE" || view.discountType === "PERCENT"
                      ? `${view.discountValue}%`
                      : `₹${view.discountValue}`}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground uppercase">
                    {isCouponExpired(view) ? (
                      <span className="text-destructive font-semibold">Expired</span>
                    ) : (
                      "Discount Value"
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }
        sections={
          view
            ? [
                {
                  title: "Discount & Pricing Rules",
                  rows: [
                    {
                      label: "Coupon Code",
                      value: (
                        <code className="font-mono font-bold bg-secondary border border-border/60 px-2 py-0.5 rounded text-xs">
                          {view.code}
                        </code>
                      ),
                    },
                    {
                      label: "Discount Type",
                      value:
                        view.discountType === "FIXED_AMOUNT" || view.discountType === "FIXED"
                          ? "Fixed Amount (₹)"
                          : "Percentage (%)",
                    },
                    {
                      label: "Discount Value",
                      value:
                        view.discountType === "FIXED_AMOUNT" || view.discountType === "FIXED"
                          ? `₹${view.discountValue}`
                          : `${view.discountValue}%`,
                    },
                    {
                      label: "Min Order Amount",
                      value: `₹${view.minOrderAmount ?? 0}`,
                    },
                    {
                      label: "Max Discount Amount",
                      value: view.maxDiscountAmount ? `₹${view.maxDiscountAmount}` : "No Limit",
                    },
                  ],
                },
                {
                  title: "Usage & Restrictions",
                  rows: [
                    {
                      label: "Total Usage Limit",
                      value: `${view.usageLimit ?? "Unlimited"} redemptions`,
                    },
                    {
                      label: "Times Used",
                      value: `${view.usedCount ?? 0} times`,
                    },
                    {
                      label: "Remaining Quota",
                      value:
                        typeof view.usageLimit === "number"
                          ? `${Math.max(0, view.usageLimit - (view.usedCount ?? 0))} remaining`
                          : "Unlimited",
                    },
                    {
                      label: "Per User Limit",
                      value: `${view.perUserLimit ?? 1} redemption per user`,
                    },
                    {
                      label: "Applicable Users",
                      value:
                        view.applicableUserType === "NEW_USERS" || view.applicableUsers === "NEW_USERS"
                          ? "New Users Only"
                          : view.applicableUserType === "EXISTING_USERS" || view.applicableUsers === "EXISTING_USERS"
                            ? "Existing Users Only"
                            : "All Users",
                    },
                  ],
                },
                {
                  title: "Validity & Schedule",
                  rows: [
                    {
                      label: "Start Date",
                      value: view.startDate
                        ? new Date(view.startDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—",
                    },
                    {
                      label: "Expiry Date",
                      value: (
                        <div className="flex items-center gap-2">
                          <span>{formatCouponExpiry(view)}</span>
                          {isCouponExpired(view) ? (
                            <span className="rounded bg-destructive/15 border border-destructive/20 px-1.5 py-0.5 text-[10px] font-semibold text-destructive uppercase">
                              Expired
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                              Valid
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      label: "Status",
                      value: <StatusPill status={getEffectiveCouponStatus(view)} />,
                    },
                    {
                      label: "Created At",
                      value: view.createdAt
                        ? new Date(view.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—",
                    },
                  ],
                },
              ]
            : []
        }
        actions={
          view
            ? [
                ...(isCouponExpired(view)
                  ? []
                  : [
                      {
                        label:
                          view.status?.toUpperCase() === "ACTIVE"
                            ? "Deactivate Coupon"
                            : "Activate Coupon",
                        variant: (view.status?.toUpperCase() === "ACTIVE"
                          ? "destructive"
                          : "default") as "destructive" | "default",
                        onClick: () => handleToggleCouponStatus(view),
                      },
                    ]),
                {
                  label: "Edit Coupon",
                  variant: "primary" as const,
                  onClick: () => handleOpenEditCoupon(view),
                },
              ]
            : undefined
        }
      />
    </>
  );
}
