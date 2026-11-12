// import { createFileRoute } from "@tanstack/react-router";
// import { PageHeader, Surface } from "@/components/admin/Primitives";
// import { useState, useEffect } from "react";
// import {
//   fetchPlatformSettings,
//   updatePlatformSettings,
//   fetchRevenueBrackets,
// } from "@/lib/services/settings";
// import { Settings as SettingsIcon, CreditCard, PlayCircle, Lock } from "lucide-react";
// import { cn } from "@/lib/utils";

// export const Route = createFileRoute("/settings")({
//   head: () => ({ meta: [{ title: "Platform Settings — Uthsava Admin" }] }),
//   component: SettingsPage,
// });

// const TABS = [
//   { id: "general", label: "General", icon: SettingsIcon },
//   { id: "payment", label: "Payments", icon: CreditCard },
//   { id: "stream", label: "Streaming", icon: PlayCircle },
//   { id: "security", label: "Security", icon: Lock },
// ];

// function SettingsPage() {
//   const [tab, setTab] = useState("general");
//   const [settings, setSettings] = useState<any>(null);
// const [loading, setLoading] = useState(false);


// const loadSettings = async () => {
//   try {
//     setLoading(true);

//     const res = await fetchPlatformSettings();
// console.log(JSON.stringify(res.results, null, 2));

//     setSettings(res.results);
//   } catch (error) {
//     console.error(error);
//   } finally {
//     setLoading(false);
//   }
// };
// useEffect(() => {
//   loadSettings();
// }, []);
//   return (
//     <>
//       <PageHeader title="Platform Settings" description="Branding, payments, streaming and security." />
//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
//         <Surface className="p-2">
//           {TABS.map((t) => {
//             const I = t.icon;
//             return (
//               <button key={t.id} onClick={() => setTab(t.id)}
//                 className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition",
//                   tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
//                 <I className="h-4 w-4" /> {t.label}
//               </button>
//             );
//           })}
//         </Surface>

//         <Surface className="p-6">
//           {tab === "general" && (
//             <SettingGroup title="General settings" description="Platform identity and contact info.">
// <Row k="Email" v={settings?.email || "-"} />

// <Row k="Phone" v={settings?.phone || "-"} />

// <Row k="Instagram" v={settings?.instagram || "-"} />

// <Row k="Facebook" v={settings?.facebook || "-"} />

// <Row k="LinkedIn" v={settings?.linkedin || "-"} />

// <Row k="App Store" v={settings?.appStore || "-"} />

// <Row k="Google Play Store" v={settings?.googlePlayStore || "-"} />
//             </SettingGroup>
//           )}
//           {tab === "payment" && (
//   <SettingGroup
//     title="Payment Settings"
//     description="Subscription discounts and payout configuration."
//   >
//     <Row
//       k="Yearly Subscription Discount"
//       v={`${settings?.yearlySubscriptionDiscount ?? 0}%`}
//     />

//     <Row
//       k="Payout Frequency"
//       v={`${settings?.payoutFrequencyDays ?? 0} days`}
//     />
//   </SettingGroup>
// )}
//          {tab === "stream" && (
//   <SettingGroup
//     title="Streaming settings"
//     description="CDN, quality and DRM."
//   >
//     <Row k="Video CDN" v="CloudFront + Akamai (multi-region)" />

//     <Row k="Default Quality" v="Auto · up to 4K HDR" />

//     <Row k="Buffer Settings" v="6s pre-buffer, 18s rolling" />

//     <Row k="DRM" v="Widevine + FairPlay enabled" positive />

//     <Row
//       k="Free Preview Enabled"
//       v={settings?.freePreviewEnabled ? "Enabled" : "Disabled"}
//       positive={settings?.freePreviewEnabled}
//     />

//     <Row
//       k="Default Free Preview"
//       v={`${settings?.freePreviewDurationMinutes || 0} minutes`}
//     />
//   </SettingGroup>
// )}
//           {tab === "security" && (
//             <SettingGroup title="Security settings" description="Account hardening and access policies.">
//               <Row k="Two-Factor Authentication" v="Required for all admins" positive />
//               <Row k="Session Timeout" v="30 minutes" />
//               <Row k="IP Restrictions" v="Office VPN only" />
//               <Row k="Password Policy" v="14+ chars · rotated 90 days" />
//             </SettingGroup>
//           )}
//         </Surface>
//       </div>
//     </>
//   );
// }

// function SettingGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
//   return (
//     <div>
//       <h3 className="text-base font-semibold">{title}</h3>
//       <p className="text-xs text-muted-foreground">{description}</p>
//       <div className="mt-5 space-y-1">{children}</div>
//     </div>
//   );
// }

// function Row({ k, v, positive }: { k: string; v: string; positive?: boolean }) {
//   return (
//     <div className="flex items-center justify-between border-b border-border/60 py-3.5 last:border-0">
//       <div className="text-sm">{k}</div>
//       <div className={cn("text-sm", positive ? "text-success" : "text-muted-foreground")}>{v}</div>
//     </div>
//   );
// }

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface } from "@/components/admin/Primitives";
import { useState, useEffect } from "react";
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  fetchRevenueBrackets,
} from "@/lib/services/settings";
import { Settings as SettingsIcon, CreditCard, PlayCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Platform Settings — Uthsava Admin" }] }),
  component: SettingsPage,
});

const TABS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "payment", label: "Payments", icon: CreditCard },
  { id: "stream", label: "Streaming", icon: PlayCircle },
  { id: "security", label: "Security", icon: Lock },
];

// Define proper types based on your API response
interface PlatformSettings {
  _id: string;
  freePreviewEnabled: boolean;
  freePreviewDuration: number;
  revenueBrackets: any[];
  payoutFrequencyDays: number;
  yearlySubscriptionDiscount: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
  // Additional fields that might be added later
  email?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  linkedIn?: string;
  appStore?: string;
  googlePlayStore?: string;
}

function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchPlatformSettings();
      console.log(JSON.stringify(res.results, null, 2));
      setSettings(res.results);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await updatePlatformSettings(settings);
      toast.success("Settings updated successfully");
      await loadSettings(); // Reload to get updated data
    } catch (error) {
      console.error(error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Platform Settings" description="Branding, payments, streaming and security." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Platform Settings" 
        description="Branding, payments, streaming and security."
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        }
      />
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <Surface className="p-2">
          {TABS.map((t) => {
            const I = t.icon;
            return (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition",
                  tab === t.id 
                    ? "bg-primary/15 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <I className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </Surface>

        <Surface className="p-6">
          {tab === "general" && (
            <SettingGroup 
              title="General settings" 
              description="Platform identity and contact info."
            >
              <Row 
                k="Email" 
                v={settings?.email || "-"} 
                editable 
                onSave={(val) => setSettings(prev => ({ ...prev!, email: val }))}
              />
              <Row 
                k="Phone" 
                v={settings?.phone || "-"} 
                editable
                onSave={(val) => setSettings(prev => ({ ...prev!, phone: val }))}
              />
              <Row 
                k="Instagram" 
                v={settings?.instagram || "-"} 
                editable
                onSave={(val) => setSettings(prev => ({ ...prev!, instagram: val }))}
              />
              <Row 
                k="Facebook" 
                v={settings?.facebook || "-"} 
                editable
                onSave={(val) => setSettings(prev => ({ ...prev!, facebook: val }))}
              />
              <Row 
                k="LinkedIn" 
                v={settings?.linkedIn || "-"} 
                editable
                onSave={(val) => setSettings(prev => ({ ...prev!, linkedIn: val }))}
              />
              <Row 
                k="App Store" 
                v={settings?.appStore || "-"} 
                editable
                onSave={(val) => setSettings(prev => ({ ...prev!, appStore: val }))}
              />
              <Row 
                k="Google Play Store" 
                v={settings?.googlePlayStore || "-"} 
                editable
                onSave={(val) => setSettings(prev => ({ ...prev!, googlePlayStore: val }))}
              />
            </SettingGroup>
          )}
          
          {tab === "payment" && (
            <SettingGroup
              title="Payment Settings"
              description="Subscription discounts and payout configuration."
            >
              <Row
                k="Yearly Subscription Discount"
                v={`${settings?.yearlySubscriptionDiscount ?? 0}%`}
                editable
                type="number"
                onSave={(val) => setSettings(prev => ({ 
                  ...prev!, 
                  yearlySubscriptionDiscount: parseInt(val) || 0 
                }))}
              />
              <Row
                k="Payout Frequency"
                v={`${settings?.payoutFrequencyDays ?? 0} days`}
                editable
                type="number"
                onSave={(val) => setSettings(prev => ({ 
                  ...prev!, 
                  payoutFrequencyDays: parseInt(val) || 0 
                }))}
              />
              <Row
                k="Revenue Brackets"
                v={`${settings?.revenueBrackets?.length || 0} brackets configured`}
              />
            </SettingGroup>
          )}
          
          {tab === "stream" && (
            <SettingGroup
              title="Streaming settings"
              description="CDN, quality and DRM."
            >
              <Row k="Video CDN" v="CloudFront + Akamai (multi-region)" />
              <Row k="Default Quality" v="Auto · up to 4K HDR" />
              <Row k="Buffer Settings" v="6s pre-buffer, 18s rolling" />
              <Row k="DRM" v="Widevine + FairPlay enabled" positive />
              <Row
                k="Free Preview Enabled"
                v={settings?.freePreviewEnabled ? "Enabled" : "Disabled"}
                positive={settings?.freePreviewEnabled}
                editable
                type="boolean"
                onSave={(val) => setSettings(prev => ({ 
                  ...prev!, 
                  freePreviewEnabled: val === 'true' 
                }))}
              />
              <Row
                k="Free Preview Duration"
                v={`${settings?.freePreviewDuration ?? 0} minutes`}
                editable
                type="number"
                onSave={(val) => setSettings(prev => ({ 
                  ...prev!, 
                  freePreviewDuration: parseInt(val) || 0 
                }))}
              />
            </SettingGroup>
          )}
          
          {tab === "security" && (
            <SettingGroup 
              title="Security settings" 
              description="Account hardening and access policies."
            >
              <Row k="Two-Factor Authentication" v="Required for all admins" positive />
              <Row k="Session Timeout" v="30 minutes" />
              <Row k="IP Restrictions" v="Office VPN only" />
              <Row k="Password Policy" v="14+ chars · rotated 90 days" />
            </SettingGroup>
          )}
        </Surface>
      </div>
    </>
  );
}

function SettingGroup({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description: string; 
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-1">{children}</div>
    </div>
  );
}

function Row({ 
  k, 
  v, 
  positive, 
  editable, 
  type = "text",
  onSave 
}: { 
  k: string; 
  v: string; 
  positive?: boolean; 
  editable?: boolean;
  type?: "text" | "number" | "boolean";
  onSave?: (val: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(v);
  const [isHovered, setIsHovered] = useState(false);

  const handleSave = () => {
    if (onSave && value !== v) {
      onSave(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(v);
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    if (editable) {
      if (type === 'boolean') {
        // Toggle boolean
        const newVal = v === 'Enabled' ? 'Disabled' : 'Enabled';
        setValue(newVal);
        if (onSave) onSave(newVal);
      } else {
        setIsEditing(true);
      }
    }
  };

  return (
    <div 
      className="flex items-center justify-between border-b border-border/60 py-3.5 last:border-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-sm">{k}</div>
      <div className="flex items-center gap-2">
        {editable && isEditing && type !== 'boolean' ? (
          <input
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        ) : (
          <span 
            className={cn(
              "text-sm cursor-pointer",
              positive ? "text-success" : "text-muted-foreground",
              editable && isHovered && "hover:text-primary transition-colors"
            )}
            onClick={handleClick}
          >
            {v}
            {editable && isHovered && type !== 'boolean' && (
              <span className="ml-2 text-xs text-muted-foreground">(click to edit)</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
