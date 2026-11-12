import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

export type NewProducer = {
  company: string;
  contact: string;
  email: string;
  phone: string;
  status: string;
  revenueShare: number;
  website: string;
  gst: string;
  address: string;
  country: string;
  state: string;
  city: string;
  description: string;
};

const inputCls = (hasError = false) =>
  `h-10 w-full rounded-lg border bg-card px-3 text-sm placeholder:text-muted-foreground/70 transition focus:outline-none focus:ring-2 ${
    hasError
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "border-border focus:border-primary/40 focus:ring-primary/20"
  }`;

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
    <label className="block text-xs font-medium text-muted-foreground">{label}</label>
    {children}
    {error && <p className="text-[11px] font-medium text-destructive mt-1">{error}</p>}
  </div>
);

export function AddProducerDialog({
  open,
  onOpenChange,
  onCreate,
  initialData,
  isEdit = false,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreate: (p: NewProducer) => Promise<void>;
  initialData?: any;
  isEdit?: boolean;
}) {
  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    website: "",
    gst: "",
    address: "",
    country: "India",
    state: "",
    city: "",
    description: "",
    revenueShare: "70",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const upd = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));

    // Remove field error as user types
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!open) return;

    // Reset errors when opened
    setErrors({});
    setSubmitting(false);

    if (initialData) {
      console.log("EDIT FORM DATA:", initialData);

      setForm({
        company: initialData.companyName ?? initialData.company ?? "",
        contact:
          initialData.fullName ??
          initialData.contactPersonName ??
          `${initialData.firstName ?? ""} ${initialData.lastName ?? ""}`.trim(),
        email: initialData.email ?? "",
        phone: initialData.mobile ?? initialData.phoneNumber ?? "",
        website: initialData.website ?? initialData.websiteUrl ?? initialData.websiteURL ?? "",
        gst: initialData.gst ?? initialData.gstNumber ?? "",
        address: initialData.address ?? initialData.addressLine1 ?? "",
        country: initialData.country ?? initialData.countryName ?? "India",
        state: initialData.state ?? initialData.stateName ?? "",
        city: initialData.city ?? initialData.cityName ?? "",
        description:
          initialData.description ??
          initialData.companyDescription ??
          initialData.descriptionText ??
          "",
        revenueShare: String(initialData.revenueSharePercentage ?? initialData.revenueShare ?? 70),
      });
    } else {
      setForm({
        company: "",
        contact: "",
        email: "",
        phone: "",
        website: "",
        gst: "",
        address: "",
        country: "India",
        state: "",
        city: "",
        description: "",
        revenueShare: "70",
      });
    }
  }, [initialData, open]);

  const submit = async (status: string) => {
    const newErrors: Record<string, string> = {};

    // 1. Company Name validation
    if (!form.company.trim()) {
      newErrors.company = "Company Name is required";
    }

    // 2. Contact Name validation
    if (!form.contact.trim()) {
      newErrors.contact = "Producer / Contact Name is required";
    }

    // 3. Email validation (allows changing to another email, strictly validates format)
    const emailVal = form.email.trim();
    if (!emailVal) {
      newErrors.email = "Email address is required";
    } else if (/\s/.test(emailVal)) {
      newErrors.email = "Email must not contain spaces";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      newErrors.email = "Please enter a valid email address (e.g. name@domain.com)";
    }

    // 4. Phone validation (must be 10 digits)
    const phoneDigits = form.phone.trim().replace(/\D/g, "");
    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (phoneDigits.length !== 10) {
      newErrors.phone = "Phone number must be a valid 10-digit number";
    }

    // If client errors exist, highlight fields with inline messages and DO NOT CLOSE DIALOG
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onCreate({
        company: form.company,
        contact: form.contact,
        email: form.email.trim(),
        phone: phoneDigits,
        status,
        revenueShare: Number(form.revenueShare),
        website: form.website,
        gst: form.gst,
        address: form.address,
        country: form.country,
        state: form.state,
        city: form.city,
        description: form.description,
      });

      // Close modal only on successful completion
      onOpenChange(false);
    } catch (error: any) {
      console.error("Producer submission error in dialog:", error);

      const backendData = error?.response?.data?.data || error?.data?.data;
      const errorMsg =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        (isEdit ? "Failed to update producer" : "Failed to create producer");

      const serverErrors: Record<string, string> = {};

      if (backendData && typeof backendData === "object") {
        Object.entries(backendData).forEach(([field, msg]) => {
          if (typeof msg === "string") {
            serverErrors[field] = msg;
          }
        });
      }

      const lower = errorMsg.toLowerCase();
      if (lower.includes("email")) {
        serverErrors.email = errorMsg.includes("exists")
          ? "This email is already registered to another account"
          : errorMsg;
      } else if (lower.includes("mobile") || lower.includes("phone")) {
        serverErrors.phone = errorMsg.includes("exists")
          ? "This phone number is already registered"
          : errorMsg;
      }

      if (Object.keys(serverErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      } else if (errorMsg && !errorMsg.toLowerCase().includes("not found")) {
        toast.error(errorMsg);
      }

      // DO NOT close dialog on error!
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Briefcase className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Producer" : "Onboard New Producer"}
          </DialogTitle>

          <DialogDescription>
            {isEdit
              ? "Update producer details, contact email, and studio profile."
              : "Register a content studio with KYC, contracts and revenue terms."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="company" className="mt-2">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="company">Company Details</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* COMPANY NAME */}
            <Field label="Company Name *" error={errors.company}>
              <input
                className={inputCls(!!errors.company)}
                value={form.company}
                onChange={(e) => upd("company", e.target.value)}
                placeholder="Phantom Films Pvt Ltd"
              />
            </Field>

            {/* CONTACT PERSON */}
            <Field label="Producer / Contact Name *" error={errors.contact}>
              <input
                className={inputCls(!!errors.contact)}
                value={form.contact}
                onChange={(e) => upd("contact", e.target.value)}
                placeholder="Anurag Kashyap"
              />
            </Field>

            {/* EMAIL */}
            <Field label="Email Address *" error={errors.email}>
              <input
                className={inputCls(!!errors.email)}
                type="email"
                value={form.email}
                onChange={(e) => upd("email", e.target.value)}
                placeholder="producer@studio.com"
                autoComplete="email"
              />
            </Field>

            {/* PHONE */}
            <Field label="Phone Number (10 digits) *" error={errors.phone}>
              <input
                className={inputCls(!!errors.phone)}
                value={form.phone}
                maxLength={10}
                onChange={(e) => upd("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
              />
            </Field>

            {/* WEBSITE */}
            <Field label="Website URL">
              <input
                className={inputCls()}
                value={form.website}
                onChange={(e) => upd("website", e.target.value)}
                placeholder="https://studio.com"
              />
            </Field>

            {/* COUNTRY */}
            <Field label="Country">
              <select
                className={inputCls()}
                value={form.country}
                onChange={(e) => upd("country", e.target.value)}
              >
                {["India", "UAE", "USA", "UK", "Singapore", "Canada", "Australia"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>

            {/* STATE */}
            <Field label="State">
              <input
                className={inputCls()}
                value={form.state}
                onChange={(e) => upd("state", e.target.value)}
                placeholder="Maharashtra"
              />
            </Field>

            {/* CITY */}
            <Field label="City">
              <input
                className={inputCls()}
                value={form.city}
                onChange={(e) => upd("city", e.target.value)}
                placeholder="Mumbai"
              />
            </Field>

            {/* REVENUE SHARE */}
            <Field label="Revenue Share (%)">
              <input
                type="number"
                min="0"
                max="100"
                className={inputCls()}
                value={form.revenueShare}
                onChange={(e) => upd("revenueShare", e.target.value)}
                placeholder="70"
              />
            </Field>

            {/* GST */}
            <Field label="GST / Tax ID">
              <input
                className={inputCls()}
                value={form.gst}
                onChange={(e) => upd("gst", e.target.value)}
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>

            {/* ADDRESS */}
            <div className="sm:col-span-2">
              <Field label="Address">
                <input
                  className={inputCls()}
                  value={form.address}
                  onChange={(e) => upd("address", e.target.value)}
                  placeholder="Studio 4, Andheri West"
                />
              </Field>
            </div>

            {/* DESCRIPTION */}
            <div className="sm:col-span-2">
              <Field label="Company Description">
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-card p-3 text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.description}
                  onChange={(e) => upd("description", e.target.value)}
                  placeholder="Premier production house specializing in feature films and streaming originals."
                />
              </Field>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex-row items-center justify-end gap-2 border-t border-border pt-4">
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
            onClick={() => submit("Approved")}
            className="h-10 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Saving…" : isEdit ? "Update Producer" : "Approve & Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
