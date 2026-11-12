import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DataTable, Column, RowAction } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import { getUsers, getUserById, updateUserStatus, updateUser } from "@/lib/services/users";
import { AddUserDialog, UserForEdit } from "@/components/admin/AddUserDialog";
import { sendNotification } from "@/lib/services/notifications";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  ShieldCheck,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  User,
  ShieldAlert,
  Loader2,
  Pencil,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "User Management — Uthsava Admin" }] }),
  component: UsersPage,
});

export type User = {
  id: string;
  userId: number | string;
  name: string;
  email: string;
  mobile: string;
  countryCode: number | string;
  country: string;
  state: string;
  city: string;
  dateOfBirth: string;
  gender?: string;
  role?: string;

  isEmailVerified: boolean;
  isMobileVerified: boolean;

  activeSubscriptionPlan: string | null;
  subscriptionStatus: string;
  subscription?: {
    plan?: string;
    name?: string;
    status?: string;
    planType?: string;
    currentPlan?: string;
    startDate?: string;
    expiryDate?: string;
  } | null;

  registrationDate: string;
  lastLoginDate: string;
  accountStatus: string;
  loginType: string;

  profileImageUrl: string;
  _raw?: any;
};

const ACCOUNT_STATUS_OPTIONS = [
  {
    value: "active",
    label: "ACTIVE",
    description: "User has full access to login and stream content.",
    badgeClass: "bg-success/15 text-success border-success/30",
    dotClass: "bg-green-600",
  },
  {
    value: "inactive",
    label: "INACTIVE",
    description: "Account is deactivated. User cannot stream or login.",
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-gray-400",
  },
  {
    value: "suspended",
    label: "SUSPENDED",
    description: "Account access is suspended due to violations or admin review.",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
    dotClass: "bg-red-600",
  },
];

function normalizeUserData(raw: any): User {
  const profileName = raw?.profile
    ? `${raw.profile.firstName || ""} ${raw.profile.lastName || ""}`.trim()
    : "";

  const name =
    raw?.name ||
    raw?.fullName ||
    profileName ||
    "Unnamed User";

  const email = raw?.email ?? raw?.profile?.email ?? "";
  const mobile = raw?.mobile ?? raw?.phone ?? raw?.profile?.mobile ?? raw?.profile?.phone ?? "";
  const countryCode = raw?.countryCode ?? raw?.profile?.countryCode ?? 91;
  const country = raw?.country ?? raw?.profile?.country ?? "";
  const state = raw?.state ?? raw?.profile?.state ?? "";
  const city = raw?.city ?? raw?.profile?.city ?? "";
  const dateOfBirth = raw?.dateOfBirth ?? raw?.dob ?? raw?.profile?.dateOfBirth ?? raw?.profile?.dob ?? "";
  const gender = raw?.gender ?? raw?.profile?.gender ?? "";

  const plan =
    raw?.activeSubscriptionPlan ??
    raw?.subscriptionInformation?.planType ??
    raw?.subscriptionInformation?.currentPlan ??
    raw?.subscription?.plan ??
    raw?.subscription?.name ??
    raw?.plan ??
    null;

  const subscriptionStatus =
    raw?.subscriptionStatus ??
    raw?.subscriptionInformation?.status ??
    raw?.subscription?.status ??
    (plan ? "active" : "none");

  const profileImageUrl =
    raw?.profileImageUrl ??
    raw?.profileImage ??
    raw?.profile?.profileImage ??
    "";

  const accountStatus = String(raw?.accountStatus ?? raw?.status ?? "active").toLowerCase();

  const id = String(raw?._id ?? raw?.id ?? raw?.userId ?? "");

  return {
    id,
    userId: raw?.userId ?? raw?._id ?? raw?.id ?? "-",
    name,
    email,
    mobile,
    countryCode,
    country,
    state,
    city,
    dateOfBirth,
    gender,
    role: raw?.role ?? "User",
    isEmailVerified: Boolean(raw?.isEmailVerified),
    isMobileVerified: Boolean(raw?.isMobileVerified),
    activeSubscriptionPlan: plan && typeof plan === "object" ? (plan as any).name || (plan as any).planName : plan,
    subscriptionStatus,
    subscription: raw?.subscription ?? raw?.subscriptionInformation ?? null,
    registrationDate: raw?.registrationDate ?? raw?.createdAt ?? raw?.created_at ?? "",
    lastLoginDate: raw?.lastLoginDate ?? raw?.lastLoginAt ?? raw?.last_login_at ?? "",
    accountStatus,
    loginType: raw?.loginType ?? "Email",
    profileImageUrl,
    _raw: raw,
  };
}

function UsersPage() {
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialStatus = urlParams?.get("status") ?? "";

  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [statusChangeUser, setStatusChangeUser] = useState<User | null>(null);
  const [notifyUser, setNotifyUser] = useState<User | null>(null);

  const filteredRows = initialStatus
    ? rows.filter((user) => user.accountStatus.toLowerCase() === initialStatus.toLowerCase())
    : rows;

  const planOptions = ["Basic", "Standard", "Premium", "Family"];
  const accountStatusFilterOptions = ["Active", "Inactive", "Suspended"];
  const subscriptionStatusFilterOptions = ["Active", "Inactive", "Suspended", "None"];
  const countryOptions = ["91", "1", "44", "971", "61", "65", "49", "33", "81", "966"];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response: any = await getUsers({ limit: 100, page: 1 });
      const rawList = Array.isArray(response)
        ? response
        : response?.results?.data ?? response?.data?.users ?? response?.data ?? response?.results ?? [];

      const normalized = rawList.map(normalizeUserData);
      setRows(normalized);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenView = async (user: User) => {
    setViewUser(user);
    try {
      if (user.id) {
        const fullResponse: any = await getUserById(user.id);
        const data = fullResponse?.data ?? fullResponse?.results ?? fullResponse?.user ?? fullResponse;
        if (data && (data.id || data._id)) {
          const detailedUser = normalizeUserData({ ...user, ...data });
          setViewUser(detailedUser);
          setRows((prev) => prev.map((r) => (r.id === user.id ? detailedUser : r)));
        }
      }
    } catch (err) {
      console.warn("Could not fetch full user detail on view:", err);
    }
  };

  const handleStatusUpdated = (userId: string, newStatus: string) => {
    const lowerStatus = newStatus.toLowerCase();
    setRows((prev) =>
      prev.map((r) => (r.id === userId ? { ...r, accountStatus: lowerStatus } : r))
    );
    setViewUser((prev) => (prev && prev.id === userId ? { ...prev, accountStatus: lowerStatus } : prev));
  };

  const handleUpdateUser = async (updated: UserForEdit) => {
    try {
      const payload: any = {
        fullName: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        country: updated.country,
        state: updated.state,
        city: updated.city,
        gender: updated.gender,
        dateOfBirth: updated.dateOfBirth,
        role: updated.role,
        status: updated.accountStatus,
        isEmailVerified: updated.isEmailVerified,
        isMobileVerified: updated.isMobileVerified,
        activeSubscriptionPlan: updated.activeSubscriptionPlan || null,
      };

      if (updated.profileImageUrl) {
        payload.profileImage = updated.profileImageUrl;
      }

      if (updated.password && updated.password.trim()) {
        payload.password = updated.password.trim();
      }

      const targetId = updated.id || (updated as any)._id;
      await updateUser(targetId, payload);
      toast.success(`User ${updated.name} updated successfully`);
      setEditUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update user:", error);
      toast.error(error?.data?.message || error?.message || "Failed to update user");
      throw error;
    }
  };

  const handleStatusToggle = async (user: User) => {
    if (!user.id) return;
    try {
      const currentStatus = String(user.accountStatus ?? "").toLowerCase();
      if (currentStatus === "deleted") {
        return;
      }

      // If user is suspended, do not toggle directly to active. Open the explicit status dialog.
      if (currentStatus === "suspended") {
        setStatusChangeUser(user);
        return;
      }

      const newStatus = currentStatus === "active" ? "inactive" : "active";

      await updateUserStatus(user.id, {
        status: newStatus,
      });

      // Update table immediately
      setRows((prev) =>
        prev.map((row) =>
          row.id === user.id ? { ...row, accountStatus: newStatus } : row
        )
      );

      // Update view sheet immediately
      setViewUser((prev) =>
        prev?.id === user.id ? { ...prev, accountStatus: newStatus } : prev
      );

      toast.success(`User status changed to ${newStatus}`);
    } catch (error: any) {
      console.error("STATUS TOGGLE ERROR:", error);
      toast.error(error?.message || "Failed to update status");
    }
  };

  const cols: Column<User>[] = [
    {
      key: "userId",
      header: "User ID",
    },
    {
      key: "name",
      header: "User",
      render: (r: User) => {
        const initials = (r.name || "User")
          .split(" ")
          .filter(Boolean)
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary font-medium text-foreground text-xs shadow-2xs">
              {initials}
            </div>

            <div>
              <div className="font-medium text-foreground">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (r: User) => `+${r.countryCode || 91} ${r.mobile || "—"}`,
    },
    {
      key: "activeSubscriptionPlan",
      header: "Plan",
      render: (r: User) => {
        const rawPlan = r.activeSubscriptionPlan;
        const planName =
          rawPlan && typeof rawPlan === "object"
            ? (rawPlan as any).planName || (rawPlan as any).name
            : rawPlan;

        const displayPlan = planName || r.subscription?.plan || r.subscription?.name;

        return displayPlan ? (
          <span className="font-medium text-foreground">{displayPlan}</span>
        ) : (
          <span className="text-muted-foreground">No Plan</span>
        );
      },
    },
    {
      key: "subscriptionStatus",
      header: "Subscription",
      render: (r: User) => <StatusPill status={r.subscriptionStatus || "none"} />,
    },
    {
      key: "accountStatus",
      header: "Status",
      render: (r: User) => {
        const status = String(r.accountStatus ?? "").toLowerCase();
        const isActive = status === "active";
        const isInactive = status === "inactive";
        const isSuspended = status === "suspended";
        const isDeleted = status === "deleted";

        return (
          <button
            type="button"
            disabled={isDeleted}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDeleted) {
                handleStatusToggle(r);
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium cursor-pointer transition hover:opacity-85 ${
              isActive
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
                : isInactive
                  ? "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                  : isSuspended
                    ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                    : isDeleted
                      ? "border-red-200 bg-red-50 text-red-700 cursor-not-allowed opacity-70"
                      : "border-gray-200 bg-gray-50 text-gray-700"
            }`}
            title={
              isDeleted
                ? "Deleted user"
                : isSuspended
                  ? "User suspended by Admin (Click to change status)"
                  : `Click to toggle status (Make ${isActive ? "inactive" : "active"})`
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive
                  ? "bg-green-600"
                  : isInactive
                    ? "bg-gray-400"
                    : isSuspended || isDeleted
                      ? "bg-red-600"
                      : "bg-gray-500"
              }`}
            />
            {status}
          </button>
        );
      },
    },
    {
      key: "registrationDate",
      header: "Joined",
      render: (r: User) =>
        r.registrationDate ? new Date(r.registrationDate).toLocaleDateString() : "-",
    },
    {
      key: "lastLoginDate",
      header: "Last Login",
      render: (r: User) =>
        r.lastLoginDate ? new Date(r.lastLoginDate).toLocaleDateString() : "-",
    },
  ];

  const actions: RowAction<User>[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (r) => handleOpenView(r),
    },
    {
      label: "Change Status",
      icon: ShieldCheck,
      onClick: (r) => setStatusChangeUser(r),
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: (r) => setEditUser(r),
    },
    {
      label: "Send Notification",
      icon: Bell,
      onClick: (r) => setNotifyUser(r),
    },
  ];

  const handleExport = () => {
    if (!filteredRows.length) {
      toast.error("No users available to export");
      return;
    }

    const headers = [
      "User ID",
      "Name",
      "Email",
      "Mobile",
      "Plan",
      "Subscription Status",
      "Joined",
      "Last Login",
      "Account Status",
    ];

    const csvRows = filteredRows.map((user) => [
      user.userId,
      user.name,
      user.email,
      `+${user.countryCode} ${user.mobile}`,
      user.activeSubscriptionPlan ?? "No Plan",
      user.subscriptionStatus ?? "none",
      user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : "-",
      user.lastLoginDate ? new Date(user.lastLoginDate).toLocaleDateString() : "Never",
      user.accountStatus.toUpperCase(),
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Users exported successfully");
  };

  return (
    <>
      <PageHeader
        title="User Management"
        description="View registered users, subscriber details, and manage account statuses."
      />

      {/* Stats Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Total Users", v: rows.length.toLocaleString(), tone: "text-foreground" },
          {
            l: "Active Accounts",
            v: rows.filter((r) => r.accountStatus === "active").length.toLocaleString(),
            tone: "text-emerald-500",
          },
          {
            l: "Active Subscribers",
            v: rows.filter((r) => r.subscriptionStatus === "active").length.toLocaleString(),
            tone: "text-primary",
          },
          {
            l: "Inactive / Suspended",
            v: rows.filter((r) => r.accountStatus === "inactive" || r.accountStatus === "suspended").length.toLocaleString(),
            tone: "text-amber-500",
          },
        ].map((s) => (
          <Surface key={s.l} className="p-4 rounded-2xl border border-border bg-card shadow-xs">
            <div className="text-xs font-medium text-muted-foreground">{s.l}</div>
            <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.v}</div>
          </Surface>
        ))}
      </div>

      <DataTable
        columns={cols}
        rows={filteredRows}
        loading={loading}
        exportFileName="users"
        searchKeys={["name", "email", "id", "mobile"]}
        filters={[
          {
            label: "Account Status",
            key: "accountStatus",
            options: accountStatusFilterOptions,
          },
          {
            label: "Subscription Status",
            key: "subscriptionStatus",
            options: subscriptionStatusFilterOptions,
          },
          {
            label: "Plan",
            key: "activeSubscriptionPlan",
            options: planOptions,
          },
          {
            label: "Country",
            key: "countryCode",
            options: countryOptions,
          },
        ]}
        rowActions={actions}
        onRowClick={(r) => handleOpenView(r)}
        emptyState={{
          title: "No users found",
          description: "Registered users from the client app will appear here.",
        }}
      />

      <ViewUserSheet
        user={viewUser}
        open={!!viewUser}
        onOpenChange={(open) => !open && setViewUser(null)}
        onChangeStatus={(user) => setStatusChangeUser(user)}
        onEditUser={(user) => setEditUser(user)}
      />

      <ChangeUserStatusDialog
        user={statusChangeUser}
        open={!!statusChangeUser}
        onOpenChange={(open) => !open && setStatusChangeUser(null)}
        onStatusUpdated={handleStatusUpdated}
      />

      <AddUserDialog
        open={!!editUser}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null);
          }
        }}
        user={editUser}
        onUpdate={handleUpdateUser}
      />

      <UserNotificationDialog
        user={notifyUser}
        open={!!notifyUser}
        onOpenChange={(open) => !open && setNotifyUser(null)}
      />
    </>
  );
}

function ViewUserSheet({
  user,
  open,
  onOpenChange,
  onChangeStatus,
  onEditUser,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeStatus: (user: User) => void;
  onEditUser: (user: User) => void;
}) {
  if (!user) return null;

  const initials = (user.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const planName = user.activeSubscriptionPlan || user.subscription?.plan || user.subscription?.name || "No Active Plan";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            User Profile (Read-Only)
          </SheetTitle>
          <SheetDescription>
            Complete user account and subscription details.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-lg font-semibold text-foreground ring-2 ring-border">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">{user.name}</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {user.role || "Subscriber"}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">{user.email || "No email"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={user.accountStatus} />
              <Badge variant="secondary" className="text-xs">
                Plan: {planName}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personal & Contact Information
            </h4>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <dl className="divide-y divide-border text-xs">
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Full Name
                  </dt>
                  <dd className="col-span-2 font-medium text-foreground">{user.name || "—"}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </dt>
                  <dd className="col-span-2 flex items-center gap-2 font-medium text-foreground">
                    <span>{user.email || "—"}</span>
                    {user.isEmailVerified ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <AlertCircle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> Mobile
                  </dt>
                  <dd className="col-span-2 flex items-center gap-2 font-medium text-foreground">
                    <span>+{user.countryCode} {user.mobile || "—"}</span>
                    {user.isMobileVerified ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <AlertCircle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Date of Birth
                  </dt>
                  <dd className="col-span-2 text-foreground/90">{user.dateOfBirth || "—"}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Gender
                  </dt>
                  <dd className="col-span-2 capitalize text-foreground/90">{user.gender || "—"}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </dt>
                  <dd className="col-span-2 text-foreground/90">
                    {[user.city, user.state, user.country].filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subscription & Plan Details
            </h4>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <dl className="divide-y divide-border text-xs">
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" /> Current Plan
                  </dt>
                  <dd className="col-span-2 font-semibold text-foreground">{planName}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" /> Subscription Status
                  </dt>
                  <dd className="col-span-2">
                    <StatusPill status={user.subscriptionStatus || "none"} />
                  </dd>
                </div>
                {user.subscription?.startDate ? (
                  <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Start Date
                    </dt>
                    <dd className="col-span-2 text-foreground/90">
                      {new Date(user.subscription.startDate).toLocaleDateString()}
                    </dd>
                  </div>
                ) : null}
                {user.subscription?.expiryDate ? (
                  <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Expiry Date
                    </dt>
                    <dd className="col-span-2 text-foreground/90">
                      {new Date(user.subscription.expiryDate).toLocaleDateString()}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account & Security
            </h4>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <dl className="divide-y divide-border text-xs">
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="col-span-2 font-mono text-foreground/90">{user.userId}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="text-muted-foreground">Account Status</dt>
                  <dd className="col-span-2">
                    <StatusPill status={user.accountStatus} />
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="text-muted-foreground">Login Type</dt>
                  <dd className="col-span-2 capitalize text-foreground/90">{user.loginType}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="text-muted-foreground">Registration Date</dt>
                  <dd className="col-span-2 text-foreground/90">
                    {user.registrationDate
                      ? new Date(user.registrationDate).toLocaleString("en-IN")
                      : "—"}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
                  <dt className="text-muted-foreground">Last Login Date</dt>
                  <dd className="col-span-2 text-foreground/90">
                    {user.lastLoginDate
                      ? new Date(user.lastLoginDate).toLocaleString("en-IN")
                      : "Never"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-lg border border-border bg-card px-4 text-xs font-medium hover:bg-secondary"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onEditUser(user);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-secondary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit User
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeStatus(user);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Change Account Status
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChangeUserStatusDialog({
  user,
  open,
  onOpenChange,
  onStatusUpdated,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: (userId: string, newStatus: string) => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user && open) {
      const cur = user.accountStatus?.toLowerCase() || "active";
      setSelectedStatus(cur);
    }
  }, [user, open]);

  if (!user) return null;

  const currentStatus = user.accountStatus?.toLowerCase() || "active";
  const isUnchanged = selectedStatus === currentStatus;

  const handleConfirmUpdate = async () => {
    if (!user.id) return;
    setUpdating(true);

    try {
      await updateUserStatus(user.id, {
        status: selectedStatus.toLowerCase(),
      });

      onStatusUpdated(user.id, selectedStatus);
      toast.success(
        `Account status for ${user.name} changed to ${selectedStatus.toUpperCase()}`
      );
      onOpenChange(false);
    } catch (error: any) {
      console.error("STATUS UPDATE ERROR:", error);
      toast.error(error?.message || "Failed to update user status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={updating ? () => {} : onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Change Account Status
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Select a new account status for <strong className="text-foreground">{user.name}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* USER SUMMARY */}
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-foreground">{user.name}</div>
                <div className="text-muted-foreground mt-0.5">{user.email || user.mobile}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Current Status</div>
                <StatusPill status={user.accountStatus} />
              </div>
            </div>
          </div>

          {/* STATUS OPTIONS */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select Status
            </label>

            <div className="space-y-2">
              {ACCOUNT_STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/30 shadow-xs"
                        : "border-border/70 bg-card/80 hover:bg-secondary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountStatusOption"
                      checked={isSelected}
                      onChange={() => setSelectedStatus(opt.value)}
                      className="mt-0.5 h-4 w-4 text-primary accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{opt.label}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${opt.badgeClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${opt.dotClass}`} />
                          {opt.label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isUnchanged && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                Status will change from <strong className="uppercase font-bold">{currentStatus}</strong> to{" "}
                <strong className="uppercase font-bold">{selectedStatus}</strong>.
              </span>
            </div>
          )}

          <DialogFooter className="mt-4 pt-4 border-t border-border/60 flex-row items-center justify-between gap-2 sm:justify-between">
            <button
              type="button"
              disabled={updating}
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-4 text-xs font-semibold hover:bg-secondary hover:text-foreground disabled:opacity-40 transition cursor-pointer shadow-xs active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updating || isUnchanged}
              onClick={handleConfirmUpdate}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary px-5 text-xs font-bold text-white shadow-md shadow-primary/25 transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {updating ? "Updating..." : `Confirm & Change to ${selectedStatus.toUpperCase()}`}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserNotificationDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("System Notification");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("SYSTEM_UPDATE");
  const [channels, setChannels] = useState<string[]>(["EMAIL"]);
  const [sending, setSending] = useState(false);

  const NOTIFICATION_CATEGORIES = [
    { value: "SYSTEM_UPDATE", label: "System Update" },
    { value: "ACCOUNT_SECURITY_ALERT", label: "Account Security Alert" },
    { value: "PROMOTIONAL_OFFER", label: "Promotional Offer" },
    { value: "NEW_FEATURE_ANNOUNCEMENT", label: "New Feature Announcement" },
    { value: "SUBSCRIPTION_RENEWAL", label: "Subscription Renewal" },
    { value: "SUBSCRIPTION_EXPIRED", label: "Subscription Expired" },
    { value: "NEW_MOVIE_RELEASED", label: "New Movie Released" },
    { value: "NEW_SERIES_RELEASED", label: "New Series Released" },
    { value: "NEW_EPISODE_AVAILABLE", label: "New Episode Available" },
    { value: "PAYMENT_SUCCESSFUL", label: "Payment Successful" },
  ];

  useEffect(() => {
    if (user && open) {
      setTitle("System Notification");
      setMessage(`Hello ${user.name}, your account on Uthsava is active.`);
      setCategory("SYSTEM_UPDATE");
      setChannels(["EMAIL"]);
    }
  }, [user, open]);

  const selectChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch)
        ? prev.length > 1
          ? prev.filter((c) => c !== ch)
          : prev
        : [...prev, ch]
    );
  };


  const handleSend = async () => {
    if (!user) return;

    if (!title.trim()) {
      toast.error("Please enter a notification title");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a notification message");
      return;
    }

    if (channels.length === 0) {
      toast.error("Please select at least one channel (Email, Push, or SMS)");
      return;
    }

    setSending(true);

    try {
      const rawObj = (user as any)._raw || {};
      const candidateIds = [
        user.id,
        (user as any)._id,
        user.email,
        user.userId,
        rawObj._id,
        rawObj.id,
        rawObj.email,
        rawObj.userId,
      ]
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "-")
        .map((v) => String(v).trim());

      const validId = candidateIds[0] || "";

      if (!validId) {
        toast.error("User identifier not found for sending notification.");
        setSending(false);
        return;
      }

      const payload: any = {
        title: title.trim(),
        message: message.trim(),
        category,
        type: category,
        channels: channels.map((c) => c.toUpperCase()),
        notificationTypes: channels.map((c) => c.toUpperCase()),
        sendTo: "SELECTED_USERS",
        recipientType: "SELECTED_USERS",
        recipients: candidateIds,
        recipientUserIds: candidateIds,
        users: candidateIds,
      };

      console.log("📤 Sending User Notification Payload:", payload);
      await sendNotification(payload);
      toast.success(`Notification sent successfully to ${user.name}`);
      onOpenChange(false);
    } catch (error: any) {
      console.error("SEND NOTIFICATION ERROR:", error);
      toast.error(error?.data?.message || error?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={sending ? () => {} : onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Send Direct Notification
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Send a personalized push, email or SMS alert to <strong className="text-foreground">{user?.name}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3.5 text-xs">
            <span className="text-muted-foreground">Target Recipient: </span>
            <span className="font-bold text-foreground">{user?.name}</span> (
            {user?.email || user?.mobile || "No contact info"})
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Your subscription is expiring soon"
              className="h-10 w-full rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Category
            </label>
            <CustomSelect
              value={category}
              onChange={(val) => setCategory(val)}
              placeholder="Select Category"
              options={NOTIFICATION_CATEGORIES}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Message Content
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type notification message here..."
              className="w-full resize-none rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Delivery Channels
            </label>
            <div className="flex gap-2">
              {[
                { id: "EMAIL", label: "Email" },
                { id: "PUSH", label: "Push" },
                { id: "SMS", label: "SMS" },
              ].map((ch) => {
                const isSelected = channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => selectChannel(ch.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                        : "border-border/70 bg-card/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSelected ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground/40"
                      }`}
                    />
                    {ch.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Select one or multiple delivery endpoints for broadcast.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-border/60 flex-row items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            disabled={sending}
            onClick={() => onOpenChange(false)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-4 text-xs font-semibold hover:bg-secondary hover:text-foreground disabled:opacity-40 transition cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary px-5 text-xs font-bold text-white shadow-md shadow-primary/25 transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {sending ? "Sending..." : "Send Notification"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
