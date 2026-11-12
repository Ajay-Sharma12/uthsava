import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DataTable, Column, RowAction } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import {
  fetchContentGenres,
  fetchContentCategories,
  updateContentStatus,
  type ContentGenre,
  fetchSeries,
  createContent,
  updateContent,
  deleteContent,
  fetchContentById,
} from "@/lib/services/content";
import {
  Eye,
  Pencil,
  Trash2,
  Layers,
  Tv2,
  Star,
  Play,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSeriesDialog, NewSeries } from "@/components/admin/AddSeriesDialog";
import { SeasonsSheet } from "@/components/admin/SeasonsSheet";
import { ViewSheet } from "@/components/admin/ViewSheet";
import { fetchSeasons, fetchEpisodes } from "@/lib/services/series";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  displayLanguage,
  displayPrimaryLanguage,
} from "@/lib/services/content-approval";
import { toast } from "sonner";

export const Route = createFileRoute("/series")({
  head: () => ({ meta: [{ title: "Series & Episodes — Uthsava Admin" }] }),
  component: SeriesPage,
});

type S = any;

const CLOUD_FRONT_URL = "https://d1f23llskj06r6.cloudfront.net";

function getMediaUrl(path?: unknown): string {
  if (!path) return "";
  let mediaPath = "";

  if (Array.isArray(path)) {
    for (const item of path) {
      if (item) {
        if (typeof item === "string" && item.trim()) {
          mediaPath = item.trim();
          break;
        }
        if (typeof item === "object" && (item.url || item.path || item.fileUrl || item.key)) {
          mediaPath = item.url || item.path || item.fileUrl || item.key;
          break;
        }
      }
    }
  } else if (typeof path === "string") {
    mediaPath = path.trim();
  } else if (typeof path === "object") {
    const media = path as any;
    mediaPath =
      media.url ||
      media.path ||
      media.key ||
      media.fileUrl ||
      "";
  }

  if (!mediaPath || typeof mediaPath !== "string") return "";

  const markdownMatch = mediaPath.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (markdownMatch) {
    mediaPath = markdownMatch[2];
  }

  if (
    mediaPath.startsWith("http://") ||
    mediaPath.startsWith("https://") ||
    mediaPath.startsWith("blob:") ||
    mediaPath.startsWith("data:")
  ) {
    return mediaPath;
  }

  const baseUrl =
    import.meta.env.VITE_CLOUDFRONT_URL ||
    import.meta.env.VITE_MEDIA_BASE_URL ||
    CLOUD_FRONT_URL;

  const cleanPath = mediaPath.startsWith("/") ? mediaPath.slice(1) : mediaPath;
  return `${baseUrl.replace(/\/$/, "")}/${cleanPath}`;
}

function getPosterUrl(item: any): string {
  if (!item) return "";
  const candidates = [
    item.posterImage,
    item.poster,
    item.thumbnailImage,
    item.thumbnail,
    item.bannerImage,
    item.banner,
  ];

  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string" && c.trim()) {
      return getMediaUrl(c);
    }
    if (Array.isArray(c) && c.length > 0) {
      for (const sub of c) {
        if (sub) {
          const u = getMediaUrl(sub);
          if (u) return u;
        }
      }
    }
    if (typeof c === "object") {
      const u = getMediaUrl(c.url || c.fileUrl || c.path || c.key);
      if (u) return u;
    }
  }
  return "";
}

function getBannerUrl(item: any): string {
  if (!item) return "";
  const candidates = [
    item.bannerImage,
    item.banner,
    item.posterImage,
    item.poster,
    item.thumbnailImage,
    item.thumbnail,
  ];

  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string" && c.trim()) {
      const u = getMediaUrl(c);
      if (u) return u;
    }
    if (Array.isArray(c) && c.length > 0) {
      for (const sub of c) {
        const u = getMediaUrl(sub);
        if (u) return u;
      }
    }
    if (typeof c === "object") {
      const u = getMediaUrl(c.url || c.fileUrl || c.path || c.key);
      if (u) return u;
    }
  }
  return "";
}

function getPlayableVideoUrl(item: any): string {
  if (!item) return "";

  const directCandidates = [
    item.trailerUrl,
    item.videoUrl,
    item.mainVideo,
    item.trailerVideo,
    item.teaserVideo,
    item.trailer,
    item.video,
    item.videoFile,
    item.fileUrl,
    item.streamUrl,
    item.hlsUrl,
    item.mediaUrl,
  ];

  for (const c of directCandidates) {
    if (!c) continue;
    if (typeof c === "string" && c.trim()) {
      const u = getMediaUrl(c);
      if (u) return u;
    }
    if (Array.isArray(c) && c.length > 0) {
      for (const sub of c) {
        const u = getMediaUrl(sub);
        if (u) return u;
      }
    }
    if (typeof c === "object") {
      const u = getMediaUrl(c.url || c.fileUrl || c.path || c.key);
      if (u) return u;
    }
  }

  if (Array.isArray(item.seasons)) {
    for (const s of item.seasons) {
      const sCandidates = [s.trailerUrl, s.trailer, s.trailerVideo, s.videoFile, s.videoUrl];
      for (const sc of sCandidates) {
        if (sc) {
          const u = getMediaUrl(sc);
          if (u) return u;
        }
      }
      if (Array.isArray(s.episodes)) {
        for (const ep of s.episodes) {
          const epCandidates = [
            ep.videoFile,
            ep.videoUrl,
            ep.video?.url,
            ep.video,
            ep.fileUrl,
            ep.mainVideo,
            ep.videoStreamUrl,
            ep.url,
            ep.path,
          ];
          for (const epc of epCandidates) {
            if (epc) {
              const u = getMediaUrl(epc);
              if (u) return u;
            }
          }
        }
      }
    }
  }

  return "";
}

function SeriesPage() {
  const [rows, setRows] = useState<S[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<ContentGenre[]>([]);
  const [categories, setCategories] = useState<ContentGenre[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<S | null>(null);
  const [seasonsFor, setSeasonsFor] = useState<S | null>(null);
  const [view, setView] = useState<S | null>(null);
  const [isPlayingInSheet, setIsPlayingInSheet] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);

  const viewHeroUrl = view ? getBannerUrl(view) : "";
  const playableUrl = view ? getPlayableVideoUrl(view) : "";

  const load = async () => {
    setLoading(true);
    try {
      const [seriesList, genreList, categoryList] = await Promise.all([
        fetchSeries(),
        fetchContentGenres(),
        fetchContentCategories(),
      ]);

      setRows(seriesList || []);
      setGenres(genreList || []);
      setCategories(categoryList || []);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      toast.error("Failed to load series list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleViewDetails = async (r: S) => {
    try {
      const [contentRes, seasonsRes] = await Promise.allSettled([
        fetchContentById(r._id),
        fetchSeasons(r._id),
      ]);

      let data: any = { ...r };
      if (contentRes.status === "fulfilled") {
        const val: any = contentRes.value;
        const cData =
          val?.results?.content ??
          val?.results?.series ??
          val?.results ??
          val?.data?.content ??
          val?.data ??
          val;
        if (cData && typeof cData === "object") {
          data = { ...data, ...cData };
        }
      }

      if (seasonsRes.status === "fulfilled") {
        const seasonsVal = seasonsRes.value;
        const seasonsData =
          seasonsVal?.results?.seasons ??
          seasonsVal?.results ??
          seasonsVal?.data?.seasons ??
          seasonsVal?.data ??
          (Array.isArray(seasonsVal) ? seasonsVal : null);

        if (Array.isArray(seasonsData)) {
          const seasonsWithEpisodes = await Promise.all(
            seasonsData.map(async (s: any) => {
              if (Array.isArray(s.episodes) && s.episodes.length > 0) {
                return s;
              }
              try {
                const epRes = await fetchEpisodes(r._id, s._id);
                const eps =
                  epRes?.results?.episodes ??
                  epRes?.results?.episode ??
                  epRes?.results ??
                  epRes?.data?.episodes ??
                  [];
                return { ...s, episodes: eps };
              } catch {
                return s;
              }
            })
          );
          data.seasons = seasonsWithEpisodes;
        }
      }

      data.posterUrl = getPosterUrl(data);
      data.thumbnailUrl = getPosterUrl(data);
      data.bannerUrl = getBannerUrl(data);
      data.trailerUrl = getPlayableVideoUrl(data);

      setView(data);
    } catch (err) {
      console.error("View Details Error:", err);
      setView(r);
    }
  };

  const handleStatusToggle = async (series: S) => {
    try {
      const seriesId = series._id ?? series.id;
      if (!seriesId) {
        toast.error("Series ID is missing");
        return;
      }

      const rawStatus = (series.status || "").toUpperCase();
      const rawApproval = (series.approvalStatus || series.approval || "").toUpperCase();
      const isCurrentlyActive =
        rawStatus === "ACTIVE" &&
        rawApproval !== "DRAFT" &&
        series.isActive !== false &&
        !(typeof series.activeSeasons === "number" && series.totalSeasons > 0 && series.activeSeasons === 0);

      const newIsActive = !isCurrentlyActive;
      const newStatus = newIsActive ? "ACTIVE" : "DRAFT";

      await updateContentStatus(seriesId, {
        isActive: newIsActive,
        status: newStatus,
      });

      setRows((prev) =>
        prev.map((item) =>
          item._id === seriesId
            ? {
                ...item,
                status: newStatus,
                isActive: newIsActive,
                activeSeasons: newIsActive ? item.totalSeasons : 0,
                activeEpisodes: newIsActive ? item.totalEpisodes : 0,
              }
            : item
        )
      );

      if (view && view._id === seriesId) {
        setView((v: any) =>
          v
            ? {
                ...v,
                status: newStatus,
                isActive: newIsActive,
                activeSeasons: newIsActive ? v.totalSeasons : 0,
                activeEpisodes: newIsActive ? v.totalEpisodes : 0,
              }
            : null
        );
      }

      toast.success(
        newIsActive
          ? `${series.title} published and activated successfully.`
          : `${series.title} moved to draft.`
      );
    } catch (err: any) {
      console.error("Status Toggle Error:", err);
      toast.error(err?.message || "Failed to update series status");
    }
  };

  const handleCreate = async (s: NewSeries) => {
    try {
      await createContent(s as any);
      await load();
      toast.success("Series created successfully");
    } catch (error: any) {
      console.error("CREATE ERROR:", error);
      toast.error(error?.message || "Failed to create series");
      throw error;
    }
  };

  const handleUpdate = async (id: string, s: NewSeries) => {
    try {
      await updateContent(id, s as any);
      await load();

      if (view && view._id === id) {
        await handleViewDetails(view);
      }

      toast.success("Series updated successfully");
    } catch (error: any) {
      console.error("❌ Update Error:", error);
      toast.error(error?.message || "Failed to update series");
      throw error;
    }
  };

  const cols: Column<S>[] = [
    {
      key: "title",
      header: "Series",
      accessor: (r) => {
        const genreNames = (r.genres ?? [])
          .map((genre: any) => {
            if (typeof genre === "string") {
              return genres.find((g) => g._id === genre || g.name === genre)?.name ?? genre;
            }
            return genre.name ?? genres.find((g) => g._id === (genre._id ?? genre.id))?.name ?? "";
          })
          .filter(Boolean)
          .join(", ");
        const language = displayPrimaryLanguage(r.language);
        return `${r.title ?? "-"} | ${genreNames || "-"} | ${language}`;
      },
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-9 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-primary/40 via-secondary to-accent/30 text-[10px] font-bold uppercase">
            {r.title?.slice(0, 2) || "SE"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {r.title}
              {r.isFeatured && <Star className="h-3 w-3 fill-warning text-warning" />}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Tv2 className="h-3 w-3" />
              <span className="truncate">
                Series ·{" "}
                {(r.genres ?? [])
                  .map((id: any) => genres.find((g) => g._id === id || g.name === id)?.name ?? id)
                  .join(", ") || "Drama"}{" "}
                · {displayPrimaryLanguage(r.language)}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "seasons",
      header: "Seasons",
      accessor: (r) =>
        `${r.totalSeasons ?? (Array.isArray(r.seasons) && r.seasons.length > 0 ? r.seasons.length : 1)} Seasons`,
      render: (r) =>
        `${r.totalSeasons ?? (Array.isArray(r.seasons) && r.seasons.length > 0 ? r.seasons.length : 1)} Seasons`,
    },
    {
      key: "episodes",
      header: "Episodes",
      accessor: (r) => {
        let total = 0;
        if (Array.isArray(r.seasons) && r.seasons.length > 0) {
          total = r.seasons.reduce(
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
        if (total === 0 && typeof r.totalEpisodes === "number") total = r.totalEpisodes;
        return `${total || 8} Eps`;
      },
      render: (r) => {
        let total = 0;
        if (Array.isArray(r.seasons) && r.seasons.length > 0) {
          total = r.seasons.reduce(
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
        if (total === 0 && typeof r.totalEpisodes === "number") total = r.totalEpisodes;
        return `${total || 8} Eps`;
      },
    },
    {
      key: "year",
      header: "Year",
      accessor: (r) => r.releaseYear ?? "-",
      render: (r) => r.releaseYear ?? "-",
    },
    {
      key: "producer",
      header: "Producer",
      accessor: (r) =>
        r.producer ||
        (r.uploadedBy && r.uploadedBy.role !== "Admin" ? r.uploadedBy.name : "") ||
        "Uthsava Studios",
      render: (r) =>
        r.producer ||
        (r.uploadedBy && r.uploadedBy.role !== "Admin" ? r.uploadedBy.name : "") ||
        "Uthsava Studios",
    },
    {
      key: "uploaded",
      header: "Uploaded",
      accessor: (r) =>
        r.createdAt
          ? new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(r.createdAt))
          : "-",
      render: (r) =>
        r.createdAt
          ? new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(r.createdAt))
          : "-",
    },
    {
      key: "views",
      header: "Views",
      accessor: (r) => r.viewsCount ?? 0,
      render: (r) => r.viewsCount ?? 0,
    },
    {
      key: "revenue",
      header: "Revenue",
      accessor: () => "₹0",
      render: () => "₹0",
    },
    {
      key: "approval",
      header: "Approval",
      accessor: (r) => r.approvalStatus?.toUpperCase() || "PENDING",
      render: (r) => {
        const approval = (r.approvalStatus || (r as any).approval || "").toUpperCase();

        let label = "Awaiting";
        if (approval === "APPROVED") label = "Approved";
        else if (approval === "REJECTED") label = "Rejected";
        else if (approval === "ON_HOLD" || approval === "HOLD") label = "Hold (24h)";
        else if (approval === "RE_EDIT_REQUESTED" || approval === "RE_EDIT") label = "Re-edit";
        else if (approval === "DRAFT") label = "Draft";
        else label = "Awaiting";

        return <StatusPill status={label} />;
      },
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => {
        const rawStatus = (r.status || "").toUpperCase();
        const rawApproval = (r.approvalStatus || (r as any).approval || "").toUpperCase();

        if (
          rawStatus === "DRAFT" ||
          rawApproval === "DRAFT" ||
          (typeof r.activeSeasons === "number" && r.totalSeasons > 0 && r.activeSeasons === 0) ||
          (typeof r.activeEpisodes === "number" && r.totalEpisodes > 0 && r.activeEpisodes === 0)
        ) {
          return "DRAFT";
        }
        if (["PENDING", "AWAITING", "UNDER_REVIEW"].includes(rawApproval)) {
          return "PENDING";
        }
        if (rawStatus === "ACTIVE" || (rawApproval === "APPROVED" && (r as any).isActive !== false)) {
          return "ACTIVE";
        }
        return "INACTIVE";
      },
      render: (r) => {
        const rawStatus = (r.status || "").toUpperCase();
        const rawApproval = (r.approvalStatus || (r as any).approval || "").toUpperCase();
        const isPending = ["PENDING", "AWAITING", "UNDER_REVIEW"].includes(rawApproval);
        const isDraft =
          rawStatus === "DRAFT" ||
          rawApproval === "DRAFT" ||
          (typeof r.activeSeasons === "number" && r.totalSeasons > 0 && r.activeSeasons === 0) ||
          (typeof r.activeEpisodes === "number" && r.totalEpisodes > 0 && r.activeEpisodes === 0);

        let status = "inactive";
        if (isDraft) {
          status = "draft";
        } else if (isPending) {
          status = "pending";
        } else if (rawStatus === "ACTIVE" || (rawApproval === "APPROVED" && (r as any).isActive !== false)) {
          status = "active";
        } else {
          status = "inactive";
        }

        const isApproved = rawApproval === "APPROVED";

        return (
          <button
            type="button"
            title={
              !isApproved && !isDraft
                ? "Cannot be activated until the series is approved"
                : `Click to mark as ${status === "active" ? "DRAFT" : "ACTIVE"}`
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!isApproved && !isDraft) {
                toast.error("Status cannot be activated until the series is approved");
                return;
              }
              void handleStatusToggle(r);
            }}
            className="group cursor-pointer transition hover:opacity-80 active:scale-95"
          >
            <StatusPill status={status} />
          </button>
        );
      },
    },
  ];

  const actions: RowAction<S>[] = [
    {
      label: "View Details",
      icon: Eye,
      onClick: (r) => void handleViewDetails(r),
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: async (r) => {
        try {
          const [contentRes, seasonsRes] = await Promise.allSettled([
            fetchContentById(r._id),
            fetchSeasons(r._id),
          ]);

          let fullData: any = { ...r };
          if (contentRes.status === "fulfilled") {
            const val: any = contentRes.value;
            const cData =
              val?.results?.content ??
              val?.results?.series ??
              val?.results ??
              val?.data?.content ??
              val?.data ??
              val;
            if (cData && typeof cData === "object") {
              fullData = { ...fullData, ...cData };
            }
          }

          if (seasonsRes.status === "fulfilled") {
            const seasonsVal = seasonsRes.value;
            const seasonsData =
              seasonsVal?.results?.seasons ??
              seasonsVal?.results ??
              seasonsVal?.data?.seasons ??
              seasonsVal?.data ??
              (Array.isArray(seasonsVal) ? seasonsVal : null);

            if (Array.isArray(seasonsData)) {
              const seasonsWithEpisodes = await Promise.all(
                seasonsData.map(async (s: any) => {
                  if (Array.isArray(s.episodes) && s.episodes.length > 0) {
                    return s;
                  }
                  try {
                    const epRes = await fetchEpisodes(r._id, s._id);
                    const eps =
                      epRes?.results?.episodes ??
                      epRes?.results?.episode ??
                      epRes?.results ??
                      epRes?.data?.episodes ??
                      [];
                    return { ...s, episodes: eps };
                  } catch {
                    return s;
                  }
                })
              );
              fullData.seasons = seasonsWithEpisodes;
            }
          }

          setEditingSeries(fullData);
        } catch {
          setEditingSeries(r);
        }
        setOpen(true);
      },
    },
    {
      label: "Manage Seasons & Episodes",
      icon: Layers,
      onClick: (r) => {
        setSeasonsFor(r);
      },
    },
    {
      label: "Delete",
      icon: Trash2,
      destructive: true,
      onClick: async (r) => {
        try {
          await deleteContent(r._id);
          setRows((p) => p.filter((x) => x._id !== r._id));
          toast.success(`"${r.title}" deleted`);
        } catch (err: any) {
          toast.error(err?.message || "Failed to delete series");
        }
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Series & Episodes"
        description="All web series and episodic titles in the Uthsava catalog."
        actions={
          <button
            onClick={() => {
              setEditingSeries(null);
              setOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Series
          </button>
        }
      />

      {/* Stats Summary Cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {[
          { l: "Total Series", v: rows.length.toLocaleString() },
          {
            l: "Pending Approvals",
            v: rows.filter((r) =>
              ["PENDING", "AWAITING", "UNDER_REVIEW"].includes(
                (r.approvalStatus || (r as any).approval || "").toUpperCase()
              )
            ).length,
            tone: "text-warning",
          },
          {
            l: "Holded for 24hrs",
            v: rows.filter((r) =>
              ["ON_HOLD", "HOLD"].includes(
                (r.approvalStatus || (r as any).approval || "").toUpperCase()
              )
            ).length,
            tone: "text-amber-500",
          },
          {
            l: "Re-edit Requested",
            v: rows.filter(
              (r) =>
                ["RE_EDIT_REQUESTED"].includes(
                  (r.approvalStatus || (r as any).approval || "").toUpperCase()
                ) || Boolean((r as any).reEditRequestedReason)
            ).length,
            tone: "text-rose-400",
          },
          {
            l: "Published",
            v: rows.filter(
              (r) =>
                r.approvalStatus?.toUpperCase() === "APPROVED" &&
                ((r.status || "").toUpperCase() === "ACTIVE" || (r as any).isActive !== false)
            ).length,
            tone: "text-emerald-500",
          },
        ].map((s) => (
          <Surface key={s.l} className="p-4">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className={`mt-1 text-xl font-semibold ${s.tone || ""}`}>
              {loading ? <Skeleton className="h-6 w-20" /> : s.v}
            </div>
          </Surface>
        ))}
      </div>

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        exportFileName="series"
        searchKeys={["title", "producer", "genres", "language"]}
        filters={[
          {
            label: "Genre",
            options: genres.map((g) => g.name),
            getValue: (r) =>
              (r.genres ?? [])
                .map((genre: any) => {
                  if (typeof genre === "string") {
                    return genres.find((g) => g._id === genre || g.name === genre)?.name ?? genre;
                  }
                  return (
                    genre.name ??
                    genres.find((g) => g._id === (genre._id ?? genre.id))?.name ??
                    ""
                  );
                })
                .filter(Boolean)
                .join(", "),
          },
          {
            label: "Language",
            options: ["Hindi", "English", "Tamil", "Telugu", "Bengali", "Marathi"],
          },
          { label: "Year", options: ["2026", "2025", "2024", "2023", "2022", "2021"] },
          {
            label: "Approval",
            options: [
              "Approved",
              "Pending",
              "Holded for 24hrs",
              "Re-edit Requested",
              "Draft",
              "Rejected",
            ],
            getValue: (r) => {
              const status = (r.approvalStatus || (r as any).approval || "").toUpperCase();
              switch (status) {
                case "APPROVED":
                  return "Approved";
                case "PENDING":
                case "UNDER_REVIEW":
                case "AWAITING":
                  return "Pending";
                case "ON_HOLD":
                case "HOLD":
                  return "Holded for 24hrs";
                case "RE_EDIT_REQUESTED":
                  return "Re-edit Requested";
                case "DRAFT":
                  return "Draft";
                case "REJECTED":
                  return "Rejected";
                default:
                  return "Pending";
              }
            },
          },
          { label: "Status", options: ["ACTIVE", "DRAFT", "INACTIVE"] },
        ]}
        primaryAction={{
          label: "Add Series",
          onClick: () => {
            setEditingSeries(null);
            setOpen(true);
          },
        }}
        rowActions={actions}
        onRowClick={(r) => void handleViewDetails(r)}
        emptyState={{
          title: "No series yet",
          description: "Add your first series to start scheduling seasons and episodes.",
          ctaLabel: "Add Series",
          onCta: () => {
            setEditingSeries(null);
            setOpen(true);
          },
        }}
      />

      <AddSeriesDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            setEditingSeries(null);
          }
        }}
        series={editingSeries}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        genres={genres}
        categories={categories}
      />

      {seasonsFor && (
        <SeasonsSheet
          open={!!seasonsFor}
          onOpenChange={(o) => !o && setSeasonsFor(null)}
          seriesId={seasonsFor._id || seasonsFor.id || (seasonsFor as any).contentId || ""}
          seriesTitle={seasonsFor.title}
          onUpdated={async () => {
            await load();
            if (seasonsFor) {
              await handleViewDetails(seasonsFor);
            }
          }}
        />
      )}

      <ViewSheet
        open={!!view}
        onOpenChange={(o) => {
          if (!o) {
            setView(null);
            setIsPlayingInSheet(false);
          }
        }}
        title={view?.title ?? "Series Details"}
        subtitle={`Series · ${(view?.genres ?? []).map((g: any) => (typeof g === "object" ? g.name : genres.find((item) => item._id === g)?.name ?? g)).join(", ") || "Drama"} · ${displayLanguage(view?.language)}`}
        status={view?.status}
        hero={
          view ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-border shadow-lg">
              {isPlayingInSheet && playableUrl ? (
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
                    className="absolute top-3 right-3 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-medium text-white hover:bg-black transition cursor-pointer"
                  >
                    Close Player
                  </button>
                </div>
              ) : (
                <>
                  {viewHeroUrl ? (
                    <img
                      src={viewHeroUrl}
                      alt={view.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
                      <Tv2 className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute inset-0 grid place-items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (playableUrl) {
                          setIsPlayingInSheet(true);
                        } else {
                          toast.error("No trailer or video stream available for this series.");
                        }
                      }}
                      className="grid h-12 w-12 place-items-center rounded-full bg-[#e50914] text-white shadow-xl hover:bg-[#d00812] transition cursor-pointer"
                      title="Play Trailer in View"
                    >
                      <Play className="h-5 w-5 ml-0.5 fill-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-4 text-xs font-semibold text-white drop-shadow">
                    {(Array.isArray(view.seasons) && view.seasons.length > 0
                      ? view.seasons.length
                      : typeof view.totalSeasons === "number" && view.totalSeasons > 0
                      ? view.totalSeasons
                      : 1)}{" "}
                    Seasons · {view.releaseYear || 2026}
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
                    {
                      label: "Category",
                      value:
                        view.category?.name ||
                        view.category ||
                        view.categoryName ||
                        (Array.isArray(view.categories)
                          ? view.categories[0]?.name || view.categories[0]
                          : "") ||
                        "Originals",
                    },
                    {
                      label: "Genre",
                      value:
                        (view.genres ?? [])
                          .map((g: any) => {
                            if (typeof g === "object") return g.name;
                            return genres.find((item) => item._id === g)?.name ?? g;
                          })
                          .join(", ") || "-",
                    },
                    { label: "Language", value: displayLanguage(view.language) },
                    {
                      label: "Total Seasons",
                      value: (() => {
                        const totalSeasons =
                          Array.isArray(view.seasons) && view.seasons.length > 0
                            ? view.seasons.length
                            : typeof view.totalSeasons === "number" && view.totalSeasons > 0
                            ? view.totalSeasons
                            : 1;
                        return `${totalSeasons} Season${totalSeasons > 1 ? "s" : ""}`;
                      })(),
                    },
                    {
                      label: "Total Episodes",
                      value: (() => {
                        let totalEpisodes = 0;
                        if (Array.isArray(view.seasons) && view.seasons.length > 0) {
                          view.seasons.forEach((s: any) => {
                            totalEpisodes += Array.isArray(s.episodes)
                              ? s.episodes.length
                              : typeof s.totalEpisodes === "number"
                              ? s.totalEpisodes
                              : 0;
                          });
                        }
                        if (totalEpisodes === 0 && typeof view.totalEpisodes === "number") {
                          totalEpisodes = view.totalEpisodes;
                        }
                        return `${totalEpisodes || 8} Episodes`;
                      })(),
                    },
                    { label: "Release Year", value: view.releaseYear || 2026 },
                    {
                      label: "Producer",
                      value:
                        view.producer ||
                        (view.uploadedBy &&
                        view.uploadedBy.role !== "Admin" &&
                        view.uploadedBy.name !== "Admin" &&
                        view.uploadedBy.name !== "admin"
                          ? view.uploadedBy.name
                          : undefined) ||
                        "Uthsava Studios",
                    },
                    {
                      label: "Director / Showrunner",
                      value:
                        view.director ||
                        (Array.isArray(view.crew)
                          ? view.crew.find(
                              (c: any) =>
                                String(c.role).toLowerCase() === "director" ||
                                String(c.type).toUpperCase() === "CREW" ||
                                c.name
                            )?.name
                          : undefined) ||
                        (Array.isArray(view.castCrew)
                          ? view.castCrew.find(
                              (c: any) =>
                                String(c.role).toLowerCase() === "director" ||
                                String(c.type).toUpperCase() === "CREW"
                            )?.name
                          : undefined) ||
                        "-",
                    },
                    {
                      label: "Duration (per episode)",
                      value: view.duration ? `${view.duration} minutes` : "—",
                    },
                    {
                      label: "Starring Cast",
                      value: Array.isArray(view.cast)
                        ? view.cast.map((c: any) => c.name || c).join(", ")
                        : view.cast || "-",
                    },
                    {
                      label: "Uploaded Date",
                      value: view.createdAt
                        ? new Date(view.createdAt).toLocaleDateString()
                        : "-",
                    },
                    {
                      label: "Overview",
                      value:
                        view.description ||
                        view.shortDescription ||
                        "Web series master title on Uthsava Studio platform.",
                    },
                  ],
                },
                {
                  title: "Streaming Analytics",
                  rows: [
                    {
                      label: "Total Views",
                      value: (view.viewsCount ?? view.views ?? 0).toLocaleString(),
                    },
                    {
                      label: "Revenue Generated",
                      value: `₹${(view.revenue ?? 0).toLocaleString()}`,
                    },
                    {
                      label: "Free Preview",
                      value: `${view.freePreviewDuration ?? 5} minutes`,
                    },
                  ],
                },
                {
                  title: "Approval & Publication",
                  rows: [
                    {
                      label: "Approval Status",
                      value: <StatusPill status={view.approvalStatus} />,
                    },
                    {
                      label: "Publish Status",
                      value: <StatusPill status={view.status} />,
                    },
                    {
                      label: "Featured in Carousel",
                      value: view.isFeatured ? "Yes" : "No",
                    },
                  ],
                },
              ]
            : []
        }
      />

      {/* Video Modal Preview */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0 rounded-2xl bg-black border border-border">
          <DialogHeader className="p-4 bg-neutral-900 border-b border-border">
            <DialogTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Play className="h-4 w-4 text-primary fill-primary" />
              <span>{previewVideo?.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            {previewVideo && (
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
