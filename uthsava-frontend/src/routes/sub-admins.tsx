import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Column } from "@/components/admin/DataTable";
import { PageHeader, StatusPill } from "@/components/admin/Primitives";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  fetchSubAdmins,
  createSubAdmin,
  getSubAdminById,
  updateSubAdmin,
  updateSubAdminStatus,
  deleteSubAdmin,
} from "@/lib/services/sub-admins";
import { AddSubAdminDialog, type SubAdminFormData } from "@/components/admin/AddSubAdminDialog";
import { fetchRoles } from "@/lib/services/roles";
import { toast } from "sonner";

export const Route = createFileRoute("/sub-admins")({
  head: () => ({ meta: [{ title: "Sub-Admin Manager — Uthsava Admin" }] }),
  component: SubAdminsPage,
});

function SubAdminsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "view" | "edit">("create");

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [subAdmins, roleList] = await Promise.all([fetchSubAdmins(), fetchRoles()]);
      setRows(subAdmins || []);
      setRoles(roleList || []);
    } catch (err: any) {
      console.error("Failed to load sub-admins:", err);
      toast.error(err?.data?.message || err?.message || "Failed to load sub-admins");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleStatus = async (row: any) => {
    const currentStatus = (row.status || "active").toLowerCase();
    const newStatus: "active" | "inactive" = currentStatus === "active" ? "inactive" : "active";

    // Optimistic instant UI update without page reload
    setRows((prev) =>
      prev.map((r) => (r._id === row._id ? { ...r, status: newStatus } : r)),
    );

    try {
      await updateSubAdminStatus(row._id, newStatus);
      toast.success(`Sub-Admin marked as ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      // Revert on failure
      setRows((prev) =>
        prev.map((r) => (r._id === row._id ? { ...r, status: currentStatus } : r)),
      );
      toast.error(err?.data?.message || err?.message || "Failed to update sub-admin status");
    }
  };

  const handleCreateSubAdmin = async (payload: SubAdminFormData) => {
    try {
      await createSubAdmin(payload);
      toast.success("Sub-Admin created successfully");
      await loadData(false);
      setDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to create sub-admin:", err);
      toast.error(err?.data?.message || err?.message || "Failed to create sub-admin");
      throw err;
    }
  };

  const handleUpdateSubAdmin = async (id: string, payload: Partial<SubAdminFormData>) => {
    try {
      await updateSubAdmin(id, payload);
      toast.success("Sub-Admin updated successfully");
      await loadData(false);
      setDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to update sub-admin:", err);
      toast.error(err?.data?.message || err?.message || "Failed to update sub-admin");
      throw err;
    }
  };

  const handleView = (row: any) => {
    setSelectedSubAdmin(row);
    setDialogMode("view");
    setDialogOpen(true);
  };

  const handleEdit = (row: any) => {
    setSelectedSubAdmin(row);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDelete = async (row: any) => {
    try {
      await deleteSubAdmin(row._id);
      toast.success("Sub-Admin deleted successfully");
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (err: any) {
      console.error("Failed to delete sub-admin:", err);
      toast.error(err?.data?.message || err?.message || "Failed to delete sub-admin");
    }
  };

  // Filtered rows for client search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const name = (r.fullName || `${r.firstName || ""} ${r.lastName || ""}`).toLowerCase();
      const email = (r.email || "").toLowerCase();
      const role = (r.roleId?.name || r.role?.name || "").toLowerCase();
      const mobile = (r.mobile || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || mobile.includes(q);
    });
  }, [rows, search]);

  const cols: Column<any>[] = [
    {
      key: "name",
      header: "NAME",
      render: (r) => {
        const fullName = r.fullName || `${r.firstName || ""} ${r.lastName || ""}`.trim() || "Sub Admin";
        const initials = fullName
          .split(" ")
          .map((s: string) => s[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "SA";

        return (
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-200 to-rose-300 dark:from-rose-900/40 dark:to-rose-800/40 text-xs font-bold text-rose-800 dark:text-rose-200">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{fullName}</div>
              <div className="text-xs text-muted-foreground truncate">{r.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "ROLE",
      render: (r) => {
        const roleName = r.roleId?.name || r.role?.name || (typeof r.roleId === "string" ? r.roleId : null);
        return <span className="text-sm text-foreground">{roleName || "-"}</span>;
      },
    },
    {
      key: "lastLogin",
      header: "LAST LOGIN",
      render: (r) => {
        if (!r.lastLoginAt) return <span className="text-muted-foreground">-</span>;
        const date = new Date(r.lastLoginAt);
        return (
          <span className="text-xs text-muted-foreground font-mono">
            {date.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
            ,{" "}
            {date.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "STATUS",
      render: (r) => {
        const status = r.status || "active";
        return (
          <button
            type="button"
            title={`Click to mark as ${status === "active" ? "INACTIVE" : "ACTIVE"}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus(r);
            }}
            className="group cursor-pointer transition hover:opacity-80 active:scale-95"
          >
            <StatusPill status={status} />
          </button>
        );
      },
    },
  ];

  const exportColumns: Column<any>[] = [
    {
      key: "fullName",
      header: "Name",
      accessor: (r) => r.fullName || `${r.firstName || ""} ${r.lastName || ""}`.trim(),
    },
    { key: "email", header: "Email", accessor: (r) => r.email || "" },
    { key: "mobile", header: "Mobile", accessor: (r) => r.mobile ? `+${r.countryCode || 91} ${r.mobile}` : "" },
    {
      key: "role",
      header: "Role",
      accessor: (r) => r.roleId?.name || r.role?.name || "",
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => (r.status || "active").toUpperCase(),
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      accessor: (r) => (r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : "-"),
    },
    {
      key: "createdAt",
      header: "Created At",
      accessor: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"),
    },
  ];

  const roleOptions = useMemo(() => {
    return Array.from(new Set(roles.map((r) => r.name).filter(Boolean)));
  }, [roles]);

  return (
    <>
      <PageHeader
        title="Sub-Admin Manager"
        description="Internal admin accounts, roles and access."
      />

      <DataTable
        loading={loading}
        columns={cols}
        rows={filteredRows}
        searchValue={search}
        onSearchChange={setSearch}
        exportFileName="sub-admins"
        exportColumns={exportColumns}
        filters={[
          {
            label: "Role",
            options: roleOptions,
            getValue: (row) => row.roleId?.name || row.role?.name || "",
          },
          {
            label: "Status",
            options: ["ACTIVE", "INACTIVE"],
            getValue: (row) => (row.status || "ACTIVE").toUpperCase(),
          },
        ]}
        primaryAction={{
          label: "Add Sub-Admin",
          onClick: () => {
            setDialogMode("create");
            setSelectedSubAdmin(null);
            setDialogOpen(true);
          },
        }}
        rowActions={[
          {
            label: "View",
            icon: Eye,
            onClick: handleView,
          },
          {
            label: "Edit",
            icon: Pencil,
            onClick: handleEdit,
          },
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onClick: handleDelete,
          },
        ]}
      />

      <AddSubAdminDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedSubAdmin(null);
          }
        }}
        mode={dialogMode}
        subAdmin={selectedSubAdmin}
        roles={roles}
        onCreate={handleCreateSubAdmin}
        onUpdate={handleUpdateSubAdmin}
      />
    </>
  );
}
