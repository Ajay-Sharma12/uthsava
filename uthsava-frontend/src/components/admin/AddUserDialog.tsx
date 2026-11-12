import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  UserPlus,
  UserCog,
  Loader2,
  User,
  Shield,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().max(80).optional().default(""),
    email: z
      .string()
      .trim()
      .max(200)
      .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: "Invalid email address",
      })
      .optional()
      .default(""),
    phone: z.string().trim().max(20).optional().default(""),

    password: z.string().max(128).optional().default(""),
    confirm: z.string().optional().default(""),

    country: z.string().optional().default(""),
    state: z.string().optional().default(""),
    city: z.string().optional().default(""),
    gender: z.string().optional().default(""),
    dob: z.string().optional().default(""),
    plan: z.string().optional().default(""),
    role: z.string().optional().default("User"),
  })
  .refine(
    (d) => {
      if (!d.password && !d.confirm) {
        return true;
      }
      return d.password === d.confirm;
    },
    {
      path: ["confirm"],
      message: "Passwords do not match",
    }
  );

const inputCls =
  "h-10 w-full rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all";

const Field = ({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
      {required && <span className="text-primary">*</span>}
    </span>
    {children}
  </label>
);

export type NewUser = {
  name: string;
  email: string;
  phone: string;
  password?: string;
  country: string;
  plan: string;
  activeSubscriptionPlan: string | null;
  role: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
};

export type UserForEdit = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  country?: string;
  state?: string;
  city?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;
  activeSubscriptionPlan?: string | null;
  accountStatus?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  profileImageUrl?: string;
  password?: string;
  [key: string]: any;
};

export function AddUserDialog({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  user,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreate?: (u: NewUser) => void | Promise<void>;
  onUpdate?: (u: UserForEdit) => void | Promise<void>;
  user?: any;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    country: "India",
    state: "",
    city: "",
    gender: "",
    dob: "",
    plan: "",
    role: "User",
  });

  const [active, setActive] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirm: "",
        country: "India",
        state: "",
        city: "",
        gender: "",
        dob: "",
        plan: "",
        role: "User",
      });

      setActive(true);
      setEmailVerified(false);
      setMobileVerified(false);
      setErrors({});
      return;
    }

    // Edit mode
    const nameParts = user.name?.trim().split(/\s+/) ?? [];

    setForm({
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" ") ?? "",
      email: user.email ?? "",
      phone: user.mobile ?? "",
      password: "",
      confirm: "",
      country: user.country ?? "India",
      state: user.state ?? "",
      city: user.city ?? "",
      gender: user.gender ? user.gender.toLowerCase() : "",
      dob: user.dateOfBirth ?? "",
      plan: user.activeSubscriptionPlan ?? "",
      role: user.role ?? "User",
    });

    setActive(String(user.accountStatus ?? "").toLowerCase() === "active");
    setEmailVerified(Boolean(user.isEmailVerified));
    setMobileVerified(Boolean(user.isMobileVerified));
    setErrors({});
  }, [user, open]);

  const upd = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[k];
        return next;
      });
    }
  };

  const submit = async (addAnother = false) => {
    const res = schema.safeParse(form);

    if (!res.success) {
      const errMap: Record<string, string> = {};
      res.error.issues.forEach((i) => {
        const fieldName = String(i.path[0] ?? "");
        if (fieldName) errMap[fieldName] = i.message;
      });
      setErrors(errMap);
      const firstErr = res.error.issues[0]?.message || "Please fix validation errors";
      toast.error(firstErr);
      return;
    }

    setSubmitting(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

    const userData: NewUser = {
      name: fullName,
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password ? form.password.trim() : undefined,
      country: form.country,
      plan: form.plan,
      activeSubscriptionPlan: form.plan || null,
      role: form.role,
      isEmailVerified: emailVerified,
      isMobileVerified: mobileVerified,
    };

    try {
      if (user && onUpdate) {
        await onUpdate({
          ...user,
          name: fullName,
          email: form.email.trim(),
          mobile: form.phone.trim(),
          country: form.country,
          state: form.state,
          city: form.city,
          dateOfBirth: form.dob,
          gender: form.gender,
          role: form.role,
          activeSubscriptionPlan: form.plan || null,
          accountStatus: active ? "active" : "inactive",
          isEmailVerified: emailVerified,
          isMobileVerified: mobileVerified,
          profileImageUrl: user.profileImageUrl,
          password: form.password.trim() ? form.password.trim() : undefined,
        });
      } else if (onCreate) {
        await onCreate(userData);
      }

      if (addAnother && !user) {
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          confirm: "",
          country: "India",
          state: "",
          city: "",
          gender: "",
          dob: "",
          plan: "",
          role: "User",
        });
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("SAVE USER ERROR:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={submitting ? () => {} : onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              {user ? <UserCog className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{user ? `Edit User: ${user.name}` : "Add New User"}</span>
                {user && (
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                    active
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  )}>
                    {active ? "Active" : "Inactive"}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {user
                  ? "Update subscriber profile, contact numbers, subscription and access controls."
                  : "Create a subscriber account with full profile and security privileges."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-3">
          <div className="bg-secondary/40 p-1.5 rounded-2xl border border-border/50">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 gap-1.5">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs cursor-pointer"
              >
                <User className="h-3.5 w-3.5" /> Profile Info
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="flex items-center gap-2 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" /> Account & Security
              </TabsTrigger>
              <TabsTrigger
                value="access"
                className="flex items-center gap-2 rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5" /> Plan & Privileges
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: PROFILE */}
          <TabsContent value="profile" className="mt-4 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="First Name" required>
                <input
                  className={inputCls}
                  value={form.firstName}
                  onChange={(e) => upd("firstName", e.target.value)}
                  placeholder="e.g. Rahul"
                />
                {errors.firstName && (
                  <p className="mt-1 text-[11px] font-medium text-destructive">{errors.firstName}</p>
                )}
              </Field>

              <Field label="Last Name">
                <input
                  className={inputCls}
                  value={form.lastName}
                  onChange={(e) => upd("lastName", e.target.value)}
                  placeholder="e.g. Sharma"
                />
                {errors.lastName && (
                  <p className="mt-1 text-[11px] font-medium text-destructive">{errors.lastName}</p>
                )}
              </Field>

              <Field label="Gender">
                <CustomSelect
                  value={form.gender}
                  onChange={(val) => upd("gender", val)}
                  placeholder="Select Gender"
                  options={[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Other", value: "other" },
                  ]}
                />
              </Field>

              <Field label="Date of Birth">
                <input
                  type="date"
                  className={inputCls}
                  value={form.dob}
                  onChange={(e) => upd("dob", e.target.value)}
                />
              </Field>

              <Field label="Country">
                <CustomSelect
                  value={form.country}
                  onChange={(val) => upd("country", val)}
                  placeholder="Select Country"
                  options={["India", "UAE", "USA", "UK", "Singapore", "Canada", "Australia"]}
                />
              </Field>

              <Field label="State / Province">
                <input
                  className={inputCls}
                  value={form.state}
                  onChange={(e) => upd("state", e.target.value)}
                  placeholder="e.g. Maharashtra"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="City">
                  <input
                    className={inputCls}
                    value={form.city}
                    onChange={(e) => upd("city", e.target.value)}
                    placeholder="e.g. Mumbai"
                  />
                </Field>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: ACCOUNT & SECURITY */}
          <TabsContent value="account" className="mt-4 space-y-3.5 animate-in fade-in duration-200">
            <Field label="Email Address">
              <input
                className={inputCls}
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
                placeholder="user@uthsava.tv"
              />
              {errors.email && (
                <p className="mt-1 text-[11px] font-medium text-destructive">{errors.email}</p>
              )}
            </Field>

            <Field label="Phone / Mobile Number">
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => upd("phone", e.target.value)}
                placeholder="+91 9876543210"
              />
              {errors.phone && (
                <p className="mt-1 text-[11px] font-medium text-destructive">{errors.phone}</p>
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-border/60">
              <Field label={user ? "New Password (Optional)" : "Password"}>
                <input
                  type="password"
                  className={inputCls}
                  value={form.password}
                  onChange={(e) => upd("password", e.target.value)}
                  placeholder={user ? "Leave blank to keep current" : "••••••••"}
                />
                {errors.password && (
                  <p className="mt-1 text-[11px] font-medium text-destructive">{errors.password}</p>
                )}
              </Field>

              <Field label={user ? "Confirm New Password" : "Confirm Password"}>
                <input
                  type="password"
                  className={inputCls}
                  value={form.confirm}
                  onChange={(e) => upd("confirm", e.target.value)}
                  placeholder={user ? "Leave blank to keep current" : "••••••••"}
                />
                {errors.confirm && (
                  <p className="mt-1 text-[11px] font-medium text-destructive">{errors.confirm}</p>
                )}
              </Field>
            </div>
          </TabsContent>

          {/* TAB 3: ACCESS & PRIVILEGES */}
          <TabsContent value="access" className="mt-4 space-y-3.5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Active Subscription Plan">
                <CustomSelect
                  value={form.plan}
                  onChange={(val) => upd("plan", val)}
                  placeholder="No Active Plan (Free User)"
                  options={["Basic", "Standard", "Premium", "VIP Family"]}
                />
              </Field>

              <Field label="Platform Role">
                <CustomSelect
                  value={form.role}
                  onChange={(val) => upd("role", val)}
                  placeholder="Select Platform Role"
                  options={[
                    { label: "Standard User", value: "User" },
                    { label: "Subscriber", value: "Subscriber" },
                    { label: "Free Trial", value: "Trial" },
                    { label: "Influencer / VIP", value: "Influencer" },
                    { label: "Beta Tester", value: "Beta Tester" },
                  ]}
                />
              </Field>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-border/60">
              {[
                {
                  l: "Account Active Status",
                  v: active,
                  set: setActive,
                  h: "User can authenticate and stream licensed content.",
                },
                {
                  l: "Email Address Verified",
                  v: emailVerified,
                  set: setEmailVerified,
                  h: "Confirm user has validated their registered email.",
                },
                {
                  l: "Mobile Number Verified",
                  v: mobileVerified,
                  set: setMobileVerified,
                  h: "Confirm user has verified OTP on their mobile.",
                },
              ].map((r) => (
                <div
                  key={r.l}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 p-4 shadow-2xs hover:border-primary/30 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-foreground">{r.l}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{r.h}</div>
                  </div>
                  <Switch checked={r.v} onCheckedChange={r.set} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 pt-4 border-t border-border/60 flex-row items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-4 text-xs font-semibold hover:bg-secondary hover:text-foreground disabled:opacity-40 transition cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!user && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit(true)}
                className="h-10 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer active:scale-[0.98]"
              >
                Save & Add Another
              </button>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit(false)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary px-5 text-xs font-bold text-white shadow-md shadow-primary/25 transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {user ? (submitting ? "Updating..." : "Update User Profile") : (submitting ? "Saving..." : "Create User")}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
