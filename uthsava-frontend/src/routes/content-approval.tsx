import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  fetchPendingApprovals,
  fetchApprovalSummary,
  fetchApprovalStats,
  fetchApprovalDetails,
  approveContent,
  rejectContent,
  holdContent,
  requestReEdit,
  submitForReview,
} from "@/lib/services/content-approval";
import { PageHeader, Surface, StatusPill } from "@/components/admin/Primitives";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Play,
  Pause,
  Clock,
  Star,
  MessageSquare,
  Film,
  Tv,
  Video,
  Loader2,
  ChevronRight,
  Layers,
  RotateCcw,
  Calendar,
  User,
  AlertCircle,
  Sparkles,
  Info,
  Search,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Users,
  Sliders,
  FilterX,
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { QueueSkeleton, MediaDetailSkeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/content-approval")({
  head: () => ({ meta: [{ title: "Content Approval - Uthsava Admin" }] }),
  component: ApprovalPage,
});

type ApprovalStatus = "ALL" | "PENDING" | "HOLD (24h)" | "RE-EDIT" | "APPROVED" | "REJECTED";

const STORAGE_KEY = "utsava_approval_selected_content_id";
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
  return `${CLOUD_FRONT_URL}/${url.replace(/^\/+/, "")}`;
};

type QueueItem = {
  id: string;
  title: string;
  producer: string;
  type: string;
  genre: string;
  date: string;
  status: ApprovalStatus;
  rawApprovalStatus: string;
  score: number;
  description?: string;
  banner?: string;
  poster?: string;
  thumbnail?: string;
  duration?: string;
  cast?: any[];
  holdUntil?: string | null;
  rejectionReason?: string | null;
};

type PlayingVideoSource = {
  type: "TRAILER" | "EPISODE" | "MAIN";
  title: string;
  url: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeId?: string;
};

const mapApprovalStatusToTab = (rawStatus?: string, rejectionReason?: string): ApprovalStatus => {
  const upper = String(rawStatus || "").toUpperCase();
  if (upper === "APPROVED") return "APPROVED";
  if (upper === "REJECTED") return "REJECTED";
  if (upper === "ON_HOLD" || upper === "HOLD" || upper === "HOLD (24H)" || upper === "HOLD_24H") return "HOLD (24h)";
  if (upper === "RE_EDIT_REQUESTED" || upper === "RE_EDIT" || upper === "RE-EDIT" || upper === "UNDER_REVIEW") return "RE-EDIT";
  if (rejectionReason) return "REJECTED";
  return "PENDING";
};

const formatStatusForDisplay = (status?: string, rejectionReason?: string) => {
  if (!status) return rejectionReason ? "Rejected" : "Awaiting";
  const upper = String(status).toUpperCase();
  if (upper === "APPROVED") return "Approved";
  if (upper === "REJECTED") return "Rejected";
  if (upper === "ON_HOLD" || upper === "HOLD" || upper === "HOLD (24H)" || upper === "HOLD_24H") return "On Hold (24h)";
  if (upper === "RE_EDIT_REQUESTED" || upper === "RE_EDIT" || upper === "RE-EDIT" || upper === "UNDER_REVIEW") return "Re-edit Requested";
  if (upper === "DRAFT") return "Draft";
  if (upper === "PENDING" || upper === "AWAITING" || upper === "PENDING_REVIEW" || upper === "SUBMITTED") return "Awaiting";
  return rejectionReason ? "Rejected" : "Awaiting";
};

const REJECTION_REASONS = [
  { value: "quality", label: "Video / Audio Master Quality Issues" },
  { value: "copyright", label: "Copyright / Intellectual Property Violation" },
  { value: "guidelines", label: "Inappropriate Content / Community Guidelines Violation" },
  { value: "metadata", label: "Incorrect Metadata, Poster, or Cast Information" },
  { value: "episodes", label: "Missing or Corrupted Episodes / Files" },
  { value: "codec", label: "Unsupported Format, Resolution, or Audio Codec" },
  { value: "other", label: "Other / Custom Feedback (Specify in details below)" },
];

const formatApprovalDuration = (
  val?: any,
  type?: string,
  seasons?: any[],
  totalEpisodes?: number
): string => {
  if (val !== undefined && val !== null && val !== "") {
    if (typeof val === "number" && val > 0) {
      const h = Math.floor(val / 60);
      const m = val % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }
    const str = String(val).trim();
    if (str && str !== "0") {
      if (
        str.includes("h") ||
        str.includes("m") ||
        str.includes("min") ||
        str.includes("eps") ||
        str.includes("Episode")
      ) {
        return str;
      }
      const num = parseInt(str.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > 0) {
        const h = Math.floor(num / 60);
        const m = num % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
      }
      return str;
    }
  }

  const isSeries = (type || "").toUpperCase().includes("SERIES");
  if (isSeries) {
    if (Array.isArray(seasons) && seasons.length > 0) {
      let totalMins = 0;
      let totalEps = 0;
      for (const s of seasons) {
        if (Array.isArray(s.episodes)) {
          totalEps += s.episodes.length;
          for (const ep of s.episodes) {
            if (typeof ep.duration === "number") totalMins += ep.duration;
            else if (typeof ep.duration === "string") {
              const m = parseInt(ep.duration.replace(/[^0-9]/g, ""), 10);
              if (!isNaN(m)) totalMins += m;
            }
          }
        }
      }
      if (totalMins > 0) {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
      }
      if (totalEps > 0) return `${totalEps} Episodes`;
    }
    if (totalEpisodes && totalEpisodes > 0) return `${totalEpisodes} Episodes`;
  }

  return "—";
};

function ApprovalPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  
  // 1. Initialize selectedId from URL search param or localStorage so it survives page refreshes and route changes
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get("selectedId") || urlParams.get("id");
      if (fromUrl) return fromUrl;
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ApprovalStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [ageRating, setAgeRating] = useState("KIDS");

  // Rejection Dialog states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>("");
  const [rejectFeedback, setRejectFeedback] = useState<string>("");
  const [rejectError, setRejectError] = useState<string>("");

  // Detailed content fetched from /admin/contents/:id/approval-details
  const [details, setDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Active Season tab for Series (e.g. 1 for Season 1)
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(1);

  // Video player state
  const [currentVideo, setCurrentVideo] = useState<PlayingVideoSource | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    onHold: 0,
    rate: "100%",
  });

  // Sync selectedId with localStorage and URL search params
  useEffect(() => {
    if (selectedId) {
      localStorage.setItem(STORAGE_KEY, selectedId);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.get("selectedId") !== selectedId) {
          url.searchParams.set("selectedId", selectedId);
          window.history.replaceState({}, "", url.toString());
        }
      }
    }
  }, [selectedId]);

  // Load approvals queue
  useEffect(() => {
    loadApprovals(activeTab);
  }, [activeTab]);

  const loadApprovals = async (tab: ApprovalStatus) => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 50,
      };

      if (tab === "PENDING") params.status = "pending";
      else if (tab === "APPROVED") params.status = "approved";
      else if (tab === "REJECTED") params.status = "rejected";
      else if (tab === "HOLD (24h)") params.status = "on_hold";
      else if (tab === "RE-EDIT") params.status = "re_edit_requested";

      const response = await fetchPendingApprovals(params);
      const resAny: any = response;
      const data = resAny?.results?.data ?? resAny?.data ?? (Array.isArray(resAny) ? resAny : []);
      
      const mappedItems: QueueItem[] = data.map((item: any) => {
        const rawStatus = item.approvalStatus || item.status || "PENDING";
        const mappedTabStatus = mapApprovalStatusToTab(rawStatus, item.rejectionReason);

        return {
          id: item._id ?? item.id,
          title: item.title ?? "Untitled",
          producer:
            (typeof item.producer === "string" ? item.producer : item.producer?.name) ??
            item.uploaderInfo?.fullName ??
            item.uploadedBy?.fullName ??
            item.uploadedBy?.name ??
            item.producerName ??
            "Octal Admin",
          type: item.type === "MOVIE" || item.contentType === "movie" ? "Movie" : "Series",
          genre:
            Array.isArray(item.genreDetails) && item.genreDetails.length > 0
              ? item.genreDetails.map((g: any) => g.name).join(", ")
              : Array.isArray(item.genreIds) && item.genreIds.length > 0
                ? item.genreIds.map((g: any) => g.name || g).join(", ")
                : Array.isArray(item.genres) && item.genres.length > 0
                  ? item.genres.map((g: any) => g.name || g).join(", ")
                  : Array.isArray(item.genre) && item.genre.length > 0
                    ? item.genre.join(", ")
                    : "Drama, Action",
          date: item.submissionDate ?? item.createdAt
            ? new Date(item.submissionDate ?? item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "-",
          status: mappedTabStatus,
          rawApprovalStatus: rawStatus,
          score: item.score ?? Math.floor(Math.random() * 15 + 85),
          description: item.description || item.shortDescription || "",
          banner: item.banner || item.thumbnail || item.poster || item.posterImage || item.posterUrl || "",
          poster: item.poster || item.posterImage || item.posterUrl || item.thumbnail || "",
          duration: formatApprovalDuration(item.duration, item.type || item.contentType, item.seasons, item.totalEpisodes),
          cast: item.cast || item.castAndCrew || item.castCrew || [],
          holdUntil: item.holdUntil || null,
          rejectionReason: item.rejectionReason || null,
        };
      });

      setItems(mappedItems);

      // Keep current selection from state / localStorage if available, otherwise pick first item
      const storedId = localStorage.getItem(STORAGE_KEY);
      const urlParams = new URLSearchParams(window.location.search);
      const targetId = selectedId || urlParams.get("selectedId") || storedId;

      if (targetId && mappedItems.some((i) => i.id === targetId)) {
        setSelectedId(targetId);
      } else if (targetId) {
        // Persisted ID belongs to another tab or was saved, keep it
        setSelectedId(targetId);
      } else if (mappedItems.length > 0) {
        setSelectedId(mappedItems[0].id);
      }

      // Compute stats
      const pendingCount = data.filter((i: any) => {
        const s = (i.approvalStatus || i.status || "").toUpperCase();
        return s === "PENDING" || s === "DRAFT";
      }).length;
      const approvedCount = data.filter((i: any) => (i.approvalStatus || i.status || "").toUpperCase() === "APPROVED").length;
      const rejectedCount = data.filter((i: any) => (i.approvalStatus || i.status || "").toUpperCase() === "REJECTED").length;
      const onHoldCount = data.filter((i: any) => (i.approvalStatus || i.status || "").toUpperCase() === "ON_HOLD").length;
      
      setStats({
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        onHold: onHoldCount,
        rate: approvedCount + rejectedCount > 0 
          ? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100) + "%" 
          : "100%",
      });

    } catch (error) {
      console.error("APPROVAL API ERROR:", error);
      toast.error("Failed to load approval queue");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch full approval details including seasons, episodes, videos, and trailers
  const refreshDetails = async (contentId: string) => {
    try {
      setLoadingDetails(true);
      const res = await fetchApprovalDetails(contentId);
      const resAny: any = res;
      const data = resAny?.results ?? resAny?.data ?? resAny;
      if (data) {
        setDetails(data);
        if (data.ageCategory) {
          setAgeRating(data.ageCategory.toUpperCase());
        }
        if (data.approvalNotes) {
          setNotes(data.approvalNotes);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch full approval details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    refreshDetails(selectedId);
  }, [selectedId]);

  // Selected item from mapped list or created from details fallback
  const selectedFromList = items.find((i) => i.id === selectedId);
  const selected = selectedFromList || (details ? {
    id: details._id || details.id || selectedId,
    title: details.title || "Untitled",
    producer: details.uploadedBy?.name || details.producer?.name || details.uploadedBy?.fullName || "Producer",
    type: details.contentType === "movie" || details.type === "MOVIE" ? "Movie" : "Series",
    genre: Array.isArray(details.genre) ? details.genre.join(", ") : "Drama, Action",
    date: details.submissionDate ? new Date(details.submissionDate).toLocaleDateString() : "-",
    status: mapApprovalStatusToTab(details.approvalStatus || details.status, details.rejectionReason),
    rawApprovalStatus: details.approvalStatus || details.status || "PENDING",
    score: 92,
    description: details.description || details.shortDescription || "",
    banner: details.thumbnailUrl || details.posterUrl || "",
    poster: details.posterUrl || details.thumbnailUrl || "",
    duration: formatApprovalDuration(details.duration, details.contentType || details.type, details.seasons, details.totalEpisodes),
    cast: details.castAndCrew || [],
    holdUntil: details.holdUntil || null,
    rejectionReason: details.rejectionReason || null,
  } as QueueItem : null);

  // 3. Determine available video sources and set initial playing video
  useEffect(() => {
    if (!details && !selected) {
      setCurrentVideo(null);
      setIsPlaying(false);
      return;
    }

    const isSeries = (details?.contentType || selected?.type || "").toLowerCase().includes("series");

    if (isSeries) {
      // Look for first episode with a playable video
      let firstEpVideo: PlayingVideoSource | null = null;
      if (Array.isArray(details?.seasons)) {
        for (const season of details.seasons) {
          if (Array.isArray(season.episodes)) {
            for (const ep of season.episodes) {
              const epUrl = ep.videoUrl || ep.video?.url || ep.videoFile || (typeof ep.video === "string" ? ep.video : "");
              if (epUrl) {
                firstEpVideo = {
                  type: "EPISODE",
                  title: `S${season.seasonNumber || 1} E${ep.episodeNumber || 1}: ${ep.title || "Episode"}`,
                  url: epUrl,
                  seasonNumber: season.seasonNumber || 1,
                  episodeNumber: ep.episodeNumber || 1,
                  episodeId: ep._id || ep.id,
                };
                break;
              }
            }
          }
          if (firstEpVideo) break;
        }
      }

      if (firstEpVideo) {
        setCurrentVideo(firstEpVideo);
        if (firstEpVideo.seasonNumber) {
          setActiveSeasonNumber(firstEpVideo.seasonNumber);
        }
      } else if (details?.teaserVideoUrl || (Array.isArray(details?.teaserVideo) && details.teaserVideo[0])) {
        const trailerUrl = details.teaserVideoUrl || details.teaserVideo[0];
        setCurrentVideo({
          type: "TRAILER",
          title: "Official Trailer / Teaser",
          url: trailerUrl,
        });
      } else if (details?.mainVideoUrl || details?.mainVideo) {
        setCurrentVideo({
          type: "MAIN",
          title: "Main Series Video",
          url: details.mainVideoUrl || details.mainVideo,
        });
      } else {
        setCurrentVideo(null);
      }
    } else {
      // Movie
      if (details?.mainVideoUrl || details?.mainVideo) {
        setCurrentVideo({
          type: "MAIN",
          title: "Full Feature Film",
          url: details.mainVideoUrl || details.mainVideo,
        });
      } else if (details?.teaserVideoUrl || (Array.isArray(details?.teaserVideo) && details.teaserVideo[0])) {
        setCurrentVideo({
          type: "TRAILER",
          title: "Official Movie Trailer",
          url: details.teaserVideoUrl || details.teaserVideo[0],
        });
      } else {
        setCurrentVideo(null);
      }
    }

    setIsPlaying(false);
  }, [details, selectedId]);

  const handlePlayVideo = (source?: PlayingVideoSource) => {
    if (source) {
      setCurrentVideo(source);
    }
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch((err) => {
          console.warn("Video playback requires user interaction:", err);
        });
      }
    }, 150);
  };

  // Review Actions Handlers
  const handleApprove = async () => {
    try {
      if (!selected?.id) return toast.error("No content selected");
      setActionLoading(true);
      await approveContent(selected.id, { ageCategory: ageRating as any, approvalNotes: notes });
      toast.success(`${selected.title} approved successfully`);
      await loadApprovals(activeTab);
      await refreshDetails(selected.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve content");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (!selected?.id) return toast.error("No content selected");
    const rawStatus = (details?.approvalStatus || selected?.rawApprovalStatus || selected?.status || "").toUpperCase();
    if (rawStatus === "APPROVED") {
      toast.error("Approved content cannot be rejected.");
      return;
    }
    setRejectFeedback(notes.trim() || "");
    setRejectError("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selected?.id) return toast.error("No content selected");

    let finalReason = "";
    if (selectedRejectReason && selectedRejectReason !== "other") {
      const preset = REJECTION_REASONS.find((r) => r.value === selectedRejectReason)?.label || "";
      finalReason = rejectFeedback.trim() ? `${preset} - ${rejectFeedback.trim()}` : preset;
    } else {
      finalReason = rejectFeedback.trim() || notes.trim();
    }

    if (!finalReason || finalReason.trim().length < 3) {
      setRejectError("Please select a reason from the dropdown or enter feedback (minimum 3 characters) before rejecting.");
      toast.error("Please provide or select a rejection reason for the producer.");
      return;
    }

    try {
      setActionLoading(true);
      setRejectError("");
      await rejectContent(selected.id, { rejectionReason: finalReason });
      toast.success(`${selected.title} has been rejected.`);
      setRejectModalOpen(false);
      setSelectedRejectReason("");
      setRejectFeedback("");
      setNotes("");
      await loadApprovals(activeTab);
      await refreshDetails(selected.id);
    } catch (error: any) {
      const errorMsg =
        error?.data?.errors?.rejectionReason ||
        (error?.data?.message && error.data.message !== "validation.failed" ? error.data.message : null) ||
        (error?.message && error.message !== "validation.failed" ? error.message : null) ||
        "Please provide a valid rejection reason (minimum 3 characters).";
      setRejectError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHold24h = async () => {
    try {
      if (!selected?.id) return toast.error("No content selected");
      setActionLoading(true);
      await holdContent(selected.id, { holdHours: 24, notes });
      toast.success(`${selected.title} placed on hold for 24 hours. Status set to Inactive.`);
      await loadApprovals(activeTab);
      await refreshDetails(selected.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to place content on hold");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReEdit = async () => {
    try {
      if (!selected?.id) return toast.error("No content selected");
      if (!notes.trim()) return toast.error("Please enter feedback notes for the producer before requesting re-edit");
      setActionLoading(true);
      await requestReEdit(selected.id, { reason: notes, notes });
      toast.success(`Re-edit request sent to producer for ${selected.title}`);
      await loadApprovals(activeTab);
      await refreshDetails(selected.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request re-edit");
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: ApprovalStatus[] = ["ALL", "PENDING", "HOLD (24h)", "RE-EDIT", "APPROVED", "REJECTED"];

  // Filter queue items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.producer.toLowerCase().includes(q) ||
        item.genre.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const isSeries = (details?.contentType || selected?.type || "").toLowerCase().includes("series");
  const seasons = Array.isArray(details?.seasons) ? details.seasons : [];
  const currentSeason = seasons.find((s: any) => s.seasonNumber === activeSeasonNumber) || seasons[0];
  const trailerUrl = details?.teaserVideoUrl || (Array.isArray(details?.teaserVideo) && details.teaserVideo[0]) || null;
  const movieMainVideoUrl = details?.mainVideoUrl || details?.mainVideo || null;

  const currentDisplayStatus = formatStatusForDisplay(
    details?.approvalStatus || selected?.rawApprovalStatus || selected?.status,
    details?.rejectionReason || selected?.rejectionReason || undefined
  );

  const heroImageUrl = useMemo(() => {
    const raw =
      details?.bannerUrl ||
      details?.bannerImage ||
      (Array.isArray(details?.banner) ? details.banner[0] : details?.banner) ||
      details?.posterUrl ||
      details?.posterImage ||
      (Array.isArray(details?.poster) ? details.poster[0] : details?.poster) ||
      details?.thumbnailUrl ||
      details?.thumbnailImage ||
      details?.thumbnail ||
      selected?.banner ||
      selected?.poster ||
      selected?.thumbnail ||
      "";
    return resolveMediaUrl(raw);
  }, [details, selected]);

  return (
    <>
      <PageHeader
        title="Content Approval"
        description="Review pending submissions, inspect video masters, approve releases, and communicate with producers."
      />

      {/* 5-Card Top Summary Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Pending Review</div>
          <div className="mt-1 text-2xl font-bold text-amber-500">{stats.pending}</div>
        </Surface>
        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Approved Releases</div>
          <div className="mt-1 text-2xl font-bold text-emerald-500">{stats.approved}</div>
        </Surface>
        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">On Hold (24h)</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats.onHold}</div>
        </Surface>
        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Re-edit Requested</div>
          <div className="mt-1 text-2xl font-bold text-indigo-400">
            {items.filter((i) => i.status === "RE-EDIT").length || 0}
          </div>
        </Surface>
        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-muted-foreground">Approval Rate</div>
          <div className="mt-1 text-2xl font-bold text-primary">{stats.rate}</div>
        </Surface>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr] items-start">
        {/* Left Column: Queue */}
        <Surface className="sticky top-4 flex flex-col p-3 rounded-2xl h-[calc(100vh-100px)] overflow-hidden shadow-xs">
          <div className="mb-3 flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight">Approval Queue</h3>
            </div>
            <span className="inline-flex items-center rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border/50">
              {filteredItems.length} items
            </span>
          </div>

          <div className="mb-3 px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by title, producer, genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-secondary/40 backdrop-blur-md pl-9 pr-8 py-2 text-xs placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-border/50 bg-secondary/30 p-1 scrollbar-none">
            {tabs.map((tab) => {
              const count =
                tab === "ALL"
                  ? items.length
                  : items.filter((it) => {
                      const st = (it.rawApprovalStatus || it.status || "").toUpperCase();
                      if (tab === "PENDING") return st === "PENDING" || st === "AWAITING";
                      if (tab === "HOLD (24h)") return st === "ON_HOLD" || st === "HOLD" || st === "HOLD_24H" || st === "HOLD (24H)";
                      if (tab === "RE-EDIT") return st === "RE_EDIT_REQUESTED" || st === "RE_EDIT";
                      if (tab === "APPROVED") return st === "APPROVED";
                      if (tab === "REJECTED") return st === "REJECTED";
                      return false;
                    }).length;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary/30"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  <span className="whitespace-nowrap">{tab}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shrink-0",
                        activeTab === tab
                          ? "bg-white/25 text-white"
                          : "bg-secondary text-muted-foreground border border-border/50"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <ul className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent">
            {loading ? (
              <QueueSkeleton count={6} />
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const active = selectedId === item.id;
                const displayStatus = formatStatusForDisplay(item.rawApprovalStatus || item.status, item.rejectionReason || undefined);
                const posterImg = resolveMediaUrl(item.thumbnail || item.poster || item.banner);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                      }}
                      className={cn(
                        "group relative w-full rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer overflow-hidden",
                        active
                          ? "border-primary/50 bg-primary/[0.08] dark:bg-primary/[0.14] shadow-xs ring-1 ring-primary/30"
                          : "border-border/60 bg-card/60 hover:border-border hover:bg-secondary/40 backdrop-blur-xs"
                      )}
                    >
                      {/* Left active vertical accent bar */}
                      {active && (
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-primary" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Media Poster / Icon Badge */}
                        {posterImg ? (
                          <div className="relative h-14 w-10.5 shrink-0 overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-border/60 shadow-2xs">
                            <img
                              src={posterImg}
                              alt={item.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <span
                              className={cn(
                                "absolute bottom-0 inset-x-0 py-0.5 text-[8px] font-bold text-center uppercase tracking-wider backdrop-blur-md",
                                item.type === "Movie"
                                  ? "bg-indigo-600/85 text-white"
                                  : "bg-rose-600/85 text-white"
                              )}
                            >
                              {item.type === "Movie" ? "MOV" : "SER"}
                            </span>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "grid h-14 w-10.5 shrink-0 place-items-center rounded-xl text-[10px] font-bold text-white shadow-2xs",
                              item.type === "Movie"
                                ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                                : "bg-gradient-to-br from-rose-500 to-amber-600"
                            )}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              {item.type === "Movie" ? (
                                <Film className="h-3.5 w-3.5 opacity-90" />
                              ) : (
                                <Tv className="h-3.5 w-3.5 opacity-90" />
                              )}
                              <span className="text-[9px] font-black tracking-tight">
                                {item.type === "Movie" ? "MOV" : "SER"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {item.title}
                            </span>
                            {active && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/30" />
                            )}
                          </div>

                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.producer || "Unknown Producer"}
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <StatusPill status={displayStatus} />
                            {item.genre && (
                              <span className="inline-flex items-center rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40">
                                {item.genre}
                              </span>
                            )}
                            <span className="ml-auto text-[10px] text-muted-foreground/80 font-medium">
                              {item.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center text-xs text-muted-foreground flex flex-col items-center animate-in fade-in-50 duration-200">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/80 text-muted-foreground mb-3 shadow-inner border border-border/50">
                  <FilterX className="h-5 w-5" />
                </div>
                <div className="font-semibold text-foreground text-sm">No items found</div>
                <p className="mt-1 text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                  {searchQuery
                    ? `No submissions found matching "${searchQuery}".`
                    : `No submissions found in ${activeTab} queue.`}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Clear search</span>
                  </button>
                )}
              </div>
            )}
          </ul>
        </Surface>

        {/* Right Column: Details & Video Player */}
        {loadingDetails ? (
          <MediaDetailSkeleton />
        ) : selected ? (
          <div className="space-y-4">
            <Surface className="overflow-hidden p-0 border border-border rounded-2xl shadow-sm">
              {/* VIDEO PLAYER / HERO BANNER */}
              <div className="relative h-[320px] sm:h-[380px] md:h-[440px] w-full overflow-hidden bg-neutral-950">
                {isPlaying && currentVideo?.url ? (
                  <div className="relative w-full h-full bg-black">
                    <video
                      ref={videoRef}
                      src={resolveMediaUrl(currentVideo.url)}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                      <div className="rounded-full bg-black/80 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 flex items-center gap-2 pointer-events-auto shadow-lg">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        <span>Now Playing: {currentVideo.title}</span>
                      </div>
                      <button
                        onClick={() => setIsPlaying(false)}
                        className="rounded-full bg-black/80 p-2 text-white/90 hover:text-white backdrop-blur-md border border-white/20 transition pointer-events-auto shadow-lg hover:bg-black"
                        title="Back to poster"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full overflow-hidden">
                    {/* Background poster/thumbnail image (no hover scale/zoom) */}
                    {heroImageUrl ? (
                      <img
                        src={heroImageUrl}
                        alt={selected.title}
                        className="absolute inset-0 h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-neutral-900 to-stone-900" />
                    )}

                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
                    
                    {/* Center Red Play Button */}
                    <div className="absolute inset-0 grid place-items-center">
                      {currentVideo?.url ? (
                        <button
                          onClick={() => handlePlayVideo()}
                          className="grid h-14 w-14 md:h-16 md:w-16 place-items-center rounded-full bg-[#e50914] text-white shadow-2xl hover:bg-[#d00812] transition cursor-pointer"
                          title="Play Video"
                        >
                          <Play className="h-7 w-7 ml-1 fill-white" />
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center text-white/70">
                          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                            <Video className="h-6 w-6 text-white/60" />
                          </div>
                          <span className="text-xs font-medium">No video master</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata Overlay */}
                    <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between text-white">
                      <div>
                        <div className="text-xs font-bold tracking-wider text-rose-500 uppercase">
                          {selected.type}{" "}
                          <span className="text-white/70">· {selected.genre}</span>
                        </div>
                        <div className="mt-1 text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                          {selected.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-white/95 text-slate-800 text-xs font-semibold px-3 py-1 shadow-sm border border-slate-200/50">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Quality {selected.score}/100
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Info Bar */}
              <div className="grid grid-cols-2 gap-4 border-t border-border bg-card p-4 md:grid-cols-4">
                {[
                  { label: "PRODUCER", value: selected.producer },
                  { label: "SUBMISSION DATE", value: selected.date },
                  {
                    label: "LANGUAGES",
                    value: details?.language?.length
                      ? Array.isArray(details.language)
                        ? details.language.join(", ")
                        : details.language
                      : (selected as any)?.language || "Hindi",
                  },
                  {
                    label: "DURATION / YEAR",
                    value: selected.duration && selected.duration !== "—"
                      ? `${selected.duration} (${details?.releaseYear || (selected as any)?.releaseYear || "2026"})`
                      : `${details?.releaseYear || (selected as any)?.releaseYear || "2026"}`,
                  },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {m.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold truncate text-foreground">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </Surface>

            {/* SEASONS & EPISODES / MOVIE VIDEO CONTROLS */}
            {isSeries && seasons.length > 0 && (
              <Surface className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Tv className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Series Episodes & Master Media</h3>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {seasons.length} Season{seasons.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {trailerUrl && (
                    <button
                      onClick={() => handlePlayVideo({
                        type: "TRAILER",
                        title: "Official Trailer",
                        url: trailerUrl,
                      })}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition border ${
                        currentVideo?.type === "TRAILER" && isPlaying
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
                      }`}
                    >
                      <Film className="h-3.5 w-3.5" /> Watch Trailer
                    </button>
                  )}
                </div>

                {/* Season Switcher */}
                {seasons.length > 1 && (
                  <div className="flex gap-2 border-b border-border pb-3 mb-4 overflow-x-auto">
                    {seasons.map((season: any) => {
                      const sNum = season.seasonNumber || 1;
                      const isActive = sNum === activeSeasonNumber;
                      return (
                        <button
                          key={season._id || sNum}
                          onClick={() => setActiveSeasonNumber(sNum)}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Season {sNum}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Episode List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {currentSeason?.episodes && currentSeason.episodes.length > 0 ? (
                    currentSeason.episodes.map((ep: any) => {
                      const epUrl = ep.videoUrl || ep.video?.url || ep.videoFile || (typeof ep.video === "string" ? ep.video : "");
                      const isThisEpPlaying = isPlaying && currentVideo?.episodeId === (ep._id || ep.id);
                      
                      return (
                        <div
                          key={ep._id || ep.episodeNumber}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition ${
                            isThisEpPlaying
                              ? "border-primary/60 bg-primary/10"
                              : "border-border bg-card hover:bg-secondary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary text-xs font-bold text-muted-foreground">
                              {ep.episodeNumber}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {ep.title || `Episode ${ep.episodeNumber}`}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {ep.duration && <span>{ep.duration} min</span>}
                                {epUrl ? (
                                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Master Ready
                                  </span>
                                ) : (
                                  <span className="text-amber-500">No Video File</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            {epUrl ? (
                              <button
                                onClick={() => handlePlayVideo({
                                  type: "EPISODE",
                                  title: `S${currentSeason.seasonNumber || 1} E${ep.episodeNumber}: ${ep.title || "Episode"}`,
                                  url: epUrl,
                                  seasonNumber: currentSeason.seasonNumber || 1,
                                  episodeNumber: ep.episodeNumber,
                                  episodeId: ep._id || ep.id,
                                })}
                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                  isThisEpPlaying
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                }`}
                              >
                                {isThisEpPlaying ? (
                                  <>
                                    <span className="h-2 w-2 rounded-full bg-white animate-ping" /> Playing
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3.5 w-3.5 fill-current" /> Play Episode
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Unavailable</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No episodes found for this season.
                    </div>
                  )}
                </div>
              </Surface>
            )}

            {/* MOVIE VIDEO OPTIONS */}
            {!isSeries && (movieMainVideoUrl || trailerUrl) && (
              <Surface className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Available Media:
                  </span>
                  {movieMainVideoUrl && (
                    <button
                      onClick={() => handlePlayVideo({
                        type: "MAIN",
                        title: "Full Feature Film",
                        url: movieMainVideoUrl,
                      })}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        isPlaying && currentVideo?.type === "MAIN"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      <Film className="h-3.5 w-3.5" /> Play Full Movie
                    </button>
                  )}
                  {trailerUrl && (
                    <button
                      onClick={() => handlePlayVideo({
                        type: "TRAILER",
                        title: "Official Trailer",
                        url: trailerUrl,
                      })}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition border ${
                        isPlaying && currentVideo?.type === "TRAILER"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
                      }`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Play Official Trailer
                    </button>
                  )}
                </div>
              </Surface>
            )}

            {/* SYNOPSIS, CAST & REVIEW ACTIONS */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Surface className="p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold">Synopsis & Overview</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {selected.description || "A gripping narrative exploring the complex relationships and power struggles in modern India. The story follows protagonists as they navigate through challenges that test their morals and resilience."}
                </p>
                
                {selected.holdUntil && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>On Hold:</strong> Review on hold until{" "}
                      {new Date(selected.holdUntil).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {selected.rejectionReason && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>Feedback / Rejection Reason:</strong> {selected.rejectionReason}
                    </span>
                  </div>
                )}
                
                <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mt-6 mb-3">Cast & Crew</h3>
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                  {(selected.cast && selected.cast.length > 0 ? selected.cast : [
                    { name: "Lead Actor", role: "Cast" }, 
                    { name: "Supporting Cast", role: "Cast" }, 
                    { name: "Director", role: "Director" }
                  ]).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/10 text-xs font-bold text-rose-500">
                        {p.name ? p.name.charAt(0) : "C"}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.name || "Cast Member"}</div>
                        <div className="text-[10px] text-muted-foreground">{p.role || "Cast"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface className="flex flex-col p-5 rounded-2xl border border-border/75 bg-card/90 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight leading-none text-foreground">Review Actions</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Approval & workflow suite</p>
                    </div>
                  </div>
                  <StatusPill status={currentDisplayStatus} />
                </div>

                {/* Form Controls */}
                <div className="mt-4 space-y-3.5 flex-1">
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                      <Users className="h-3 w-3 text-primary" />
                      <span>Target Age Rating</span>
                    </label>
                    <Select value={ageRating} onValueChange={setAgeRating}>
                      <SelectTrigger className="mt-1.5 h-10 w-full rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="Select age rating..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KIDS">Kids & Family (U / U/A 7+)</SelectItem>
                        <SelectItem value="TEENS">Teens (U/A 13+ / 16+)</SelectItem>
                        <SelectItem value="ADULTS">Adults Only (A / 18+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                      <MessageSquare className="h-3 w-3 text-primary" />
                      <span>Producer Feedback / Notes</span>
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter re-edit instructions, quality review feedback, or producer notes..."
                      className="mt-1.5 h-24 w-full rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 p-3 text-xs leading-relaxed placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Action Suite */}
                <div className="mt-5 pt-3.5 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Review Decision</span>
                    <span className="text-[10px] text-muted-foreground/70">Notifies producer</span>
                  </div>

                  {/* Primary Decisions: Approve & Reject */}
                  <div className={cn("grid gap-2", currentDisplayStatus === "Approved" ? "grid-cols-1" : "grid-cols-2")}>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading || currentDisplayStatus === "Approved"}
                      className={cn(
                        "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
                        currentDisplayStatus === "Approved"
                          ? "bg-emerald-600/90 cursor-default ring-1 ring-emerald-500/50 w-full"
                          : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                      )}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 stroke-[2.5]" />
                      )}
                      <span>{currentDisplayStatus === "Approved" ? "Approved" : "Approve"}</span>
                    </button>

                    {currentDisplayStatus !== "Approved" && (
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={actionLoading || currentDisplayStatus === "Rejected"}
                        className={cn(
                          "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
                          currentDisplayStatus === "Rejected"
                            ? "bg-rose-600/90 cursor-default ring-1 ring-rose-500/50"
                            : "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-rose-500/25 hover:shadow-rose-500/40"
                        )}
                      >
                        {actionLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 stroke-[2.5]" />
                        )}
                        <span>{currentDisplayStatus === "Rejected" ? "Rejected" : "Reject"}</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary: Hold for 24h */}
                  <button
                    type="button"
                    onClick={handleHold24h}
                    disabled={actionLoading || currentDisplayStatus === "On Hold (24h)"}
                    className={cn(
                      "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs",
                      currentDisplayStatus === "On Hold (24h)"
                        ? "border-amber-500/60 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
                        : "border-amber-500/35 bg-amber-500/[0.08] hover:bg-amber-500/[0.15] text-amber-700 dark:text-amber-400 hover:border-amber-500/50"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>{currentDisplayStatus === "On Hold (24h)" ? "On Hold (24h)" : "Hold for 24h"}</span>
                  </button>

                  {/* Secondary: Request Re-edit */}
                  <button
                    type="button"
                    onClick={handleRequestReEdit}
                    disabled={actionLoading || currentDisplayStatus === "Re-edit Requested"}
                    className={cn(
                      "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs",
                      currentDisplayStatus === "Re-edit Requested"
                        ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "border-indigo-500/35 bg-indigo-500/[0.08] hover:bg-indigo-500/[0.15] text-indigo-700 dark:text-indigo-400 hover:border-indigo-500/50"
                    )}
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{currentDisplayStatus === "Re-edit Requested" ? "Re-edit Requested" : "Request Re-edit"}</span>
                  </button>
                </div>
              </Surface>
            </div>
          </div>
        ) : (
          <Surface className="grid place-items-center p-6 opacity-60">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-secondary">
                <Play className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No Content Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">Select an item from the queue to review.</p>
            </div>
          </Surface>
        )}
      </div>

      {/* REJECT CONTENT DIALOG */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-lg p-6">
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-xl font-bold">Reject Content Submission</DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground">
                Please select or enter the reason for rejecting <strong className="text-foreground">"{selected?.title}"</strong>. This feedback will be sent directly to the producer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Rejection Reason Category <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedRejectReason}
                  onValueChange={(val) => {
                    setSelectedRejectReason(val);
                    if (rejectError) setRejectError("");
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select a reason for rejection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Detailed Producer Feedback & Instructions
                </label>
                <Textarea
                  value={rejectFeedback}
                  onChange={(e) => {
                    setRejectFeedback(e.target.value);
                    if (rejectError) setRejectError("");
                  }}
                  placeholder="Explain the issues found and what the producer needs to fix before resubmitting..."
                  className="h-28 resize-none text-sm"
                />
              </div>

              {rejectError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{rejectError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="h-10 px-5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/90 transition disabled:opacity-50 cursor-pointer shadow-md shadow-destructive/20"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Confirm Rejection
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
