import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuickAction } from "@/hooks/use-quick-action";
import { QA } from "@/lib/quick-actions";
import { DataTable, Column, RowAction } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import {
  fetchContents,
  createContent,
  updateContent,
  deleteContent,
  updateContentStatus,
} from "@/lib/services/content";
import { approveContent, rejectContent } from "@/lib/services/content-approval";
import {
  Star,
  Film,
  Tv2,
  Eye,
  Pencil,
  Trash2,
  Play,
  PlayCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Video,
  EyeIcon,
} from "lucide-react";
import { AddContentDialog, NewContent } from "@/components/admin/AddContentDialog";
import { ViewSheet } from "@/components/admin/ViewSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/content")({
  head: () => ({ meta: [{ title: "Content Library — Uthsava Admin" }] }),
  component: ContentPage,
});

const CLOUD_FRONT_URL = "https://d1f23llskj06r6.cloudfront.net";

const resolveMediaUrl = (url?: string | null) => {
  if (!url || typeof url !== "string") return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;
  return `${CLOUD_FRONT_URL}/${cleanPath}`;
};

const formatDuration = (
  val?: any,
  type?: string,
  seasons?: any[],
  totalEpisodes?: any
): string => {
  const isSeries =
    String(type || "").toUpperCase() === "SERIES" ||
    (Array.isArray(seasons) && seasons.length > 0) ||
    (typeof totalEpisodes === "number" && totalEpisodes > 0);

  if (isSeries) {
    let epCount = 0;
    if (Array.isArray(seasons) && seasons.length > 0) {
      epCount = seasons.reduce(
        (acc: number, s: any) =>
          acc +
          (Array.isArray(s.episodes)
            ? s.episodes.length
            : typeof s.totalEpisodes === "number"
            ? s.totalEpisodes
            : 0),
        0
      );
    }
    if (epCount === 0 && typeof totalEpisodes === "number" && totalEpisodes > 0) {
      epCount = totalEpisodes;
    }
    if (epCount === 0 && val !== undefined && val !== null) {
      const strVal = String(val).toLowerCase();
      if (strVal.includes("eps") || strVal.includes("ep")) {
        const num = parseInt(strVal.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(num) && num > 0) epCount = num;
      }
    }
    if (epCount > 0) {
      return `${epCount} eps`;
    }
    if (val && String(val).toLowerCase().includes("eps")) {
      return String(val).trim();
    }
  }

  if (val !== null && val !== undefined && val !== "") {
    if (typeof val === "number" && val > 0) {
      return `${val}m`;
    }

    const str = String(val).trim();
    if (str && str !== "0") {
      if (str.endsWith("m") && !str.includes("h")) {
        return str;
      }
      if (str.includes("h")) {
        const hMatch = str.match(/(\d+)\s*h/);
        const mMatch = str.match(/(\d+)\s*m/);
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
        const total = hours * 60 + mins;
        if (total > 0) return `${total}m`;
      }
      const num = parseInt(str.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > 0) {
        return `${num}m`;
      }
      return str;
    }
  }

  return "—";
};

export interface ContentItem {
  _id: string;
  id?: string;
  title: string;
  type: string;
  genres?: string[];
  language?: string[];
  duration?: string;
  releaseYear?: number | string;
  producer?: string;
  uploaderInfo?: any;
  createdAt: string;
  updatedAt?: string;
  reviewCount?: number;
  views?: number;
  viewCount?: number;
  totalViews?: number;
  revenue?: number;
  approvalStatus: string;
  status: "Active" | "Inactive";
  isActive?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  freePreviewDuration?: number;
  description?: string;
  cast?: any[];
  posterImage?: any;
  bannerImage?: any;
  thumbnailImage?: any;
  poster?: any;
  banner?: any;
  thumbnail?: any;
  videoUrl?: string;
  trailerUrl?: string;
  mainVideo?: string;
  teaserVideo?: any;
  seasons?: any[];
}

function ContentPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [view, setView] = useState<ContentItem | null>(null);

  // Video preview player
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);

  useQuickAction(QA.ADD_CONTENT, () => {
    setEditingItem(null);
    setOpenAdd(true);
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res: any = await fetchContents({ page: 1, limit: 100 });
      const list = res?.results?.contents || res?.data || res?.results?.data || [];
      
      const mapped: ContentItem[] = list.map((item: any) => {
        const uploader = Array.isArray(item.uploaderInfo) && item.uploaderInfo.length > 0
          ? item.uploaderInfo[0]
          : item.uploadedBy || {};
        const producerName =
          uploader.businessName ||
          uploader.fullName ||
          (uploader.firstName ? `${uploader.firstName} ${uploader.lastName || ""}`.trim() : null) ||
          item.producer ||
          "Producer";

        const rawStatus = String(item.status || "").toUpperCase();
        let statusLabel = item.isActive ? "Published" : "Draft";
        if (rawStatus === "ACTIVE" || rawStatus === "PUBLISHED") statusLabel = "Published";
        else if (rawStatus === "DRAFT") statusLabel = "Draft";
        else if (rawStatus === "SUSPENDED" || rawStatus === "SUSPEND") statusLabel = "Suspended";
        else if (rawStatus === "REJECTED") statusLabel = "Rejected";
        else if (rawStatus === "PENDING" || rawStatus === "AWAITING") statusLabel = "Pending";
        else if (rawStatus === "INACTIVE") statusLabel = "Inactive";

        const rawApproval = String(item.approvalStatus || item.approval || "PENDING").toUpperCase();
        let approvalLabel = "Awaiting";
        if (rawApproval === "APPROVED") approvalLabel = "Approved";
        else if (rawApproval === "ON_HOLD" || rawApproval === "HOLD" || rawApproval === "HOLD_24H") approvalLabel = "On Hold (24h)";
        else if (rawApproval.includes("RE_EDIT") || rawApproval.includes("UNDER_REVIEW")) approvalLabel = "Re-edit Requested";
        else if (rawApproval === "REJECTED") approvalLabel = "Rejected";
        else if (rawApproval === "DRAFT") approvalLabel = "Draft";
        else approvalLabel = "Awaiting";

        const realViews =
          item.viewsCount ??
          item.views ??
          item.viewCount ??
          item.totalViews ??
          item.reviewCount ??
          (item.analytics?.totalViews) ??
          (Array.isArray(item.seasons)
            ? item.seasons.reduce((acc: number, s: any) => acc + (s.viewsCount || s.views || 0), 0)
            : 0) ??
          0;

        return {
          ...item,
          id: item._id,
          type: item.type === "SERIES" ? "Series" : item.type === "MOVIE" ? "Movie" : (item.type || "Movie"),
          genres: Array.isArray(item.genres)
            ? item.genres
            : (item.genre ? [item.genre] : ["Drama"]),
          language: Array.isArray(item.language)
            ? item.language
            : (item.language ? [item.language] : ["Hindi"]),
          producer: producerName,
          duration: formatDuration(item.duration, item.type, item.seasons, item.totalEpisodes),
          approvalStatus: approvalLabel,
          rawApprovalStatus: rawApproval,
          status: statusLabel,
          rawStatus,
          isActive: statusLabel === "Published" || statusLabel === "Active",
          views: realViews,
          releaseYear: item.releaseYear || item.year || 2026,
        };
      });

      setRows(mapped);
    } catch (error) {
      console.error("Failed to load content:", error);
      toast.error("Failed to load content library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveContent = async (c: NewContent, editId?: string) => {
    const isSeries = c.type === "Series" || c.type === "SERIES";
    const durationNum = parseInt(c.duration.replace(/[^0-9]/g, ""), 10) || 120;

    const payload: any = {
      title: c.title,
      type: isSeries ? "SERIES" : "MOVIE",
      genres: [c.genre].filter(Boolean),
      language: [c.lang].filter(Boolean),
      duration: durationNum,
      releaseYear: Number(c.year) || 2026,
      producer: c.producer,
      status: c.status === "Active" ? "ACTIVE" : "INACTIVE",
      isActive: c.status === "Active",
      approvalStatus: (c.approval || "DRAFT").toUpperCase(),
      isFeatured: false,
    };

    if (c.poster) payload.poster = Array.isArray(c.poster) ? c.poster : [c.poster];
    if (c.banner) payload.banner = Array.isArray(c.banner) ? c.banner : [c.banner];
    if (c.thumbnail) payload.thumbnail = c.thumbnail;
    if (c.trailerVideo) {
      payload.trailerVideo = c.trailerVideo;
      payload.teaserVideo = Array.isArray(c.trailerVideo) ? c.trailerVideo : [c.trailerVideo];
    }
    if (c.mainVideo) payload.mainVideo = c.mainVideo;
    if (c.description) payload.description = c.description;
    if (c.cast) payload.cast = c.cast;
    if (c.director) payload.director = c.director;
    if (c.tags) payload.tags = c.tags;
    if (c.metaTitle) payload.metaTitle = c.metaTitle;
    if (c.metaDesc) payload.metaDesc = c.metaDesc;
    if (c.slug) payload.slug = c.slug;

    try {
      if (editId) {
        await updateContent(editId, payload);
        toast.success(`"${c.title}" updated successfully`);
      } else {
        await createContent(payload);
        toast.success(`"${c.title}" added to content library`);
      }
      setEditingItem(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || "Failed to save content");
    }
  };

  const handleDelete = async (r: ContentItem) => {
    try {
      await deleteContent(r._id);
      setRows((prev) => prev.filter((x) => x._id !== r._id));
      if (view?._id === r._id) setView(null);
      toast.success(`"${r.title}" deleted from library`);
    } catch (error) {
      toast.error("Failed to delete content");
    }
  };

  const handleToggleStatus = async (r: ContentItem) => {
    const approval = (r.approvalStatus || "").toUpperCase();
    const isApproved = approval === "APPROVED";

    if (!isApproved) {
      const contentTitle = r.title || "Selected content";
      if (
        approval === "ON_HOLD" ||
        approval === "HOLD" ||
        approval === "HOLD (24H)" ||
        approval === "HOLD_24H"
      ) {
        toast.info(`"${contentTitle}" is On Hold (24h)`, {
          description: "Status remains Inactive while on hold. Active/Inactive status will be unlocked once approved.",
        });
      } else if (approval === "PENDING" || approval === "AWAITING") {
        toast.info(`"${contentTitle}" is Pending Review`, {
          description: "Status is kept Inactive during review. You can toggle Active/Inactive once approved.",
        });
      } else if (approval === "REJECTED") {
        toast.info(`"${contentTitle}" is Rejected`, {
          description: "Please approve the content first to make it Active.",
        });
      } else if (approval === "DRAFT") {
        toast.info(`"${contentTitle}" is in Draft`, {
          description: "Submit and approve this content to enable Active status.",
        });
      } else if (
        approval === "RE_EDIT_REQUESTED" ||
        approval === "RE_EDIT" ||
        approval === "UNDER_REVIEW"
      ) {
        toast.info(`"${contentTitle}" is awaiting Re-edit`, {
          description: "Active/Inactive status will be unlocked once re-edited and approved.",
        });
      } else {
        toast.info(`"${contentTitle}" requires Approval`, {
          description: "Active/Inactive status can be modified once approved.",
        });
      }
      return;
    }

    const currentActive = r.status === "Active" || r.isActive === true;
    const nextStatus = currentActive ? "Inactive" : "Active";
    const nextActive = !currentActive;
    try {
      await updateContentStatus(r._id, {
        status: nextActive ? "ACTIVE" : "INACTIVE",
        isActive: nextActive,
      });
      setRows((prev) =>
        prev.map((x) => (x._id === r._id ? { ...x, status: nextStatus, isActive: nextActive } : x))
      );
      toast.success(`"${r.title}" marked as ${nextStatus}`);
    } catch (error: any) {
      const msg =
        error?.data?.message ||
        error?.message ||
        "Failed to update status";
      toast.error(msg);
    }
  };

  const handleApprove = async (r: ContentItem) => {
    try {
      await approveContent(r._id, { approvalNotes: "Approved from Content Library" });
      toast.success(`"${r.title}" approved successfully. You can now toggle Active/Inactive status.`);
      setRows((prev) =>
        prev.map((x) =>
          x._id === r._id ? { ...x, approvalStatus: "APPROVED", status: "Active", isActive: true } : x
        )
      );
      if (view?._id === r._id) {
        setView((v) => (v ? { ...v, approvalStatus: "APPROVED", status: "Active", isActive: true } : null));
      }
    } catch (error) {
      toast.error("Failed to approve content");
    }
  };

  const handleReject = async (r: ContentItem) => {
    try {
      await rejectContent(r._id, { rejectionReason: "Rejected from Content Library" });
      toast.success(`"${r.title}" rejected. Status set to Inactive.`);
      setRows((prev) =>
        prev.map((x) =>
          x._id === r._id ? { ...x, approvalStatus: "REJECTED", status: "Inactive", isActive: false } : x
        )
      );
      if (view?._id === r._id) {
        setView((v) => (v ? { ...v, approvalStatus: "REJECTED", status: "Inactive", isActive: false } : null));
      }
    } catch (error) {
      toast.error("Failed to reject content");
    }
  };

  // Row Actions
  const actions: RowAction<ContentItem>[] = [
    {
      label: "View Details",
      icon: Eye,
      onClick: (r) => setView(r),
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: (r) => {
        setEditingItem(r);
        setOpenAdd(true);
      },
    },
    {
      label: "Delete",
      icon: Trash2,
      destructive: true,
      onClick: (r) => handleDelete(r),
    },
  ];

  // Dynamic filter options extracted from live rows
  const availableGenres = useMemo(() => {
    const set = new Set<string>(["Action", "Drama", "Comedy", "Thriller", "Romance", "Horror", "Documentary"]);
    rows.forEach((r) => r.genres?.forEach((g) => set.add(g)));
    return Array.from(set);
  }, [rows]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>(["Hindi", "English", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali"]);
    rows.forEach((r) => r.language?.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [rows]);

  // Columns definition
  const cols: Column<ContentItem>[] = [
    {
      key: "title",
      header: "Content",
      render: (r) => {
        const posterUrl =
          resolveMediaUrl(
            typeof r.posterImage === "string"
              ? r.posterImage
              : r.posterImage?.url || r.thumbnailImage?.url || r.bannerImage?.url || r.poster || r.thumbnail
          );

        return (
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-[10px] font-bold uppercase border border-border">
              {posterUrl ? (
                <img src={posterUrl} alt={r.title} className="h-full w-full object-cover" />
              ) : (
                <div className={`h-full w-full grid place-items-center text-white ${
                  r.type === "Series" ? "bg-gradient-to-br from-rose-500 to-amber-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"
                }`}>
                  {r.type === "Series" ? "SER" : "MOV"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold truncate text-foreground">
                <span className="truncate">{r.title}</span>
                {r.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                {r.type === "Series" ? <Tv2 className="h-3 w-3 shrink-0" /> : <Film className="h-3 w-3 shrink-0" />}
                <span className="truncate">
                  {r.type} · {r.genres?.join(", ") || "General"} · {r.language?.join(", ") || "Hindi"}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "duration",
      header: "Duration",
      render: (r) => (
        <span className="text-xs font-medium text-foreground">
          {r.duration || "—"}
        </span>
      ),
    },
    {
      key: "releaseYear",
      header: "Year",
      render: (r) => <span className="text-xs font-medium">{r.releaseYear || 2026}</span>,
    },
    {
      key: "producer",
      header: "Producer",
      render: (r) => <span className="text-xs truncate max-w-[140px] block text-foreground">{r.producer}</span>,
    },
    {
      key: "createdAt",
      header: "Uploaded",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recent"}
        </span>
      ),
    },
    {
      key: "views",
      header: "Views",
      render: (r) => (
        <span className="text-xs font-semibold text-foreground">
          {(r.views ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "approvalStatus",
      header: "Approval",
      render: (r) => <StatusPill status={r.approvalStatus} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const approval = (r.approvalStatus || "").toUpperCase();
        const isApproved = approval === "APPROVED";
        const isActive = isApproved
          ? (r.status === "Active" || r.isActive === true)
          : false;

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(r);
            }}
            className="cursor-pointer"
            title={
              isApproved
                ? `Click to toggle: currently ${isActive ? "Active" : "Inactive"}`
                : `Status locked (Requires Approved status, currently ${r.approvalStatus || "Pending"}). Click for info.`
            }
          >
            <StatusPill status={isActive ? "Active" : "Inactive"} />
          </button>
        );
      },
    },
  ];

  // Hero banner for ViewSheet
  const viewHeroUrl = view
    ? resolveMediaUrl(
        typeof view.bannerImage === "string"
          ? view.bannerImage
          : view.bannerImage?.url ||
            (typeof view.posterImage === "string" ? view.posterImage : view.posterImage?.url) ||
            view.thumbnailImage?.url ||
            view.banner ||
            view.poster
      )
    : "";

  const viewVideoUrl = view?.videoUrl || view?.trailerUrl || view?.mainVideo || (Array.isArray(view?.teaserVideo) ? view?.teaserVideo[0] : view?.teaserVideo) || "";

  const [isPlayingInSheet, setIsPlayingInSheet] = useState(false);

  const getPlayableVideoUrl = (item: ContentItem | null) => {
    if (!item) return "";
    if (item.trailerUrl) return item.trailerUrl;
    if (item.videoUrl) return item.videoUrl;
    if (item.mainVideo) return item.mainVideo;
    if (Array.isArray(item.teaserVideo) && item.teaserVideo.length > 0) {
      return typeof item.teaserVideo[0] === "string" ? item.teaserVideo[0] : item.teaserVideo[0]?.url || "";
    }
    if (typeof item.teaserVideo === "string") return item.teaserVideo;
    if (Array.isArray(item.seasons)) {
      for (const s of item.seasons) {
        if (Array.isArray(s.episodes)) {
          for (const ep of s.episodes) {
            const epUrl = ep.videoUrl || ep.video?.url || ep.video;
            if (epUrl) return typeof epUrl === "string" ? epUrl : epUrl?.url || "";
          }
        }
      }
    }
    return "";
  };

  const playableUrl = view ? resolveMediaUrl(getPlayableVideoUrl(view)) : "";

  return (
    <>
      <PageHeader
        title="Content Library"
        description="Catalog of movies, series, and originals across Uthsava Studio."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: "/content-approval" })}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shadow-xs"
            >
              Review Pending
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setOpenAdd(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer shadow-md shadow-primary/20"
            >
              Upload Content
            </button>
          </div>
        }
      />

      {/* 5-Card Top Summary Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { l: "Total Titles", v: rows.length.toLocaleString(), tone: "text-foreground" },
          {
            l: "Movies",
            v: rows.filter((r) => String(r.type).toUpperCase() === "MOVIE").length.toLocaleString(),
            tone: "text-foreground",
          },
          {
            l: "Series & Episodic",
            v: rows.filter((r) => String(r.type).toUpperCase() === "SERIES").length.toLocaleString(),
            tone: "text-foreground",
          },
          {
            l: "Pending Review",
            v: rows.filter((r) => r.approvalStatus === "PENDING" || r.approvalStatus === "AWAITING").length.toLocaleString(),
            tone: "text-amber-500",
          },
          {
            l: "Active in Live App",
            v: rows.filter((r) => r.status === "Active").length.toLocaleString(),
            tone: "text-emerald-500",
          },
        ].map((s) => (
          <Surface key={s.l} className="p-4 rounded-2xl border border-border bg-card shadow-xs">
            <div className="text-xs font-medium text-muted-foreground">{s.l}</div>
            <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.v}</div>
          </Surface>
        ))}
      </div>

      {/* Data Table with Rich Filters and Search */}
      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        searchKeys={["title", "producer"]}
        filters={[
          { label: "Type", key: "type", options: ["All", "Movie", "Series"] },
          { label: "Genre", key: "genres", options: ["All", ...availableGenres] },
          { label: "Language", key: "language", options: ["All", ...availableLanguages] },
          {
            label: "Approval",
            key: "approvalStatus",
            options: ["All", "Approved", "Awaiting", "On Hold (24h)", "Re-edit Requested", "Rejected", "Draft"],
          },
          {
            label: "Status",
            key: "status",
            options: ["All", "Published", "Draft", "Suspended", "Rejected", "Pending", "Active", "Inactive"],
          },
        ]}
        primaryAction={{
          label: "Upload Content",
          onClick: () => {
            setEditingItem(null);
            setOpenAdd(true);
          },
        }}
        rowActions={actions}
        onRowClick={(r) => {
          setIsPlayingInSheet(false);
          setView(r);
        }}
        emptyState={{
          title: "Library is empty",
          description: "Upload your first title to start streaming on Uthsava.",
          ctaLabel: "Upload Content",
          onCta: () => {
            setEditingItem(null);
            setOpenAdd(true);
          },
        }}
      />

      {/* Add / Edit Content Dialog */}
      <AddContentDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        onCreate={handleSaveContent}
        initialData={editingItem}
      />

      {/* View Details Sheet (Play Video directly in place) */}
      <ViewSheet
        open={!!view}
        onOpenChange={(o) => {
          if (!o) {
            setIsPlayingInSheet(false);
            setView(null);
          }
        }}
        title={view?.title ?? ""}
        subtitle={
          view
            ? `${view.type} · ${view.genres?.join(", ") || "General"} · ${view.language?.join(", ") || "Hindi"}`
            : ""
        }
        status={view?.status}
        hero={
          view ? (
            <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-neutral-950 border border-border shadow-inner">
              {isPlayingInSheet ? (
                playableUrl ? (
                  <div className="relative h-full w-full bg-black">
                    <video
                      src={playableUrl}
                      controls
                      autoPlay
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPlayingInSheet(false)}
                      className="absolute top-2 right-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black transition cursor-pointer"
                      title="Close Video"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-full w-full grid place-items-center bg-black p-4 text-center">
                    <div>
                      <Video className="h-8 w-8 mx-auto mb-2 text-destructive opacity-80" />
                      <p className="text-xs font-semibold text-white">No trailer or master video available for this title</p>
                      <button
                        type="button"
                        onClick={() => setIsPlayingInSheet(false)}
                        className="mt-3 inline-flex h-7 items-center rounded-lg bg-secondary px-3 text-[11px] font-medium text-foreground hover:bg-secondary/80 cursor-pointer"
                      >
                        Back to Banner
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  {viewHeroUrl ? (
                    <img src={viewHeroUrl} alt={view.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-900 via-neutral-900 to-stone-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 grid place-items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (playableUrl) {
                          setIsPlayingInSheet(true);
                        } else {
                          toast.error("No trailer or video stream available for this title.");
                        }
                      }}
                      className="grid h-12 w-12 place-items-center rounded-full bg-[#e50914] text-white shadow-xl hover:bg-[#d00812] transition cursor-pointer"
                      title="Play Trailer in View"
                    >
                      <Play className="h-5 w-5 ml-0.5 fill-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-4 text-xs font-semibold text-white drop-shadow">
                    {view.duration} · {view.releaseYear}
                  </div>
                </>
              )}
            </div>
          ) : null
        }
        sections={
          view
            ? [
                {
                  title: "Metadata & Details",
                  rows: [
                    { label: "Content Type", value: view.type },
                    { label: "Genre", value: view.genres?.join(", ") || "General" },
                    { label: "Languages", value: view.language?.join(", ") || "Hindi" },
                    { label: "Duration", value: view.duration ?? "-" },
                    { label: "Release Year", value: view.releaseYear || 2026 },
                    { label: "Producer", value: view.producer ?? "Producer" },
                    {
                      label: "Uploaded Date",
                      value: view.createdAt ? new Date(view.createdAt).toLocaleDateString() : "-",
                    },
                    {
                      label: "Overview",
                      value: view.description || "High production master title uploaded to Uthsava Studio platform.",
                    },
                  ],
                },
                {
                  title: "Streaming Analytics",
                  rows: [
                    { label: "Total Views", value: (view.views ?? 0).toLocaleString() },
                    { label: "Revenue Generated", value: `₹${(view.revenue ?? 0).toLocaleString()}` },
                    { label: "Free Preview", value: `${view.freePreviewDuration ?? 5} minutes` },
                  ],
                },
                {
                  title: "Approval & Publication",
                  rows: [
                    { label: "Approval Status", value: <StatusPill status={view.approvalStatus} /> },
                    { label: "Publish Status", value: <StatusPill status={view.status} /> },
                    { label: "Featured in Carousel", value: view.isFeatured ? "Yes" : "No" },
                  ],
                },
              ]
            : []
        }
        actions={
          view
            ? [
                ...(String(view.approvalStatus || "").toUpperCase() !== "APPROVED"
                  ? [
                      {
                        label: "Approve Content",
                        variant: "primary" as const,
                        onClick: () => handleApprove(view),
                      },
                      {
                        label: "Reject Content",
                        variant: "destructive" as const,
                        onClick: () => handleReject(view),
                      },
                    ]
                  : []),
                {
                  label: "Edit Content",
                  onClick: () => {
                    setEditingItem(view);
                    setOpenAdd(true);
                    setView(null);
                  },
                },
              ]
            : []
        }
      />

      {/* Video Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={(o) => !o && setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-neutral-800">
          <DialogHeader className="p-4 bg-neutral-900/90 text-white">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Video className="h-5 w-5 text-red-500" />
              Trailer Preview: {previewVideo?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black grid place-items-center">
            {previewVideo?.url ? (
              <video
                src={resolveMediaUrl(previewVideo.url)}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Video className="h-10 w-10 mx-auto mb-2 opacity-40 text-red-500" />
                <p className="text-sm">No trailer video preview available for this title.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
