import { createFileRoute } from "@tanstack/react-router";
import { useRef, useEffect, useState, useMemo } from "react";
import { PageHeader, Surface, StatusPill } from "@/components/admin/Primitives";
import {
  Send,
  Bell,
  Mail,
  MessageSquare,
  Loader2,
  Users,
  Clock,
  Search,
  X,
  Check,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Shield,
  Crown,
  UserCheck,
  Clapperboard,
  Filter,
  CheckCheck,
  Smartphone,
  ChevronRight,
  UserMinus,
  Copy,
  RotateCcw,
  AlertTriangle,
  Flame,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { CustomSelect } from "@/components/admin/CustomSelect";
import { useQuickAction } from "@/hooks/use-quick-action";
import { QA } from "@/lib/quick-actions";
import {
  fetchNotifications,
  sendNotification,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  fetchNotificationById,
} from "@/lib/services/notifications";
import { getUsersLookup } from "@/lib/services/users";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications & Campaigns — Uthsava Admin" }] }),
  component: NotificationsPage,
});

interface NotificationRecord {
  _id: string;
  title: string;
  message: string;
  category?: string;
  type?: string;
  channels: string[];
  recipientType: string;
  recipientUserIds?: string[];
  recipientRoleIds?: string[];
  status: "SENT" | "SCHEDULED" | "DRAFT" | "FAILED" | string;
  scheduledAt?: string | null;
  sentAt?: string;
  senderId?: string;
  dataId?: string | null;
  recipientCount?: number;
  successCount?: number;
  failureCount?: number;
  failureReason?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UserLookupItem {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  role?: string;
  profileImageUrl?: string;
}

type RecipientTargetType =
  | "ALL_USERS"
  | "SUBSCRIBED_USERS"
  | "FREE_USERS"
  | "ALL_PRODUCERS"
  | "ALL_SUBADMINS"
  | "SELECTED_USERS"
  | "SELECTED_PRODUCERS";

const NOTIFICATION_CATEGORIES = [
  { value: "NEW_MOVIE_RELEASED", label: "🎬 New Movie Released" },
  { value: "NEW_SERIES_RELEASED", label: "📺 New Series Released" },
  { value: "NEW_EPISODE_AVAILABLE", label: "▶️ New Episode Available" },
  { value: "PROMOTIONAL_OFFER", label: "🏷️ Promotional Offer / Discount" },
  { value: "SUBSCRIPTION_RENEWAL", label: "💳 Subscription Renewal" },
  { value: "SYSTEM_UPDATE", label: "⚙️ System & Maintenance Update" },
  { value: "ACCOUNT_SECURITY_ALERT", label: "🔒 Account Security Alert" },
  { value: "NEW_COUPON_AVAILABLE", label: "🎟️ New Coupon Available" },
  { value: "NEW_FEATURE_ANNOUNCEMENT", label: "✨ New Feature Announcement" },
];

const CHANNEL_OPTIONS = [
  {
    value: "PUSH",
    label: "Push Notification",
    icon: Bell,
    description: "Mobile App & In-App Notification Center",
  },
  {
    value: "EMAIL",
    label: "Email",
    icon: Mail,
    description: "Direct HTML email dispatch to users' inbox",
  },
  {
    value: "SMS",
    label: "SMS",
    icon: MessageSquare,
    description: "Instant SMS to user verified mobile number",
  },
];

const TARGET_AUDIENCE_OPTIONS: {
  value: RecipientTargetType;
  title: string;
  desc: string;
  icon: any;
  badge: string;
  color: string;
}[] = [
  {
    value: "ALL_USERS",
    title: "All Platform Users",
    desc: "Broadcast to every registered user and viewer",
    icon: Users,
    badge: "Broadcast",
    color: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-500",
  },
  {
    value: "SUBSCRIBED_USERS",
    title: "Active Subscribers",
    desc: "Target members currently with active paid plans",
    icon: Crown,
    badge: "VIP Premium",
    color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-500",
  },
  {
    value: "FREE_USERS",
    title: "Free / Non-Subscribed",
    desc: "Viewers without active plan (best for upgrade offers)",
    icon: UserMinus,
    badge: "Growth",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-500",
  },
  {
    value: "ALL_PRODUCERS",
    title: "All Producers",
    desc: "Broadcast to all verified content creators and studios",
    icon: Clapperboard,
    badge: "Creators",
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-500",
  },
  {
    value: "ALL_SUBADMINS",
    title: "Moderators & Sub-Admins",
    desc: "Internal staff, operations, and review team members",
    icon: Shield,
    badge: "Internal",
    color: "from-slate-500/20 to-neutral-500/10 border-slate-500/30 text-slate-400",
  },
  {
    value: "SELECTED_USERS",
    title: "Select Specific Users",
    desc: "Hand-pick individual viewers by name, email, or mobile",
    icon: Search,
    badge: "Custom Picker",
    color: "from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-500",
  },
  {
    value: "SELECTED_PRODUCERS",
    title: "Select Specific Producers",
    desc: "Hand-pick specific producers or studio partners",
    icon: UserCheck,
    badge: "Custom Studio",
    color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-500",
  },
];

const CAMPAIGN_PRESETS = [
  {
    label: "🎬 New Premiere",
    category: "NEW_MOVIE_RELEASED",
    title: "Now Streaming: New Blockbuster Premiere!",
    message: "Grab your popcorn! The latest blockbuster movie is now streaming in 4K HDR exclusively on Uthsava.",
  },
  {
    label: "🏷️ 20% Off Promo",
    category: "PROMOTIONAL_OFFER",
    title: "Special Weekend Offer: 20% Off All VIP Plans!",
    message: "Upgrade your entertainment experience this weekend. Use code WEEKEND20 to enjoy unlimited movies and shows.",
  },
  {
    label: "⚙️ System Maintenance",
    category: "SYSTEM_UPDATE",
    title: "Scheduled Maintenance Notice",
    message: "Uthsava will undergo brief scheduled maintenance on Sunday from 2:00 AM to 4:00 AM IST to improve streaming performance.",
  },
  {
    label: "💳 Plan Renewal",
    category: "SUBSCRIPTION_RENEWAL",
    title: "Don't Miss Out: Renew Your Uthsava VIP Plan",
    message: "Your subscription is expiring soon. Renew today to continue watching without any interruptions.",
  },
];

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 30);
  return now.toISOString().slice(0, 16);
};

function NotificationsPage() {
  const titleRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Selected Campaign Details Modal
  const [viewCampaign, setViewCampaign] = useState<NotificationRecord | null>(null);
  const [campaignDetailsLoading, setCampaignDetailsLoading] = useState(false);
  const [campaignRecipients, setCampaignRecipients] = useState<
    Array<{ _id: string; fullName: string; email: string; mobile?: string; role?: string }>
  >([]);

  // Load detailed campaign info when viewCampaign is clicked
  useEffect(() => {
    if (!viewCampaign?._id) {
      setCampaignRecipients([]);
      return;
    }

    let isMounted = true;
    const loadDetails = async () => {
      try {
        setCampaignDetailsLoading(true);
        const res: any = await fetchNotificationById(viewCampaign._id);
        if (isMounted && res?.data) {
          if (res.data.notification) {
            setViewCampaign((prev) => (prev ? { ...prev, ...res.data.notification } : prev));
          }
          if (Array.isArray(res.data.recipientUsers)) {
            setCampaignRecipients(res.data.recipientUsers);
          }
        }
      } catch (err) {
        console.error("Failed to load notification details:", err);
      } finally {
        if (isMounted) setCampaignDetailsLoading(false);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [viewCampaign?._id]);

  // Clone/Duplicate campaign into Composer
  const handleDuplicateCampaign = (c: NotificationRecord) => {
    setForm({
      title: c.title || "",
      message: c.message || "",
      category: c.category || c.type || "NEW_MOVIE_RELEASED",
      channels: c.channels?.length ? c.channels : ["PUSH", "EMAIL"],
      recipientType: (c.recipientType as RecipientTargetType) || "ALL_USERS",
      recipientUserIds: c.recipientUserIds || [],
      scheduledAt: getCurrentDateTimeLocal(),
    });
    setViewCampaign(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Campaign copied to composer! You can edit and send now.");
  };

  // Form State
  const [isScheduled, setIsScheduled] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    category: "NEW_MOVIE_RELEASED",
    channels: ["PUSH", "EMAIL"],
    recipientType: "ALL_USERS" as RecipientTargetType,
    recipientUserIds: [] as string[],
    scheduledAt: getCurrentDateTimeLocal(),
  });

  // User & Producer Picker State
  const [allLookupUsers, setAllLookupUsers] = useState<UserLookupItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [pickerFilterTab, setPickerFilterTab] = useState<"ALL" | "USER" | "PRODUCER">("ALL");

  const loadNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const res: any = await fetchNotifications({ page, limit: 10 });
      const data = res?.results?.data || res?.data || [];
      const pg = res?.results?.pagination || {};
      setNotifications(data);
      setPagination({
        currentPage: pg.currentPage || page,
        totalPages: pg.totalPages || 1,
        totalCount: pg.totalCount || data.length,
        limit: pg.limit || 10,
        hasNextPage: pg.hasNextPage || false,
        hasPrevPage: pg.hasPrevPage || false,
      });

      const unreadRes: any = await fetchUnreadNotificationCount();
      setUnreadCount(unreadRes?.results?.unreadCount || 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load lightweight user lookup for selection
  const loadUserLookup = async (search = "") => {
    try {
      setLoadingUsers(true);
      const res: any = await getUsersLookup({ search: search || undefined, limit: 300 });
      const rawList = res?.data || res?.results?.data || [];
      const mapped: UserLookupItem[] = rawList.map((u: any) => ({
        id: u.id || u._id,
        fullName: u.fullName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User",
        email: u.email || "",
        mobile: u.mobile || "",
        role: u.role || "USER",
        profileImageUrl: u.profileImageUrl,
      }));
      setAllLookupUsers(mapped);
    } catch (error) {
      console.error("Failed to load users lookup:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadUserLookup();
  }, []);

  useEffect(() => {
    if (
      (form.recipientType === "SELECTED_USERS" || form.recipientType === "SELECTED_PRODUCERS") &&
      allLookupUsers.length === 0
    ) {
      loadUserLookup();
    }
  }, [form.recipientType]);

  useQuickAction(QA.SEND_NOTIFICATION, () => {
    titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    titleRef.current?.focus();
    toast.info("Compose a new notification campaign");
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleChannel = (channel: string) => {
    setForm((prev) => {
      const exists = prev.channels.includes(channel);
      let updated: string[];
      if (exists) {
        if (prev.channels.length === 1) {
          toast.error("At least one delivery channel must be selected");
          return prev;
        }
        updated = prev.channels.filter((c) => c !== channel);
      } else {
        updated = [...prev.channels, channel];
      }
      return { ...prev, channels: updated };
    });
  };

  const toggleUserSelection = (userId: string) => {
    setForm((prev) => {
      const exists = prev.recipientUserIds.includes(userId);
      const updated = exists
        ? prev.recipientUserIds.filter((id) => id !== userId)
        : [...prev.recipientUserIds, userId];
      return { ...prev, recipientUserIds: updated };
    });
  };

  const removeSelectedUser = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      recipientUserIds: prev.recipientUserIds.filter((id) => id !== userId),
    }));
  };

  const applyPreset = (preset: typeof CAMPAIGN_PRESETS[0]) => {
    setForm((prev) => ({
      ...prev,
      category: preset.category,
      title: preset.title,
      message: preset.message,
    }));
    toast.success(`Loaded template: "${preset.label}"`);
  };

  // Filter users inside the user picker
  const filteredUsers = useMemo(() => {
    let list = allLookupUsers;

    // Filter by category or active tab
    if (form.recipientType === "SELECTED_PRODUCERS") {
      list = list.filter((u) => (u.role || "").toUpperCase() === "PRODUCER");
    } else if (pickerFilterTab === "USER") {
      list = list.filter((u) => (u.role || "").toUpperCase() === "USER");
    } else if (pickerFilterTab === "PRODUCER") {
      list = list.filter((u) => (u.role || "").toUpperCase() === "PRODUCER");
    }

    if (!userSearchQuery.trim()) return list;
    const q = userSearchQuery.toLowerCase();
    return list.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.mobile && u.mobile.includes(q))
    );
  }, [allLookupUsers, userSearchQuery, pickerFilterTab, form.recipientType]);

  const selectedUsersObjects = useMemo(() => {
    return allLookupUsers.filter((u) => form.recipientUserIds.includes(u.id));
  }, [allLookupUsers, form.recipientUserIds]);

  const sendNotificationHandler = async () => {
    if (!form.title.trim()) {
      toast.error("Please enter a campaign title");
      titleRef.current?.focus();
      return;
    }
    if (!form.message.trim()) {
      toast.error("Please enter a notification message");
      messageRef.current?.focus();
      return;
    }
    if (!form.channels.length) {
      toast.error("Please select at least one delivery channel");
      return;
    }

    const isSpecific =
      form.recipientType === "SELECTED_USERS" || form.recipientType === "SELECTED_PRODUCERS";

    if (isSpecific && !form.recipientUserIds.length) {
      toast.error("Please select at least one recipient to send the notification.");
      setUserPickerOpen(true);
      return;
    }

    try {
      setSending(true);

      const payload: any = {
        title: form.title.trim(),
        message: form.message.trim(),
        category: form.category,
        notificationTypes: form.channels.map((c) => c.toUpperCase()),
        sendTo: form.recipientType,
      };

      if (isSpecific) {
        payload.recipients = form.recipientUserIds;
        payload.recipientUserIds = form.recipientUserIds;
      }

      if (isScheduled && form.scheduledAt) {
        payload.scheduledAt = new Date(form.scheduledAt).toISOString();
      }

      await sendNotification(payload);

      toast.success(
        isScheduled
          ? `Campaign scheduled for ${new Date(form.scheduledAt).toLocaleString()}`
          : "Notification campaign dispatched successfully!"
      );

      // Reset form
      setForm({
        title: "",
        message: "",
        category: "NEW_MOVIE_RELEASED",
        channels: ["PUSH", "EMAIL"],
        recipientType: "ALL_USERS",
        recipientUserIds: [],
        scheduledAt: getCurrentDateTimeLocal(),
      });
      setIsScheduled(false);

      await loadNotifications(1);
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error(error?.data?.message || error?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      toast.success("All notifications marked as read");
      await loadNotifications(pagination.currentPage);
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel?.toUpperCase()) {
      case "EMAIL":
        return Mail;
      case "PUSH":
        return Bell;
      case "SMS":
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getCategoryLabel = (cat?: string) => {
    if (!cat) return "Campaign";
    const found = NOTIFICATION_CATEGORIES.find((c) => c.value === cat.toUpperCase());
    return found ? found.label : cat.replace(/_/g, " ");
  };

  const getTargetAudienceBadge = (recipientType: string) => {
    const found = TARGET_AUDIENCE_OPTIONS.find((t) => t.value === recipientType);
    return found ? found.badge : recipientType.replace(/_/g, " ");
  };

  return (
    <>
      <PageHeader
        title="Notifications & Campaigns"
        description="Broadcast push, email, SMS, and in-app alerts to users, subscribers, or specific creators."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Mark all read ({unreadCount})
              </button>
            )}
            <button
              onClick={() => loadNotifications(pagination.currentPage)}
              disabled={loading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer shadow-xs"
              title="Refresh campaigns"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
        {/* Left 2 Cols: Compose Form */}
        <Surface className="p-6 xl:col-span-2 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Compose Notification Campaign</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send targeted announcements or broadcast messages across multiple channels.
              </p>
            </div>

            {/* Quick Templates */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                Quick Fill:
              </span>
              {CAMPAIGN_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border/80 bg-secondary/50 hover:bg-secondary hover:text-primary transition cursor-pointer shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {/* 1. Target Audience Selector (Full Interactive Grid) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  1. Target Audience <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Select who should receive this notification
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {TARGET_AUDIENCE_OPTIONS.map((t) => {
                  const Icon = t.icon;
                  const isSelected = form.recipientType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          recipientType: t.value,
                        }));
                        if (t.value === "SELECTED_USERS" || t.value === "SELECTED_PRODUCERS") {
                          setUserPickerOpen(true);
                        }
                      }}
                      className={cn(
                        "relative flex flex-col justify-between p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer overflow-hidden",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40 text-foreground"
                          : "border-border/80 bg-secondary/20 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className={cn(
                            "grid h-8 w-8 place-items-center rounded-xl border bg-gradient-to-br shadow-2xs",
                            t.color
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {t.badge}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-foreground leading-snug">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {t.desc}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute right-2 bottom-2 text-primary">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Specific Recipients Preview & Management Bar */}
              {(form.recipientType === "SELECTED_USERS" || form.recipientType === "SELECTED_PRODUCERS") && (
                <div className="mt-3 p-3.5 rounded-2xl border border-primary/30 bg-primary/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 px-2.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                        {form.recipientUserIds.length}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {form.recipientType === "SELECTED_PRODUCERS" ? "Producers" : "Users"} Selected
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUserPickerOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition cursor-pointer shadow-xs"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Browse & Add More
                      </button>
                      {form.recipientUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, recipientUserIds: [] }))}
                          className="px-2.5 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:text-destructive transition cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedUsersObjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-background/80 border border-border/80">
                      {selectedUsersObjects.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/80 px-2.5 py-1 text-xs font-medium text-foreground border border-border shadow-2xs"
                        >
                          <span className="truncate max-w-[140px] font-semibold">{u.fullName}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            ({u.email || u.mobile || "ID"})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSelectedUser(u.id)}
                            className="text-muted-foreground hover:text-destructive transition cursor-pointer ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-xs text-muted-foreground">
                      No recipients selected yet. Click <strong>"Browse & Add More"</strong> to search and pick individuals.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Delivery Channels */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  2. Delivery Channels <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (form.channels.length === CHANNEL_OPTIONS.length) {
                      setForm((prev) => ({ ...prev, channels: ["PUSH"] }));
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        channels: CHANNEL_OPTIONS.map((c) => c.value),
                      }));
                    }
                  }}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  {form.channels.length === CHANNEL_OPTIONS.length ? "Push Only" : "Select All Channels"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {CHANNEL_OPTIONS.map((ch) => {
                  const Icon = ch.icon;
                  const selected = form.channels.includes(ch.value);
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => toggleChannel(ch.value)}
                      disabled={sending}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition cursor-pointer",
                        selected
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30"
                          : "border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground border-border"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{ch.label}</span>
                          {selected && <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />}
                        </div>
                        <span className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
                          {ch.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Title & Category */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Campaign Title <span className="text-destructive">*</span>
                </label>
                <input
                  ref={titleRef}
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., Mirzapur Season 3 is now live!"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  disabled={sending}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Category / Event Type <span className="text-destructive">*</span>
                </label>
                <CustomSelect
                  value={form.category}
                  onChange={(val) => setForm((p) => ({ ...p, category: val }))}
                  placeholder="Select Category"
                  options={NOTIFICATION_CATEGORIES}
                  disabled={sending}
                />
              </div>
            </div>

            {/* 4. Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Notification Message Body <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {form.message.length} / 1000 characters
                </span>
              </div>
              <textarea
                ref={messageRef}
                name="message"
                rows={4}
                value={form.message}
                onChange={handleChange}
                maxLength={1000}
                placeholder="Write a clear, engaging notification message for your audience..."
                className="w-full rounded-xl border border-border bg-background p-3.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none leading-relaxed"
                disabled={sending}
              />
            </div>

            {/* 5. Scheduling Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-foreground border border-border">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Schedule for Later</div>
                  <div className="text-xs text-muted-foreground">
                    Set an automated dispatch time in the future.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>

                {isScheduled && (
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    value={form.scheduledAt}
                    onChange={handleChange}
                    className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={sending}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Audience: <strong className="text-foreground">{getTargetAudienceBadge(form.recipientType)}</strong>
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                Channels:
                {form.channels.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                      c === "EMAIL"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    )}
                  >
                    {c === "EMAIL" ? "✉️ Email Inbox" : c}
                  </span>
                ))}
              </span>
            </div>

            <button
              type="button"
              onClick={sendNotificationHandler}
              disabled={sending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-primary/25 active:scale-[0.98]"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isScheduled ? "Schedule Campaign" : "Send Notification Now"}
                </>
              )}
            </button>
          </div>
        </Surface>

        {/* Right 1 Col: Recent Campaigns */}
        <Surface className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Recent Campaigns</h3>
              <p className="text-xs text-muted-foreground">History & delivery analytics</p>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>

          {!notifications.length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30 text-muted-foreground" />
              <p className="font-medium">No campaigns found</p>
              <p className="text-xs mt-1">Dispatched notifications will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {notifications.map((n) => {
                  const Icon = getChannelIcon(n.channels?.[0] || "PUSH");

                  return (
                    <li
                      key={n._id}
                      onClick={() => setViewCampaign(n)}
                      className="group rounded-2xl border border-border bg-secondary/20 p-3.5 hover:bg-secondary/60 hover:border-primary/40 transition cursor-pointer space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition">
                            {n.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>{getCategoryLabel(n.category || n.type)}</span>
                            <span>•</span>
                            <span className="font-medium text-foreground/80">
                              {getTargetAudienceBadge(n.recipientType)}
                            </span>
                          </div>
                        </div>
                        <StatusPill status={n.status || "Sent"} />
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 text-primary" />
                          <span>{n.channels?.join(", ")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {n.sentAt || n.createdAt
                              ? new Date(n.sentAt || n.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Recent"}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadNotifications(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-50 transition cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => loadNotifications(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-50 transition cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Surface>
      </div>

      {/* USER & PRODUCER SELECTION DIALOG */}
      <Dialog open={userPickerOpen} onOpenChange={setUserPickerOpen}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>
                Select {form.recipientType === "SELECTED_PRODUCERS" ? "Producers" : "Recipients"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Search by name, email, or phone number to choose specific recipients for this notification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Search Input & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, or mobile..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                type="button"
                onClick={() => loadUserLookup(userSearchQuery)}
                disabled={loadingUsers}
                className="h-10 w-10 shrink-0 grid place-items-center rounded-xl border border-border bg-background hover:bg-secondary transition cursor-pointer"
                title="Reload users"
              >
                <RefreshCw className={cn("h-4 w-4", loadingUsers && "animate-spin text-primary")} />
              </button>
            </div>

            {/* Role Filter Tabs (Only shown when not strictly locked to Producers) */}
            {form.recipientType !== "SELECTED_PRODUCERS" && (
              <div className="flex items-center gap-1.5 border-b border-border/70 pb-2">
                {[
                  { id: "ALL", label: "All Users" },
                  { id: "USER", label: "Viewers Only" },
                  { id: "PRODUCER", label: "Producers Only" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPickerFilterTab(t.id as any)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer",
                      pickerFilterTab === t.id
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Selection Controls */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>{filteredUsers.length} matches found</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idsToAdd = filteredUsers.map((u) => u.id);
                    setForm((prev) => ({
                      ...prev,
                      recipientUserIds: Array.from(new Set([...prev.recipientUserIds, ...idsToAdd])),
                    }));
                  }}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Select All Filtered
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    const idsToRemove = new Set(filteredUsers.map((u) => u.id));
                    setForm((prev) => ({
                      ...prev,
                      recipientUserIds: prev.recipientUserIds.filter((id) => !idsToRemove.has(id)),
                    }));
                  }}
                  className="text-destructive font-semibold hover:underline cursor-pointer"
                >
                  Clear Filtered
                </button>
              </div>
            </div>

            {/* Scrollable Recipient List */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-xl p-2 bg-background">
              {loadingUsers ? (
                <div className="py-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading user list...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No matching users or producers found.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = form.recipientUserIds.includes(u.id);
                  const isProducer = (u.role || "").toUpperCase() === "PRODUCER";

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUserSelection(u.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer text-xs",
                        isChecked
                          ? "bg-primary/10 border border-primary/40 font-semibold"
                          : "hover:bg-secondary/70 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase">
                          {u.fullName ? u.fullName.slice(0, 2) : "U"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-foreground font-semibold">{u.fullName}</span>
                            {isProducer && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-500 border border-purple-500/20">
                                PRODUCER
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {u.email} {u.mobile ? `• ${u.mobile}` : ""}
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-background"
                        )}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary & Done Button */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs font-semibold text-foreground">
                <strong>{form.recipientUserIds.length}</strong> recipients selected
              </span>
              <button
                type="button"
                onClick={() => setUserPickerOpen(false)}
                className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition cursor-pointer shadow-xs"
              >
                Done Selection
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CAMPAIGN DETAILS MODAL */}
      <Dialog open={!!viewCampaign} onOpenChange={(o) => !o && setViewCampaign(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-border/80 bg-background shadow-2xl">
          {/* Header Banner */}
          <div className="relative overflow-hidden p-6 pb-5 border-b border-border/70 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary border border-primary/25 shadow-inner">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      {getCategoryLabel(viewCampaign?.category || viewCampaign?.type)}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {viewCampaign?.createdAt
                        ? new Date(viewCampaign.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Just now"}
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-bold text-foreground mt-1 leading-snug">
                    {viewCampaign?.title}
                  </DialogTitle>
                </div>
              </div>

              <div className="shrink-0 pr-6">
                <StatusPill status={viewCampaign?.status || "Sent"} />
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 text-xs">
            {/* Message Content Box with Quick Copy */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <span>Message Content</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
                    {viewCampaign?.message?.length || 0} chars
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (viewCampaign?.message) {
                      navigator.clipboard.writeText(viewCampaign.message);
                      toast.success("Message copied to clipboard!");
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Text
                </button>
              </div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans text-[13px] bg-secondary/20 p-3 rounded-xl border border-border/40 selection:bg-primary/20">
                {viewCampaign?.message}
              </p>
            </div>

            {/* 4 Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Delivery Channels */}
              <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Channels
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(viewCampaign?.channels || ["PUSH"]).map((ch) => {
                    const Icon = getChannelIcon(ch);
                    return (
                      <span
                        key={ch}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary border border-border/60 text-[11px] font-bold text-foreground"
                      >
                        <Icon className="h-3 w-3 text-primary" />
                        {ch}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience */}
              <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Target Audience
                </div>
                <div className="mt-2">
                  <span className="inline-block font-bold text-foreground text-xs px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    {getTargetAudienceBadge(viewCampaign?.recipientType || "ALL_USERS")}
                  </span>
                </div>
              </div>

              {/* Total Recipients */}
              <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Total Recipients
                </div>
                <div className="mt-1.5 text-lg font-extrabold text-foreground">
                  {viewCampaign?.recipientCount !== undefined
                    ? viewCampaign.recipientCount.toLocaleString()
                    : "All Platform"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Target audience size</div>
              </div>

              {/* Success / Failure */}
              <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Delivery Rate
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-emerald-500 font-extrabold text-base flex items-center gap-0.5">
                    ✓ {viewCampaign?.successCount ?? 0}
                  </span>
                  <span className="text-muted-foreground text-xs">/</span>
                  <span className="text-destructive font-bold text-xs flex items-center gap-0.5">
                    ✗ {viewCampaign?.failureCount ?? 0}
                  </span>
                </div>
                <div className="mt-1">
                  {(() => {
                    const total = (viewCampaign?.successCount ?? 0) + (viewCampaign?.failureCount ?? 0);
                    const percent = total > 0 ? Math.round(((viewCampaign?.successCount ?? 0) / total) * 100) : 100;
                    return (
                      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Failure Reason & Error Breakdown Alert (If any failures or error reason exists) */}
            {((viewCampaign?.failureCount && viewCampaign.failureCount > 0) || viewCampaign?.failureReason) && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4 text-rose-600 dark:text-rose-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Failure Breakdown & Delivery Warning</span>
                </div>
                <p className="text-[11px] leading-relaxed text-foreground/80">
                  {viewCampaign?.failureReason ||
                    `${viewCampaign?.failureCount} message(s) could not be delivered. Some recipient devices may have disabled notifications or invalid credentials.`}
                </p>
              </div>
            )}

            {/* Target Specific Recipients List (When available) */}
            {campaignRecipients.length > 0 && (
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-foreground text-xs flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Targeted Recipient Users ({campaignRecipients.length})</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Individual Recipients</span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
                  {campaignRecipients.map((user) => (
                    <div key={user._id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                          {user.fullName ? user.fullName[0]?.toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate text-xs">
                            {user.fullName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {user.email || user.mobile || "No direct address"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {user.role && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground border border-border/50">
                            {user.role}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <Check className="h-2.5 w-2.5" />
                          Delivered
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border/80 gap-3">
              <button
                type="button"
                onClick={() => setViewCampaign(null)}
                className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
              >
                Close Window
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDuplicateCampaign(viewCampaign!)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition cursor-pointer shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resend / Edit in Composer
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}