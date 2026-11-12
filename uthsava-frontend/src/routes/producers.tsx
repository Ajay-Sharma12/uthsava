import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuickAction } from "@/hooks/use-quick-action";
import { QA } from "@/lib/quick-actions";
import { DataTable, Column, RowAction } from "@/components/admin/DataTable";
import { PageHeader, StatusPill } from "@/components/admin/Primitives";

import {
  getProducers,
  getProducerDetail,
  createProducer,
  updateProducer,
  deleteProducer,
  updateProducerStatus,
} from "@/lib/services/producers";

import { BadgeCheck, Eye, Pencil, Trash2, Plus } from "lucide-react";
import { AddProducerDialog, NewProducer } from "@/components/admin/AddProducerDialog";
import { ViewSheet } from "@/components/admin/ViewSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/producers")({
  head: () => ({ meta: [{ title: "Producer Management — Uthsava Admin" }] }),
  component: ProducersPage,
});

type P = any;

function ProducersPage() {
  const [rows, setRows] = useState<P[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    // Show skeleton immediately
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response: any = await getProducers(search);

        if (mounted) {
          setRows(response.results.data);
        }
      } catch (error) {
        console.error("Failed to fetch producers:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [search]);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<any>(null);
  const [editingProducer, setEditingProducer] = useState<any>(null);
  useQuickAction(QA.ADD_PRODUCER, () => {
    setEditingProducer(null);
    setOpen(true);
  });

  const handleStatusToggle = async (producer: P) => {
    const currentStatus = producer.status?.toLowerCase();

    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      await updateProducerStatus(producer._id, newStatus);

      setRows((prev) =>
        prev.map((item) =>
          item._id === producer._id
            ? {
                ...item,
                status: newStatus,
              }
            : item,
        ),
      );

      toast.success(
        newStatus === "active"
          ? "Producer activated successfully"
          : "Producer deactivated successfully",
      );
    } catch (error: any) {
      console.error("Failed to update producer status:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.data?.message ||
          error?.message ||
          "Failed to update producer status",
      );
    }
  };
  const cols: Column<P>[] = [
    {
      key: "company",
      header: "Company",
      accessor: (r) => `${r.fullName ?? ""} - ${r.email ?? ""}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-accent/30 to-primary/30 text-xs font-semibold uppercase">
            {(r.fullName ?? "")
              .split(" ")
              .map((s: string) => s[0])
              .slice(0, 2)
              .join("")}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {r.fullName}
              {r.verified && <BadgeCheck className="h-3.5 w-3.5 text-info" />}
            </div>

            <div className="text-[11px] text-muted-foreground">{r.email}</div>
          </div>
        </div>
      ),
    },

    {
      key: "firstName",
      header: "Contact",
      accessor: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
      render: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
    },

    {
      key: "mobile",
      header: "Phone",
      accessor: (r) => r.mobile ?? "",
    },

    {
      key: "contentCount",
      header: "Uploads",
      accessor: (r) => r.contentCount ?? 0,
    },

    {
      key: "revenue",
      header: "Revenue",
      accessor: () => "₹0",
      render: () => "₹0",
    },

    {
      key: "createdAt",
      header: "Joined",
      accessor: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : ""),
      render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : ""),
    },

    {
      key: "status",
      header: "Status",
      accessor: (r) => {
        const status = r.status?.toLowerCase();
        return status === "active" ? "Active" : "Inactive";
      },
      render: (r) => {
        const status = r.status?.toLowerCase() === "active" ? "active" : "inactive";

        return (
          <button
            type="button"
            title={`Click to mark as ${status === "active" ? "INACTIVE" : "ACTIVE"}`}
            onClick={(e) => {
              e.stopPropagation();
              handleStatusToggle(r);
            }}
            className="group cursor-pointer transition hover:opacity-80 active:scale-95"
          >
            <StatusPill status={status} />
          </button>
        );
      },
    },
  ];

  const actions: RowAction<P>[] = [
    {
      label: "View",
      icon: Eye,
      onClick: async (r) => {
        try {
          const response: any = await getProducerDetail(r._id);
          setView(response.results);
        } catch (error) {
          console.log(error);
          toast.error("Failed to load producer");
        }
      },
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: async (r) => {
        try {
          const response: any = await getProducerDetail(r._id);

          const producer = response?.results?.producer;
          const profile = response?.results?.profile;

          if (!producer) {
            console.error("Producer details not found:", response);
            toast.error("Producer details not found");
            return;
          }

          setEditingProducer({
            ...(profile ?? {}),
            ...producer,
            _id: r._id || producer?._id,
            id: r._id || producer?._id,
            companyName: profile?.companyName || producer?.companyName || "",
            company: profile?.companyName || producer?.companyName || "",
          });

          setOpen(true);
        } catch (error) {
          console.error("Failed to load producer details:", error);
          toast.error("Failed to load producer details");
        }
      },
    },

    {
      label: "Delete",
      icon: Trash2,
      destructive: true,
      onClick: async (r) => {
        try {
          await deleteProducer(r._id);

          const response: any = await getProducers(search);
          setRows(response.results.data);

          toast.success("Producer deleted");
        } catch (error: any) {
          // catch (error) {
          //   toast.error("Failed to delete producer");
          // }
          console.log(error);
          console.log(error.response);
          console.log(error.response?.data);

          toast.error(error.data?.message || error.message || "Failed to delete producer");
        }
      },
    },
  ];

  const handleCreate = async (p: NewProducer) => {
    try {
      const names = p.contact.trim().split(/\s+/);

      const cleanEmail = p.email
        .trim()
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .replace(/\(mailto\\?:.*\)$/i, "")
        .trim();

      const payload = {
        companyName: p.company.trim(),

        website: p.website?.trim() || null,
        description: p.description?.trim() || null,
        gstNumber: p.gst?.trim() || null,
        country: p.country?.trim() || null,
        state: p.state?.trim() || null,
        city: p.city?.trim() || null,
        address: p.address?.trim() || null,

        contactPersonName: p.contact.trim(),
        email: cleanEmail,
        phoneNumber: p.phone.trim(),
        mobile: p.phone.trim(),
        countryCode: 91,

        firstName: names[0] || "",
        lastName: names.slice(1).join(" "),
        fullName: p.contact.trim(),

        password: (p as any).password?.trim() || "Producer@12345",
        revenueSharePercentage: Number(p.revenueShare) || 70,
        status: "active",
      };

      console.log("CREATE PRODUCER PAYLOAD:", payload);

      const response: any = await createProducer(payload);

      console.log("CREATE PRODUCER RESPONSE:", response);

      const producersResponse: any = await getProducers(search);
      setRows(producersResponse.results.data);

      toast.success("Producer created successfully");

      setOpen(false);
      setEditingProducer(null);
    } catch (error: any) {
      console.error("CREATE PRODUCER ERROR:", error);
      console.error("ERROR DATA:", error?.data);
      console.error("ERROR RESPONSE:", error?.response?.data);

      const errorMsg =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to create producer";

      toast.error(errorMsg);
      throw error;
    }
  };

  const handleUpdate = async (p: NewProducer) => {
    try {
      const names = p.contact.trim().split(/\s+/);

      const cleanEmail = p.email
        .trim()
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .replace(/\(mailto\\?:.*\)$/i, "")
        .trim();

      const updateData: any = {
        // User fields
        firstName: names[0] || "",
        lastName: names.slice(1).join(" "),
        fullName: p.contact.trim(),
        email: cleanEmail,
        mobile: p.phone.trim(),

        // Producer profile fields
        companyName: p.company.trim(),
        website: p.website?.trim() || null,
        description: p.description?.trim() || null,
        gstNumber: p.gst?.trim() || null,
        country: p.country?.trim() || null,
        state: p.state?.trim() || null,
        city: p.city?.trim() || null,
        address: p.address?.trim() || null,
      };

      const producerId =
        editingProducer?._id || editingProducer?.id || editingProducer?.userId;

      if (!producerId) {
        throw new Error("Producer ID is missing");
      }

      await updateProducer(producerId, updateData);

      const response: any = await getProducers(search);
      setRows(response.results.data);

      toast.success("Producer updated successfully");

      setEditingProducer(null);
      setOpen(false);
    } catch (error: any) {
      console.error("UPDATE PRODUCER ERROR:", error);
      throw error;
    }
  };
  // return (
  //   <>
  //     <PageHeader title="Producer Management" description="Onboard and manage content producers, contracts and payouts." />
  //     <DataTable
  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Producer Management</h1>

          <p className="text-sm text-muted-foreground">
            Onboard and manage content producers, contracts and payouts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProducer(null);
            setOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Add Producer
        </button>
      </div>

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        exportFileName="producers"
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: "Status",
            options: ["Active", "Inactive"],
            getValue: (r) => (r.status?.toLowerCase() === "active" ? "Active" : "Inactive"),
          },
          {
            label: "Verification",
            options: ["Verified", "Not Verified"],
            getValue: (r) =>
              r.isEmailVerified || r.isMobileVerified ? "Verified" : "Not Verified",
          },
        ]}
        rowActions={actions}
        onRowClick={async (r) => {
          try {
            const response: any = await getProducerDetail(r._id);
            setView(response.results);
          } catch (error) {
            console.error("Failed to load producer details:", error);
            toast.error("Failed to load producer details");
          }
        }}
        emptyState={{
          title: "No producers onboarded",
          description: "Bring studios on the platform to start ingesting content.",
          ctaLabel: "Add Producer",
          onCta: () => {
            setEditingProducer(null);
            setOpen(true);
          },
        }}
      />
      <AddProducerDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);

          if (!v) {
            setEditingProducer(null);
          }
        }}
        onCreate={editingProducer ? handleUpdate : handleCreate}
        initialData={editingProducer}
        isEdit={!!editingProducer}
      />

      <ViewSheet
        open={!!view}
        onOpenChange={(o) => !o && setView(null)}
        title={view?.profile?.companyName ?? view?.producer?.companyName ?? ""}
        subtitle={view?.producer?.email}
        status={view?.producer?.status}
        hero={
          view ? (
            <div className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-accent/15 to-primary/10 p-4">
              <div className="grid h-14 w-14 place-items-center rounded-md bg-card text-base font-semibold uppercase">
                {view.producer.fullName
                  ?.split(" ")
                  .map((s: string) => s[0])
                  .slice(0, 2)
                  .join("")}
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {view.profile?.companyName ?? view.producer?.companyName ?? "—"}
                </div>

                <div className="text-xs text-muted-foreground">
                  Onboarded {new Date(view.producer.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : null
        }
        sections={
          view
            ? [
                {
                  title: "Producer Details",
                  rows: [
                    {
                      label: "Company",
                      value: view.profile?.companyName ?? view.producer?.companyName ?? "—",
                    },
                    {
                      label: "Website",
                      value: view.profile?.website,
                    },
                    {
                      label: "Description",
                      value: view.profile?.description,
                    },
                    // {
                    //   label: "GST Number",
                    //   value: view.profile?.gstNumber,
                    // },
                    {
                      label: "Country",
                      value: view.profile?.country,
                    },
                    {
                      label: "State",
                      value: view.profile?.state,
                    },
                    {
                      label: "City",
                      value: view.profile?.city,
                    },
                    {
                      label: "Address",
                      value: view.profile?.address,
                    },
                    {
                      label: "Primary Contact",
                      value: view.producer?.fullName,
                    },
                    {
                      label: "Email",
                      value: view.producer?.email,
                    },
                    {
                      label: "Phone",
                      value: view.producer?.mobile,
                    },
                    {
                      label: "Status",
                      value: view.producer?.status,
                    },
                    {
                      label: "Email Verified",
                      value: view.producer?.isEmailVerified ? "Yes" : "No",
                    },
                    {
                      label: "Mobile Verified",
                      value: view.producer?.isMobileVerified ? "Yes" : "No",
                    },
                  ],
                },
                {
                  title: "Uploaded Content",
                  rows: [
                    {
                      label: "Total Uploads",
                      value: view.totalUploadedContent,
                    },
                  ],
                },
                {
                  title: "Revenue",
                  rows: [
                    {
                      label: "Total Earnings",
                      value: `₹${view.totalEarnings.toLocaleString()}`,
                    },
                  ],
                },
                {
                  title: "Account",
                  rows: [
                    // {
                    //   label: "Created At",
                    //   value: new Date(
                    //     view.producer.createdAt
                    //   ).toLocaleString(),
                    // },
                    {
                      label: "Created At",
                      value: new Date(view.producer.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        // second: "2-digit",
                        hour12: true,
                      }),
                    },
                    // {
                    //   label: "Updated At",
                    //   value: new Date(
                    //     view.producer.updatedAt
                    //   ).toLocaleString(),
                    // },
                    {
                      label: "Updated At",
                      value: new Date(view.producer.updatedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        // second: "2-digit",
                        hour12: true,
                      }),
                    },
                  ],
                },
              ]
            : []
        }
        actions={[
          // {
          //   label: "Process Payout",
          //   variant: "primary",
          //   onClick: () => toast.success("Payout queued"),
          // },

          {
            label: "Edit",
            onClick: async () => {
              try {
                if (!view?.producer?._id) {
                  toast.error("Producer ID not found");
                  return;
                }

                const response: any = await getProducerDetail(view.producer._id);

                const producer = response?.results?.producer;
                const profile = response?.results?.profile;

                if (!producer) {
                  toast.error("Producer details not found");
                  return;
                }

                const editData = {
                  ...producer,
                  ...(profile ?? {}),
                };

                console.log("VIEW EDIT PRODUCER:", editData);

                setEditingProducer(editData);
                setView(null);
                setOpen(true);
              } catch (error) {
                console.error("Failed to load producer for edit:", error);
                toast.error("Failed to load producer details");
              }
            },
          },

          {
            label: view?.producer?.status?.toLowerCase() === "inactive" ? "Activate" : "Suspend",
            variant:
              view?.producer?.status?.toLowerCase() === "inactive" ? "primary" : "destructive",

            onClick: async () => {
              if (!view?.producer?._id) {
                toast.error("Producer ID not found");
                return;
              }

              const currentStatus = view.producer.status?.toLowerCase();

              const newStatus = currentStatus === "active" ? "inactive" : "active";

              try {
                await updateProducerStatus(view.producer._id, newStatus);

                // Update the table row
                setRows((prev) =>
                  prev.map((item) =>
                    item._id === view.producer._id
                      ? {
                          ...item,
                          status: newStatus,
                        }
                      : item,
                  ),
                );

                // Update the open ViewSheet
                setView((prev: any) =>
                  prev
                    ? {
                        ...prev,
                        producer: {
                          ...prev.producer,
                          status: newStatus,
                        },
                      }
                    : prev,
                );

                toast.success(
                  newStatus === "inactive"
                    ? "Producer suspended successfully"
                    : "Producer activated successfully",
                );
              } catch (error: any) {
                console.error("Failed to update producer status:", error);
                console.error("Status error data:", error?.data);

                toast.error(
                  error?.data?.message || error?.message || "Failed to update producer status",
                );
              }
            },
          },
        ]}
      />
    </>
  );
}
