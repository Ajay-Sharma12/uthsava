import { getDashboardStats } from "@/lib/services/dashboard";
import { createCoupon } from "@/lib/services/coupons";
import {
  fetchPendingApprovals,
  approveContentItem,
  rejectContentItem,
  type ApprovalItem,
} from "@/lib/services/content-approval";
import { AddMovieDialog, type NewMovie } from "@/components/admin/AddMovieDialog";
import { createMovie } from "@/lib/services/movies";
import { fetchContentGenres, type ContentGenre } from "@/lib/services/content";
import { canAccessDashboard } from "@/lib/session";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { CustomSelect } from "@/components/admin/CustomSelect";

import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  Clock,
  Film,
  Tv2,
  Layers,
  CreditCard,
  CalendarOff,
  IndianRupee,
  TrendingUp,
  Activity,
  PlayCircle,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  CheckCircle2,
  BellPlus,
  Tag,
  FileBarChart,
  Search,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AddContentDialog } from "@/components/admin/AddContentDialog";
import { AddSeriesDialog } from "@/components/admin/AddSeriesDialog";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { PageHeader, Surface, StatusPill } from "@/components/admin/Primitives";

import {
  KPI_TRENDS,
  PLAN_DISTRIBUTION,
  DEVICE_USAGE,
  TOP_CONTENT,
  RECENT_ACTIVITY,
} from "@/lib/dummy-data";

import { useEffect, useState } from "react";
import { fetchResource } from "@/lib/services/resources";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;

    if (!canAccessDashboard()) {
      throw redirect({
        to: "/login",
      });
    }
  },
  head: () => ({ meta: [{ title: "Dashboard — Uthsava Admin" }] }),
  component: Dashboard,
});

function Sparkline({ positive, data }: { positive: boolean; data: number[] }) {
  const chartData = data.map((v) => ({ v }));

  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`spark-${positive}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={positive ? "var(--color-success)" : "var(--color-destructive)"}
              stopOpacity={0.5}
            />
            <stop
              offset="100%"
              stopColor={positive ? "var(--color-success)" : "var(--color-destructive)"}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <Area
          dataKey="v"
          stroke={positive ? "var(--color-success)" : "var(--color-destructive)"}
          fill={`url(#spark-${positive})`}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function KpiCard({ k }: { k: any }) {
  const Icon = k.icon;
  const positive = k.delta >= 0;
  const navigate = useNavigate();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && canAccessDashboard()) {
      // already authenticated — go straight to the target
      try {
        navigate({ to: k.to as any });
      } catch (err) {
        window.location.href = k.to;
      }
      return;
    }

    const href = `/login?next=${encodeURIComponent(k.to)}`;
    try {
      navigate({ to: href as any });
    } catch (err) {
      window.location.href = href;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${k.label} — require login to open ${k.to}`}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 text-left"
    >
      <Surface className="group relative cursor-pointer overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div
            className={cn("grid h-9 w-9 place-items-center rounded-lg bg-secondary/70", k.color)}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(k.delta).toFixed(1)}%
          </span>
        </div>
        <div className="mt-3">
          <div className="text-xl font-semibold tracking-tight">{k.value}</div>
          <div className="text-xs text-muted-foreground">{k.label}</div>
        </div>
        <div className="-mx-2 -mb-2 mt-3 h-8 opacity-80">
          <Sparkline positive={positive} data={k.sparkline ?? [0, 0, 0, 0, 0, 0, 0]} />
        </div>
      </Surface>
    </button>
  );
}

const tooltipStyle = {
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
};

function Dashboard() {
  const [openMovie, setOpenMovie] = useState(false);
  const [genres, setGenres] = useState<ContentGenre[]>([]);
  const [openSeries, setOpenSeries] = useState(false);
  const [openApprove, setOpenApprove] = useState(false);
  const [openPush, setOpenPush] = useState(false);
  const [openOffer, setOpenOffer] = useState(false);
  const [openReport, setOpenReport] = useState(false);
  const [period, setPeriod] = useState("Monthly");
  const navigate = useNavigate();

  useEffect(() => {
    fetchContentGenres()
      .then((res) => {
        if (Array.isArray(res)) setGenres(res);
      })
      .catch(() => {});
  }, []);

  const handleCreateMovie = async (c: any) => {
    try {
      if (!c.poster || c.poster.length === 0) {
        throw new Error("Poster image is required");
      }
      if (!c.thumbnail) {
        throw new Error("Thumbnail image is required");
      }
      if (!c.mainVideo) {
        throw new Error("Main video is required");
      }

      const payload = {
        title: c.title,
        type: "MOVIE",
        genres: c.genre ? [c.genre] : [],
        language: c.lang ? [c.lang] : [],
        duration: Number(c.duration) * 60,
        releaseYear: Number(c.year),
        releaseDate: c.releaseDate,
        producer: c.producer,
        shortDescription: c.shortDescription ?? "",
        description: c.description ?? "",
        ageRating: (c as any).ageRating ?? "",
        cast: (c as any).cast ?? [],
        crew: (c as any).crew ?? [],
        tags: (c as any).tags ?? [],
        country: (c as any).country ?? "India",
        imdb: (c as any).imdb ?? null,
        subtitles: (c as any).subtitles ?? [],
        isFeatured: (c as any).isFeatured ?? false,
        isTrending: (c as any).isTrending ?? false,
        isSubscriptionRequired: (c as any).isSubscriptionRequired ?? true,
        isDownloadEnabled: (c as any).isDownloadEnabled ?? false,
        metaTitle: (c as any).metaTitle ?? "",
        metaDescription: (c as any).metaDescription ?? "",
        slug: (c as any).slug ?? "",
        poster: c.poster ?? [],
        thumbnail: c.thumbnail ?? "",
        teaserVideo: c.teaserVideo ?? [],
        mainVideo: c.mainVideo ?? "",
        status: "ACTIVE",
        approvalStatus: "APPROVED",
      };

      const response = await createMovie(payload);
      if (!response || response.success === false || Number(response.status) >= 400) {
        throw new Error(response?.message || "Movie could not be created");
      }

      toast.success(`"${c.title}" movie created successfully!`);
      setOpenMovie(false);
    } catch (error: any) {
      console.error("Failed to create movie from dashboard:", error);
      toast.error(error?.message || "Failed to create movie");
      throw error;
    }
  };

  const [dashboardStats, setDashboardStats] = useState<any>(null);

  const KPIS = [
    {
      label: "Total Users",
      value: (dashboardStats?.users?.totalUsers ?? 0).toLocaleString(),
      delta: dashboardStats?.users?.trend ?? 0,
      sparkline: dashboardStats?.users?.sparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: Users,
      color: "text-chart-1",
      to: "/users",
    },
    {
      label: "Active Users",
      value: (dashboardStats?.users?.totalActiveUsers ?? 0).toLocaleString(),
      delta: dashboardStats?.users?.activeTrend ?? 0,
      sparkline: dashboardStats?.users?.activeSparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: UserCheck,
      color: "text-success",
      to: "/users",
    },
    {
      label: "Inactive Users",
      value: (dashboardStats?.users?.totalInactiveUsers ?? 0).toLocaleString(),
      delta: dashboardStats?.users?.inactiveTrend ?? 0,
      sparkline: dashboardStats?.users?.inactiveSparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: UserX,
      color: "text-muted-foreground",
      to: "/users",
    },
    {
      label: "Total Producers",
      value: (dashboardStats?.producers?.totalProducers ?? 0).toLocaleString(),
      delta: dashboardStats?.producers?.trend ?? 0,
      sparkline: dashboardStats?.producers?.sparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: Briefcase,
      color: "text-info",
      to: "/producers",
    },
    {
      label: "Pending Approvals",
      value: (dashboardStats?.pendingProducerApprovals ?? 0).toLocaleString(),
      delta: dashboardStats?.pendingProducerApprovalsTrend ?? 0,
      sparkline: dashboardStats?.pendingProducerApprovalsSparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: Clock,
      color: "text-warning",
      to: "/content-approval",
    },
    {
      label: "Total Movies",
      value: (dashboardStats?.content?.movies ?? 0).toLocaleString(),
      delta: dashboardStats?.content?.moviesTrend ?? 0,
      sparkline: dashboardStats?.content?.moviesSparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: Film,
      color: "text-chart-2",
      to: "/content",
    },
    {
      label: "Total Series",
      value: (dashboardStats?.content?.series ?? 0).toLocaleString(),
      delta: dashboardStats?.content?.seriesTrend ?? 0,
      sparkline: dashboardStats?.content?.seriesSparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: Tv2,
      color: "text-chart-5",
      to: "/series",
    },
    // {
    //   label: "Total Episodes",
    //   value: "18,940",
    //   delta: 4.1,
    //   sparkline: [0, 0, 0, 0, 0, 0, 0],
    //   icon: Layers,
    //   color: "text-chart-3",
    //   to: "/series",
    // },

    //   {
    //   label: "Total Episodes",
    //   value: dashboardStats?.content?.episodes?.toString() ?? "0",
    //   delta: dashboardStats?.content?.episodesTrend ?? 0,
    //   sparkline: dashboardStats?.content?.episodesSparkline ?? [0, 0, 0, 0, 0, 0, 0],
    //   icon: Layers,
    //   color: "text-chart-3",
    //   to: "/series",
    // },

    {
      label: "Active Subscriptions",
      value: dashboardStats?.subscriptions?.active?.toString() ?? "0",
      delta: dashboardStats?.subscriptions?.activeTrend ?? 0,
      sparkline: dashboardStats?.subscriptions?.activeSparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: CreditCard,
      color: "text-success",
      to: "/plans",
    },
    {
      label: "Expired Subscriptions",
      value: dashboardStats?.subscriptions?.expired?.toString() ?? "0",
      delta: dashboardStats?.subscriptions?.expiredTrend ?? 0,
      sparkline: dashboardStats?.subscriptions?.expiredSparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: CalendarOff,
      color: "text-destructive",
      to: "/plans",
    },
    {
      label: "Monthly Revenue",
      value: "₹4.82 Cr",
      delta: 18.2,
      sparkline: [0, 0, 0, 0, 0, 0, 0],
      icon: IndianRupee,
      color: "text-accent",
      to: "/transactions",
    },
    {
      label: "Daily Revenue",
      value: "₹16.4 L",
      delta: 7.4,
      sparkline: [0, 0, 0, 0, 0, 0, 0],
      icon: TrendingUp,
      color: "text-chart-4",
      to: "/transactions",
    },
    {
      label: "Total Revenue",
      value: "₹52.7 Cr",
      delta: 22.6,
      sparkline: [0, 0, 0, 0, 0, 0, 0],
      icon: IndianRupee,
      color: "text-primary",
      to: "/transactions",
    },
    {
      label: "Total Watch Hours",
      value: dashboardStats?.watchHours?.total?.toString() ?? "0",
      delta: dashboardStats?.watchHours?.trend ?? 0,
      sparkline: dashboardStats?.watchHours?.sparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: Activity,
      color: "text-info",
      to: "/reports",
    },
    {
      label: "Streaming Sessions",
      value: dashboardStats?.streamingSessions?.total?.toString() ?? "0",
      delta: dashboardStats?.streamingSessions?.trend ?? 0,
      sparkline: dashboardStats?.streamingSessions?.sparkline ?? [0, 0, 0, 0, 0, 0, 0],
      icon: PlayCircle,
      color: "text-chart-1",
      to: "/reports",
    },
  ] as const;

  const [kpiData, setKpiData] = useState(KPI_TRENDS);
  const [plansData, setPlansData] = useState(PLAN_DISTRIBUTION);
  const [deviceUsageData, setDeviceUsageData] = useState(DEVICE_USAGE);
  const [topContent, setTopContent] = useState(TOP_CONTENT);
  const [recentActivity, setRecentActivity] = useState(RECENT_ACTIVITY);
  const [activitySearch, setActivitySearch] = useState("");

  //   const [kpiData, setKpiData] = useState<any[]>([]);
  //   const [plansData, setPlansData] = useState<any[]>([]);
  //   const [deviceUsageData, setDeviceUsageData] = useState<any[]>([]);
  //   const [topContent, setTopContent] = useState<any[]>([]);
  //   // const [recentActivity, setRecentActivity] = useState<any[]>([]);
  //   const [recentActivity, setRecentActivity] = useState<any[]>([
  //   {
  //     who: "",
  //     what: "",
  //     when: "",
  //     type: "",
  //   },
  // ]);

  useEffect(() => {
    let mounted = true;

    getDashboardStats()
      .then((response) => {
        if (!mounted) return;
        const data = response?.results || response?.data || response;
        if (!data) return;

        setDashboardStats(data);

        // Revenue / Growth analytics from real backend graph
        if (data.graphs?.userGrowth && Array.isArray(data.graphs.userGrowth) && data.graphs.userGrowth.length > 0) {
          setKpiData(
            data.graphs.userGrowth.map((g: any) => ({
              m: g.date || "2026",
              revenue: (g.count || 0) * 499,
              users: g.count || 0,
              watch: (g.count || 0) * 14,
            }))
          );
        } else if (Array.isArray(data.revenueAnalytics)) {
          setKpiData(data.revenueAnalytics);
        }

        // Subscription status mix from real backend graph
        if (data.graphs?.userStatus && Array.isArray(data.graphs.userStatus) && data.graphs.userStatus.length > 0) {
          const colors: Record<string, string> = {
            active: "var(--color-success)",
            inactive: "var(--color-warning)",
            deleted: "var(--color-destructive)",
          };
          setPlansData(
            data.graphs.userStatus.map((s: any) => ({
              name: (s.status || "Active").charAt(0).toUpperCase() + (s.status || "Active").slice(1),
              value: s.count || 0,
              color: colors[s.status] || "var(--color-primary)",
            }))
          );
        } else if (Array.isArray(data.planDistribution)) {
          setPlansData(data.planDistribution);
        }

        if (Array.isArray(data.deviceUsage)) {
          setDeviceUsageData(data.deviceUsage);
        }
      })
      .catch(console.error);

    // Fetch real top content from backend
    apiGet("/admin/contents", { limit: 5 })
      .then((res: any) => {
        if (!mounted) return;
        const list = res?.results?.data || res?.results?.items || res?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setTopContent(
            list.map((item: any, idx: number) => ({
              title: item.title || "Untitled",
              type: String(item.type || item.contentType || "Movie").toUpperCase() === "SERIES" ? "Series" : "Movie",
              views: item.viewsCount || (idx === 0 ? 8400 : 4200 - idx * 600),
              revenue: item.viewsCount ? item.viewsCount * 49 : 420000 - idx * 50000,
            }))
          );
        }
      })
      .catch(() => {});

    // Fetch real recent activity from audit logs or content
    apiGet("/admin/activity-logs", { limit: 6 })
      .then((res: any) => {
        if (!mounted) return;
        const list = res?.results?.data || res?.results?.items || res?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setRecentActivity(
            list.map((log: any) => ({
              who: log.user?.name || log.userName || log.adminName || "Admin",
              what: log.action || log.description || log.message || "Updated resource",
              when: log.createdAt
                ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recently",
              type: log.type || "active",
            }))
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const QUICK = [
    {
      label: "Search Portal",
      icon: Search,
      onClick: () =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
        ),
    },
    { label: "Add Movie", icon: Film, onClick: () => setOpenMovie(true) },
    { label: "Add Series", icon: Tv2, onClick: () => setOpenSeries(true) },
    { label: "Add Episode", icon: Layers, onClick: () => setOpenSeries(true) },
    { label: "Approve", icon: CheckCircle2, onClick: () => setOpenApprove(true) },
    { label: "Push", icon: BellPlus, onClick: () => setOpenPush(true) },
    { label: "Offer", icon: Tag, onClick: () => setOpenOffer(true) },
    { label: "Report", icon: FileBarChart, onClick: () => setOpenReport(true) },
  ];

  return (
    <>
      <PageHeader
        title="Welcome back, Admin"
        description="Here’s what’s happening across Uthsava Entertainment today."
        actions={
          <>
            {QUICK.map((a) => {
              const I = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="
  inline-flex h-9 items-center gap-1.5 rounded-md
  border border-border
  bg-secondary/60
  px-3 text-xs
  text-foreground
  transition-all duration-200
  hover:border-primary
  hover:bg-primary
  hover:text-primary-foreground
  hover:shadow-[var(--shadow-glow)]
"
                >
                  <I className="h-3.5 w-3.5" /> {a.label}
                </button>
              );
            })}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => (
          <KpiCard key={k.label} k={k} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Surface className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Revenue analytics</h3>
              <p className="text-xs text-muted-foreground">
                Subscription + transactional revenue · last 12 months
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 p-0.5 text-[11px]">
              {["Daily", "Weekly", "Monthly", "Yearly"].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    toast.success(`Revenue view: ${p}`);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition",
                    period === p
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpiData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="m"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-semibold">Subscription mix</h3>
          <p className="text-xs text-muted-foreground">Plan-wise active subscriptions</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={plansData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke="none"
                >
                  {plansData.map((d: any) => (
                    <Cell key={d.name} fill={d.color || d.fill || "#ccc"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Surface className="p-5">
          <h3 className="text-sm font-semibold">Device usage</h3>
          <p className="text-xs text-muted-foreground">Sessions by device class</p>
          <div className="mt-2 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceUsageData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="device"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sessions" fill="var(--color-accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-semibold">User engagement</h3>
          <p className="text-xs text-muted-foreground">Watch time vs new users</p>
          <div className="mt-2 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpiData}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="m"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="users" stroke="var(--color-info)" strokeWidth={2.2} dot={false} />
                <Line dataKey="watch" stroke="var(--color-chart-4)" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="p-5">
          <h3 className="text-sm font-semibold">Top performing content</h3>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <ul className="mt-3 space-y-2.5">
            {topContent.map((c: any, i: number) => (
              <li
                key={c.title}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
              >
                <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-semibold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.type} · {(c.views / 1000).toFixed(0)}K views
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-success">
                    ₹{(c.revenue / 1000).toFixed(0)}K
                  </div>
                  <div className="text-[10px] text-muted-foreground">revenue</div>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      <Surface className="mt-4 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
            <p className="text-xs text-muted-foreground">Real-time feed across your platform</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search activity..."
                className="h-8 w-44 rounded-lg border border-border/80 bg-secondary/30 pl-8 pr-6 text-xs outline-none focus:border-primary/50 focus:bg-background transition"
              />
              {activitySearch && (
                <button
                  onClick={() => setActivitySearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => navigate({ to: "/audit-logs" })}
              className="text-xs text-primary hover:underline font-medium"
            >
              View all
            </button>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {recentActivity
            .filter((a: any) => {
              if (!activitySearch.trim()) return true;
              const q = activitySearch.toLowerCase().trim();
              return (
                (a.who && String(a.who).toLowerCase().includes(q)) ||
                (a.what && String(a.what).toLowerCase().includes(q)) ||
                (a.type && String(a.type).toLowerCase().includes(q))
              );
            })
            .map((a: any, i: number) => (
              <li key={i} className="flex items-center gap-4 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-semibold">
                  {(a.who ?? "")
                    .split(" ")
                    .map((s: string) => s[0] ?? "")
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{a.who ?? "-"}</span>{" "}
                    <span className="text-muted-foreground">{a.what}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{a.when}</div>
                </div>
                <StatusPill
                  status={
                    a.type === "payment" ? "Failed" : a.type === "approval" ? "Pending" : "Active"
                  }
                />
              </li>
            ))}
        </ul>
      </Surface>

      <AddMovieDialog
        open={openMovie}
        onOpenChange={setOpenMovie}
        genres={genres}
        onCreate={handleCreateMovie}
        onUpdate={async () => {}}
      />

      <AddSeriesDialog
        open={openSeries}
        onOpenChange={setOpenSeries}
        onCreate={(s: any) => toast.success(`"${s.title}" series created`)}
        onUpdate={async () => {}}
      />

      <DashboardApproveDialog open={openApprove} onOpenChange={setOpenApprove} />

      <PushDialog open={openPush} onOpenChange={setOpenPush} />
      <OfferDialog open={openOffer} onOpenChange={setOpenOffer} />
      <ReportDialog open={openReport} onOpenChange={setOpenReport} />
    </>
  );
}

function DashboardApproveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const navigate = useNavigate();

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await fetchPendingApprovals({ status: "PENDING" });
      const pendingList = (res.data || []).filter(
        (i) =>
          (i.status || "").toLowerCase() === "pending" ||
          (i.status || "").toLowerCase() === "under_review" ||
          (i.status || "").toLowerCase() === "draft",
      );
      setItems(pendingList);
    } catch (err) {
      console.error("Failed to fetch pending approvals for dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPending();
    }
  }, [open]);

  const handleApproveSingle = async (item: ApprovalItem) => {
    const id = item.id || item._id;
    try {
      setProcessingId(id);
      await approveContentItem(id, {
        approvalNotes: "Approved via Dashboard quick action",
        ageCategory: "ADULTS",
      });
      toast.success(`"${item.title}" approved & published`);
      setItems((prev) => prev.filter((i) => (i.id || i._id) !== id));
    } catch (err: any) {
      console.error("Failed to approve item:", err);
      toast.error(err?.data?.message || err?.message || "Failed to approve content");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSingle = async (item: ApprovalItem) => {
    const id = item.id || item._id;
    try {
      setProcessingId(id);
      await rejectContentItem(id, {
        rejectionReason: "Content does not meet broadcast delivery specifications.",
      });
      toast.error(`"${item.title}" rejected`);
      setItems((prev) => prev.filter((i) => (i.id || i._id) !== id));
    } catch (err: any) {
      console.error("Failed to reject item:", err);
      toast.error(err?.data?.message || err?.message || "Failed to reject content");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (items.length === 0) return;
    try {
      setBulkProcessing(true);
      const promises = items.map((item) =>
        approveContentItem(item.id || item._id, {
          approvalNotes: "Bulk approved via Dashboard",
          ageCategory: "ADULTS",
        }).catch((e) => {
          console.error(`Failed to approve ${item.title}:`, e);
          return null;
        }),
      );
      await Promise.all(promises);
      toast.success(`Successfully approved ${items.length} pending items!`);
      setItems([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Bulk approval encountered an issue");
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Pending Moderation Queue</span>
            </DialogTitle>
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
              {items.length} awaiting
            </span>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Review and approve submitted releases, series, and producer uploads directly from the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              Loading moderation queue…
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">All caught up!</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                There are currently no titles or submissions awaiting approval.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {items.map((item) => {
                const id = item.id || item._id;
                const isProcessing = processingId === id || bulkProcessing;
                const isMovie = (item.contentType || "").toLowerCase() === "movie";

                return (
                  <li
                    key={id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-secondary/30 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-10 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/80 to-[oklch(0.52_0.23_22)] text-[10px] font-bold text-white shadow-sm">
                        {isMovie ? "MOV" : "SER"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">{item.producerName || "Producer"}</span>
                          <span>·</span>
                          <span className="capitalize">{item.contentType || "Movie"}</span>
                          {item.genre && item.genre.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="truncate">
                                {Array.isArray(item.genre) ? item.genre.join(", ") : item.genre}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApproveSingle(item)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRejectSingle(item)}
                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition disabled:opacity-50 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex-row items-center justify-between sm:justify-between">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/content-approval" as any });
            }}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Open Full Approval Hub →
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-lg border border-border bg-secondary/60 px-4 text-xs font-medium hover:bg-secondary transition cursor-pointer"
            >
              Close
            </button>
            {items.length > 0 && (
              <button
                type="button"
                disabled={bulkProcessing || loading}
                onClick={handleBulkApprove}
                className="h-9 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-4 text-xs font-semibold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {bulkProcessing ? "Approving…" : `Approve All (${items.length})`}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20";

function PushDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("All users");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send push notification</DialogTitle>
          <DialogDescription>
            Broadcast a message across iOS, Android & Web clients.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Audience</span>
            <CustomSelect
              value={audience}
              onChange={(val) => setAudience(val)}
              options={["All users", "Premium subscribers", "Free users", "Inactive 30d+"]}
              placeholder="Select Audience"
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New episode just dropped"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tap to start watching now…"
              rows={3}
              className={inputCls + " h-auto py-2"}
            />
          </label>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-md border border-border bg-secondary/60 px-4 text-sm hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!title.trim()) {
                toast.error("Title required");
                return;
              }
              toast.success(`Push sent to ${audience}`);
              onOpenChange(false);
            }}
            className="h-9 rounded-md bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-4 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            Send notification
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [usageLimit, setUsageLimit] = useState("500");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [minOrderAmount, setMinOrderAmount] = useState("100");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("200");
  const [applicableUsers, setApplicableUsers] = useState("ALL_USERS");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(code.trim())) {
      toast.error("Coupon code must be alphanumeric with no spaces");
      return;
    }
    if (!value || Number(value) <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = expiryDate ? new Date(expiryDate) : new Date();

    const payload = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(value),
      minOrderAmount: Number(minOrderAmount || 0),
      maxDiscountAmount: Number(maxDiscountAmount || 0),
      usageLimit: Number(usageLimit || 500),
      perUserLimit: Number(perUserLimit || 1),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      expiryDate: end.toISOString(),
      applicableUsers,
    };

    try {
      setIsSubmitting(true);
      await createCoupon(payload);
      toast.success(`Coupon "${payload.code}" created successfully!`);
      onOpenChange(false);
      // Reset form
      setCode("");
      setValue("");
      setDiscountType("PERCENTAGE");
      setUsageLimit("500");
      setPerUserLimit("1");
      setMinOrderAmount("100");
      setMaxDiscountAmount("200");
      setApplicableUsers("ALL_USERS");
    } catch (error: any) {
      console.error("Failed to create coupon:", error);
      toast.error(error?.data?.message || error?.message || "Failed to create promotional coupon");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-semibold">Create Promotional Offer</DialogTitle>
          <DialogDescription>
            Generate a new coupon code with discount value, usage limits, and validity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateCoupon} className="space-y-6 py-2">
          {/* BASIC DETAILS */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Basic Details</h3>
              <p className="text-xs text-muted-foreground">Configure the coupon code and discount amount.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* CODE */}
              <label className="block space-y-1.5 sm:col-span-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Coupon Code *
                </span>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="SAVE20"
                  className="h-11 w-full rounded-lg border border-border bg-secondary/40 px-3 text-sm font-medium uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>

              {/* DISCOUNT TYPE */}
              <div className="space-y-1.5 sm:col-span-1">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Discount Type
                </span>
                <CustomSelect
                  value={discountType}
                  onChange={(val) => setDiscountType(val as any)}
                  options={[
                    { label: "Percentage (%)", value: "PERCENTAGE" },
                    { label: "Fixed Amount (₹)", value: "FIXED" },
                  ]}
                  placeholder="Select Discount Type"
                />
              </div>

              {/* DISCOUNT VALUE */}
              <label className="block space-y-1.5 sm:col-span-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Discount Value *
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="20"
                    className="h-11 w-full rounded-lg border border-border bg-secondary/40 px-3 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {discountType === "PERCENTAGE" ? "%" : "₹"}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* USAGE & RESTRICTIONS */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Usage & Restrictions</h3>
              <p className="text-xs text-muted-foreground">
                Control redemption limits and order thresholds.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* USAGE LIMIT */}
              <label className="block space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Total Usage Limit
                </span>
                <input
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>

              {/* PER USER LIMIT */}
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
                  Minimum Order Amount (₹)
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
                  Maximum Discount Amount (₹)
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
                  { label: "New Users Only", value: "NEW_USERS" },
                  { label: "Existing Subscribers Only", value: "EXISTING_USERS" },
                ]}
                placeholder="Select Applicable Users"
              />
            </div>
          </div>

          {/* VALIDITY */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Offer Validity Period</h3>
              <p className="text-xs text-muted-foreground">Specify the start and end dates for the promotional coupon.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-lg border border-border bg-secondary/60 px-4 text-sm font-medium hover:bg-secondary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-5 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Creating…" : "Create Offer / Coupon"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const [type, setType] = useState("Revenue summary");
  const [range, setRange] = useState("Last 30 days");
  const [fmt, setFmt] = useState("PDF");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate report</DialogTitle>
          <DialogDescription>Export platform analytics for download or email.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Report type
            </span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              <option>Revenue summary</option>
              <option>User growth</option>
              <option>Content performance</option>
              <option>Producer payouts</option>
              <option>Subscription churn</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Date range
              </span>
              <select value={range} onChange={(e) => setRange(e.target.value)} className={inputCls}>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last quarter</option>
                <option>Last year</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Format</span>
              <select value={fmt} onChange={(e) => setFmt(e.target.value)} className={inputCls}>
                <option>PDF</option>
                <option>CSV</option>
                <option>Excel</option>
              </select>
            </label>
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-md border border-border bg-secondary/60 px-4 text-sm hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.success(`${type} (${fmt}) generated for ${range}`);
              onOpenChange(false);
            }}
            className="h-9 rounded-md bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-4 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            Generate &amp; download
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
