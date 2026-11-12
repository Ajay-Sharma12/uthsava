import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Pencil, Eye, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/admin/Primitives";
import { toast } from "sonner";
import { z } from "zod";

const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

const subAdminSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .regex(nameRegex, "First name must contain letters only"),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .regex(nameRegex, "Last name must contain letters only"),
  email: z.string().trim().email("Please enter a valid email address"),
  roleId: z.string().min(1, "Please select an administrative role"),
  mobile: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^\d{8,12}$/.test(val), {
      message: "Phone number must be between 8 and 12 digits",
    }),
  countryCode: z.number().default(91),
  status: z.enum(["active", "inactive"]).default("active"),
});

const Field = ({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    {children}
    {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
  </div>
);

const inputCls = (hasError = false) =>
  `h-10 w-full rounded-lg border bg-card px-3 text-sm transition focus:outline-none focus:ring-2 ${
    hasError
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "border-border focus:border-primary/40 focus:ring-primary/20"
  }`;

export type SubAdminFormData = {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  mobile?: string;
  countryCode?: number;
  status?: string;
  password?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "view" | "edit";
  subAdmin?: any;
  roles: {
    _id: string;
    name: string;
    description?: string;
    permissions?: Record<string, Record<string, boolean>>;
  }[];
  onCreate: (payload: SubAdminFormData) => Promise<void>;
  onUpdate: (id: string, payload: Partial<SubAdminFormData>) => Promise<void>;
};

export function AddSubAdminDialog({
  open,
  onOpenChange,
  mode,
  subAdmin,
  roles,
  onCreate,
  onUpdate,
}: Props) {
  const [form, setForm] = useState<SubAdminFormData>({
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
    mobile: "",
    countryCode: 91,
    status: "active",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setErrors({});
      return;
    }

    if (mode === "create") {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        roleId: roles.length > 0 ? roles[0]._id : "",
        mobile: "",
        countryCode: 91,
        status: "active",
      });
      setErrors({});
      return;
    }

    if (subAdmin) {
      setForm({
        firstName: subAdmin.firstName || "",
        lastName: subAdmin.lastName || "",
        email: subAdmin.email || "",
        roleId:
          subAdmin.roleId?._id ||
          subAdmin.role?._id ||
          (typeof subAdmin.roleId === "string" ? subAdmin.roleId : "") ||
          "",
        mobile: subAdmin.mobile || "",
        countryCode: subAdmin.countryCode || 91,
        status: subAdmin.status || "active",
      });
      setErrors({});
    }
  }, [open, mode, subAdmin, roles]);

  const update = <K extends keyof SubAdminFormData>(key: K, value: SubAdminFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const submit = async () => {
    const result = subAdminSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        errs[path] = issue.message;
      });
      setErrors(errs);
      toast.error("Please correct highlighted errors in the form");
      return;
    }

    try {
      setLoading(true);
      if (mode === "edit" && subAdmin?._id) {
        await onUpdate(subAdmin._id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          roleId: form.roleId,
          mobile: form.mobile ? form.mobile.trim() : undefined,
          countryCode: form.countryCode || 91,
          status: form.status,
        });
      } else {
        await onCreate({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          roleId: form.roleId,
          mobile: form.mobile ? form.mobile.trim() : undefined,
          countryCode: form.countryCode || 91,
          status: form.status,
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("SubAdmin form submission error:", err);
      const backendErrors = err?.data?.errors;
      if (backendErrors && typeof backendErrors === "object") {
        setErrors(backendErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find((r) => r._id === form.roleId);
  const viewRole =
    subAdmin?.roleId && typeof subAdmin.roleId === "object"
      ? subAdmin.roleId
      : roles.find((r) => r._id === subAdmin?.roleId);

  const permissions = viewRole?.permissions || subAdmin?.permissions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? (
              <UserPlus className="h-5 w-5 text-primary" />
            ) : mode === "edit" ? (
              <Pencil className="h-5 w-5 text-primary" />
            ) : (
              <Eye className="h-5 w-5 text-primary" />
            )}
            <span>
              {mode === "create"
                ? "Add Sub-Admin"
                : mode === "edit"
                  ? "Edit Sub-Admin"
                  : "Sub-Admin Details"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new sub-administrator account with specific role-based permissions."
              : mode === "edit"
                ? "Update sub-administrator profile, role assignment, and account status."
                : "View full account information and role-based module permissions."}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" ? (
          <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 font-bold text-primary text-base">
                  {subAdmin?.fullName
                    ?.split(" ")
                    .map((s: string) => s[0])
                    .slice(0, 2)
                    .join("") || "SA"}
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {subAdmin?.fullName || `${subAdmin?.firstName || ""} ${subAdmin?.lastName || ""}`}
                  </div>
                  <div className="text-xs text-muted-foreground">{subAdmin?.email}</div>
                </div>
              </div>
              <StatusPill status={subAdmin?.status || "active"} />
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 text-sm">
              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Assigned Role</div>
                <div className="mt-1 font-semibold text-foreground">
                  {viewRole?.name || subAdmin?.role?.name || subAdmin?.role || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Contact Number</div>
                <div className="mt-1 font-medium text-foreground">
                  {subAdmin?.mobile ? `+${subAdmin.countryCode || 91} ${subAdmin.mobile}` : "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Last Login</div>
                <div className="mt-1 text-xs text-foreground">
                  {subAdmin?.lastLoginAt ? new Date(subAdmin.lastLoginAt).toLocaleString() : "Never logged in"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase text-muted-foreground">Account Created</div>
                <div className="mt-1 text-xs text-foreground">
                  {subAdmin?.createdAt ? new Date(subAdmin.createdAt).toLocaleString() : "—"}
                </div>
              </div>
            </div>

            {permissions && typeof permissions === "object" && Object.keys(permissions).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Module Permissions</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3">
                  {Object.entries(permissions).map(([mod, perms]: [string, any]) => {
                    const isAll = Boolean(perms?.all);
                    return (
                      <div key={mod} className="flex items-center justify-between rounded-lg bg-card p-2 text-xs border border-border/50">
                        <span className="font-semibold uppercase text-foreground">{mod.replace("_", " ")}</span>
                        <div className="flex items-center gap-1">
                          {isAll ? (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              FULL ACCESS
                            </span>
                          ) : (
                            <>
                              {perms?.view && <span className="rounded bg-secondary px-1 py-0.5 text-[10px]">VIEW</span>}
                              {perms?.create && <span className="rounded bg-emerald-500/10 text-emerald-600 px-1 py-0.5 text-[10px]">ADD</span>}
                              {perms?.edit && <span className="rounded bg-amber-500/10 text-amber-600 px-1 py-0.5 text-[10px]">EDIT</span>}
                              {perms?.delete && <span className="rounded bg-rose-500/10 text-rose-600 px-1 py-0.5 text-[10px]">DEL</span>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 py-3">
            <Field label="First Name *" error={errors.firstName}>
              <input
                className={inputCls(Boolean(errors.firstName))}
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="e.g. Rahul"
              />
            </Field>

            <Field label="Last Name *" error={errors.lastName}>
              <input
                className={inputCls(Boolean(errors.lastName))}
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="e.g. Sharma"
              />
            </Field>

            <div className="col-span-2">
              <Field label="Email Address *" error={errors.email}>
                <input
                  type="email"
                  className={inputCls(Boolean(errors.email))}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="subadmin@uthsava.com"
                />
              </Field>
            </div>

            <div>
              <Field label="Phone Number" error={errors.mobile}>
                <div className="flex gap-2">
                  <span className="flex h-10 w-16 items-center justify-center rounded-lg border border-border bg-secondary/50 text-xs font-semibold text-muted-foreground">
                    +91
                  </span>
                  <input
                    type="tel"
                    className={inputCls(Boolean(errors.mobile))}
                    value={form.mobile || ""}
                    onChange={(e) => update("mobile", e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    maxLength={12}
                  />
                </div>
              </Field>
            </div>

            <div>
              <Field label="Role Assignment *" error={errors.roleId}>
                <select
                  className={inputCls(Boolean(errors.roleId))}
                  value={form.roleId}
                  onChange={(e) => update("roleId", e.target.value)}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Account Status">
                <select
                  className={inputCls()}
                  value={form.status}
                  onChange={(e) => update("status", e.target.value as "active" | "inactive")}
                >
                  <option value="active">Active (Full access permitted)</option>
                  <option value="inactive">Inactive (Access suspended)</option>
                </select>
              </Field>
            </div>

            {mode === "create" && (
              <div className="col-span-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Note:</span> An automated welcome email containing a secure initial login password and portal URL will be sent to the sub-admin upon creation.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-secondary transition"
          >
            {mode === "view" ? "Close" : "Cancel"}
          </button>

          {mode !== "view" && (
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow hover:brightness-110 disabled:opacity-50 transition"
            >
              {loading
                ? mode === "create"
                  ? "Creating Sub-Admin…"
                  : "Saving Changes…"
                : mode === "create"
                  ? "Create Sub-Admin"
                  : "Save Changes"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
