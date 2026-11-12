import { useEffect, useState, useRef } from "react";
import {
  getPresignedUrl,
  uploadToPresignedUrl,
} from "@/lib/services/upload";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  fetchSeasons,
  fetchEpisodes,
  createSeason,
  updateSeason as updateSeasonApi,
  deleteSeason as deleteSeasonApi,
  createEpisode,
  updateEpisode as updateEpisodeApi,
  deleteEpisode as deleteEpisodeApi,
} from "@/lib/services/series";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  CalendarDays,
  Plus,
  Upload,
  Film,
  Trash2,
  Pencil,
  ListPlus,
  Loader2,
  Clock,
  CheckCircle2,
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  Sparkles,
  Check,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { StatusPill } from "./Primitives";
import { cn } from "@/lib/utils";

const inputCls =
  "h-10 w-full rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all";

const Field = ({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
      {required && <span className="text-primary">*</span>}
    </span>
    {children}
  </label>
);

const getMediaUrl = (path?: any): string => {
  if (!path) return "";

  if (Array.isArray(path) && path.length > 0) {
    for (const item of path) {
      const u = getMediaUrl(item);
      if (u) return u;
    }
    return "";
  }

  if (typeof path === "object") {
    return getMediaUrl(path.url || path.path || path.fileUrl || path.key || "");
  }

  if (typeof path !== "string") {
    return String(path);
  }

  let mediaPath = path.trim();
  if (!mediaPath) return "";

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
    "https://d1f23llskj06r6.cloudfront.net";

  const cleanPath = mediaPath.startsWith("/") ? mediaPath.slice(1) : mediaPath;
  return `${baseUrl.replace(/\/$/, "")}/${cleanPath}`;
};

export type Episode = {
  id: string;
  number: number;
  title: string;
  description?: string;
  duration: string;
  status: "Published" | "Draft" | "Scheduled";
  releaseDate: string;
  thumbnail?: string;
  videoFile?: string;
  previewDuration?: number;
  isDownloadEnabled?: boolean;
  isFeatured?: boolean;
};

export type Season = {
  id: string;
  number: number;
  title: string;
  description: string;
  duration: string;
  releaseDate: string;
  status: "Published" | "Draft";
  poster?: string;
  videoFile?: string;
  episodes: Episode[];
};

export type EpisodeFormData = Omit<
  Episode,
  "id" | "videoFile" | "thumbnailFile"
> & {
  videoFile?: File | null;
  thumbnailFile?: File | null;
};

export type SeasonFormData = {
  number: number;
  title: string;
  description: string;
  duration: string;
  releaseDate: string;
  status: "Published" | "Draft";
  posterFile?: File | null;
  videoFile?: File | null;
};

async function uploadMediaFile(file: File, typeLabel: string): Promise<string> {
  const presigned = await getPresignedUrl(file.name, file.type);
  if (!presigned?.uploadUrl) {
    throw new Error(`Failed to get upload URL for ${typeLabel}`);
  }
  await uploadToPresignedUrl(presigned.uploadUrl, file);
  return presigned.fileUrl || presigned.key || presigned.url || "";
}

export function SeasonsSheet({
  open,
  onOpenChange,
  seriesId,
  seriesTitle,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seriesId: string;
  seriesTitle: string;
  onUpdated?: () => void | Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);

  // Dialog states
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [episodeSeasonId, setEpisodeSeasonId] = useState<string | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSeasonId, setBulkSeasonId] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    type: "season" | "episode";
    title: string;
    seasonId?: string;
    episodeId?: string;
  } | null>(null);

  const loadAll = async (preferredActiveId?: string) => {
    if (!seriesId) return;
    setLoading(true);
    try {
      const seasonRes = await fetchSeasons(seriesId);
      const apiSeasons =
        seasonRes?.results?.seasons ??
        seasonRes?.results?.season ??
        seasonRes?.results ??
        seasonRes?.data?.seasons ??
        [];

      const mapped: Season[] = await Promise.all(
        apiSeasons.map(async (season: any) => {
          let episodes: any[] = [];
          try {
            const epRes = await fetchEpisodes(seriesId, season._id);
            episodes =
              epRes?.results?.episodes ??
              epRes?.results?.episode ??
              epRes?.results ??
              epRes?.data?.episodes ??
              [];
          } catch (e) {
            console.error(`Failed to fetch episodes for season ${season._id}`, e);
          }

          return {
            id: season._id,
            number: season.seasonNumber ?? 1,
            title: season.title || `Season ${season.seasonNumber ?? 1}`,
            description: season.description ?? "",
            duration: season.duration ? `${season.duration}m` : "",
            releaseDate: season.releaseDate?.slice(0, 10) ?? "",
            poster: season.poster || season.thumbnailUrl || season.thumbnail || "",
            status:
              season.status === "ACTIVE" || season.status === "PUBLISHED"
                ? "Published"
                : "Draft",
            episodes: episodes.map((ep: any) => ({
              id: ep._id,
              number: ep.episodeNumber ?? 1,
              title: ep.title || `Episode ${ep.episodeNumber ?? 1}`,
              description: ep.description ?? "",
              duration: ep.duration ? `${ep.duration}m` : "0m",
              releaseDate: ep.releaseDate?.slice(0, 10) ?? "",
              thumbnail: ep.thumbnailUrl || ep.thumbnail || "",
              videoFile: ep.videoFile || ep.videoUrl || "",
              status:
                ep.status === "ACTIVE" || ep.status === "PUBLISHED"
                  ? "Published"
                  : ep.status === "SCHEDULED"
                    ? "Scheduled"
                    : "Draft",
            })),
          };
        })
      );

      setSeasons(mapped);
      if (preferredActiveId && mapped.some((s) => s.id === preferredActiveId)) {
        setActiveId(preferredActiveId);
      } else if (mapped.length > 0) {
        setActiveId((prev) => (mapped.some((s) => s.id === prev) ? prev : mapped[0].id));
      } else {
        setActiveId(null);
      }
    } catch (err) {
      console.error("LOAD SEASONS ERROR:", err);
      toast.error("Failed to load seasons and episodes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && seriesId) {
      loadAll();
    }
  }, [open, seriesId]);

  // ==========================================
  // Season Handlers (Add, Edit, Delete)
  // ==========================================
  const handleSaveSeason = async (s: SeasonFormData) => {
    try {
      let posterKey: string | undefined = undefined;
      let videoKey: string | undefined = undefined;

      if (s.posterFile) {
        posterKey = await uploadMediaFile(s.posterFile, "Season Poster");
      }

      if (s.videoFile) {
        videoKey = await uploadMediaFile(s.videoFile, "Season Video");
      }

      const payload: any = {
        seasonNumber: s.number,
        title: s.title,
        description: s.description,
        duration: Number(String(s.duration).replace("m", "")) || 0,
        releaseDate: s.releaseDate,
        status: s.status === "Published" ? "ACTIVE" : "INACTIVE",
      };

      if (posterKey) {
        payload.poster = posterKey;
        payload.thumbnail = posterKey;
      }
      if (videoKey) {
        payload.videoFile = videoKey;
      }

      if (editingSeason) {
        await updateSeasonApi(seriesId, editingSeason.id, payload);
        toast.success(`${s.title} updated successfully`);
        await loadAll(editingSeason.id);
      } else {
        const res = await createSeason(seriesId, payload);
        const newSeasonId =
          res?.results?.season?._id ??
          res?.results?._id ??
          res?.data?._id;
        toast.success(`${s.title} added successfully`);
        await loadAll(newSeasonId);
      }

      await onUpdated?.();
      setSeasonDialogOpen(false);
      setEditingSeason(null);
    } catch (error) {
      console.error("SEASON SAVE ERROR:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save season");
    }
  };

  const handleDeleteSeason = (seasonId: string, seasonTitle: string) => {
    setConfirmDelete({
      type: "season",
      title: seasonTitle,
      seasonId,
    });
  };

  // ==========================================
  // Single Episode Handlers (Add, Edit, Delete)
  // ==========================================
  const handleSaveEpisode = async (e: EpisodeFormData) => {
    if (!episodeSeasonId) return;

    try {
      let videoKey: string | undefined = undefined;
      let thumbnailKey: string | undefined = undefined;

      if (e.videoFile) {
        videoKey = await uploadMediaFile(e.videoFile, "Episode Video");
      }

      if (e.thumbnailFile) {
        thumbnailKey = await uploadMediaFile(e.thumbnailFile, "Episode Thumbnail");
      }

      if (editingEpisode) {
        const newStatus =
          e.status === "Published"
            ? "ACTIVE"
            : e.status === "Scheduled"
              ? "SCHEDULED"
              : "INACTIVE";

        const payload: any = {
          episodeNumber: e.number,
          title: e.title,
          description: e.description ?? "",
          duration: Number(String(e.duration).replace("m", "")) || 0,
          releaseDate: e.releaseDate,
          status: newStatus,
        };

        if (videoKey) payload.videoFile = videoKey;
        if (thumbnailKey) payload.thumbnail = thumbnailKey;

        await updateEpisodeApi(seriesId, episodeSeasonId, editingEpisode.id, payload);
        toast.success("Episode updated successfully");
      } else {
        // Add flow
        if (!videoKey) {
          toast.error("Episode video file is required");
          return;
        }
        if (!thumbnailKey) {
          toast.error("Episode thumbnail image is required");
          return;
        }

        const payload = {
          episodeNumber: e.number,
          title: e.title,
          description: e.description ?? "",
          duration: Number(String(e.duration).replace("m", "")) || 0,
          releaseDate: e.releaseDate,
          videoFile: videoKey,
          thumbnail: thumbnailKey,
          status:
            e.status === "Published"
              ? "ACTIVE"
              : e.status === "Scheduled"
                ? "SCHEDULED"
                : "INACTIVE",
        };

        await createEpisode(seriesId, episodeSeasonId, payload);
        toast.success(`${e.title} added successfully`);
      }

      await loadAll(episodeSeasonId);
      await onUpdated?.();
      setEpisodeDialogOpen(false);
      setEditingEpisode(null);
    } catch (error) {
      console.error("SAVE EPISODE ERROR:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save episode");
    }
  };

  const handleDeleteEpisode = (seasonId: string, epId: string, epTitle: string) => {
    setConfirmDelete({
      type: "episode",
      title: epTitle,
      seasonId,
      episodeId: epId,
    });
  };

  const handleExecuteDelete = async () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === "season" && confirmDelete.seasonId) {
      try {
        await deleteSeasonApi(seriesId, confirmDelete.seasonId);
        toast.success(`"${confirmDelete.title}" deleted successfully`);
        await loadAll();
        await onUpdated?.();
      } catch (error) {
        console.error("DELETE SEASON ERROR:", error);
        toast.error("Failed to delete season");
      }
    } else if (
      confirmDelete.type === "episode" &&
      confirmDelete.seasonId &&
      confirmDelete.episodeId
    ) {
      try {
        await deleteEpisodeApi(seriesId, confirmDelete.seasonId, confirmDelete.episodeId);
        setSeasons((prev) =>
          prev.map((s) =>
            s.id === confirmDelete.seasonId
              ? {
                  ...s,
                  episodes: s.episodes.filter((e) => e.id !== confirmDelete.episodeId),
                }
              : s
          )
        );
        toast.success(`"${confirmDelete.title}" deleted successfully`);
        await onUpdated?.();
      } catch (error) {
        console.error("DELETE EPISODE ERROR:", error);
        toast.error("Failed to delete episode");
      }
    }

    setConfirmDelete(null);
  };

  const activeSeason = seasons.find((s) => s.id === (activeId ?? seasons[0]?.id));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" /> {seriesTitle}
            </SheetTitle>
            <SheetDescription>
              Manage seasons, single episodes, and bulk add episodes for this series.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid grid-cols-12 gap-5">
            {/* Seasons Column */}
            <aside className="col-span-12 md:col-span-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Seasons ({seasons.length})
                </h4>
                <button
                  onClick={() => {
                    setEditingSeason(null);
                    setSeasonDialogOpen(true);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/20"
                >
                  <Plus className="h-3 w-3" /> Add Season
                </button>
              </div>

              {loading && seasons.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading seasons...
                </div>
              ) : seasons.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No seasons added yet. Click "+ Add Season" to create one.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {seasons.map((s) => (
                    <li key={s.id}>
                      <div
                        onClick={() => setActiveId(s.id)}
                        className={`group flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          activeSeason?.id === s.id
                            ? "border-primary/50 bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:bg-secondary/70"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span>{s.title}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {s.episodes.length} {s.episodes.length === 1 ? "episode" : "episodes"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <StatusPill status={s.status} />
                          <button
                            type="button"
                            title="Delete Season"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSeason(s.id, s.title);
                            }}
                            className="hidden h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:grid"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Episodes Column */}
            <main className="col-span-12 md:col-span-8">
              {activeSeason ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{activeSeason.title}</h3>
                        <StatusPill status={activeSeason.status} />
                        <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-2.5">
                          <span className="text-xs text-muted-foreground">Published</span>
                          <Switch
                            checked={activeSeason.status === "Published"}
                            onCheckedChange={async (checked) => {
                              const newStatus = checked ? "ACTIVE" : "INACTIVE";
                              const nextDisplayStatus: "Published" | "Draft" = checked ? "Published" : "Draft";
                              // Optimistically update active season AND its episodes
                              setSeasons((prev) =>
                                prev.map((s) =>
                                  s.id === activeSeason.id
                                    ? {
                                        ...s,
                                        status: nextDisplayStatus,
                                        episodes: s.episodes.map((ep) => ({
                                          ...ep,
                                          status: nextDisplayStatus,
                                        })),
                                      }
                                    : s
                                )
                              );
                              try {
                                await updateSeasonApi(seriesId, activeSeason.id, {
                                  status: newStatus,
                                });
                                toast.success(
                                  `Status updated to ${nextDisplayStatus}`
                                );
                                await onUpdated?.();
                                await loadAll(activeSeason.id);
                              } catch (err) {
                                // Revert optimistic state on failure
                                await loadAll(activeSeason.id);
                                toast.error("Failed to update status");
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSeason(activeSeason);
                            setSeasonDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="Edit Season Details"
                        >
                          <Pencil className="h-3 w-3" /> Edit Season
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activeSeason.releaseDate ? `Released on ${activeSeason.releaseDate} · ` : ""}
                        {activeSeason.episodes.length} episodes total
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkSeasonId(activeSeason.id);
                          setBulkDialogOpen(true);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
                      >
                        <ListPlus className="h-3.5 w-3.5" /> Bulk Add Episodes
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingEpisode(null);
                          setEpisodeSeasonId(activeSeason.id);
                          setEpisodeDialogOpen(true);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-3 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Episode
                      </button>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {activeSeason.episodes.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition hover:border-primary/30"
                      >
                        <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-secondary">
                          {e.thumbnail ? (
                            <img
                              src={getMediaUrl(e.thumbnail)}
                              alt={e.title}
                              className="h-full w-full object-cover"
                              onError={(err) => {
                                (err.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-muted-foreground">
                              EP {e.number}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-primary">EP {e.number}:</span>
                            <span className="truncate text-sm font-medium">{e.title}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {e.releaseDate && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {e.releaseDate}
                              </span>
                            )}
                            {e.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {e.duration}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <StatusPill status={e.status} />
                          <div className="flex items-center gap-1.5 border-l border-border pl-2.5">
                            <span className="text-[10px] text-muted-foreground">Published</span>
                            <Switch
                              checked={e.status === "Published"}
                              onCheckedChange={async (checked) => {
                                const newStatus = checked ? "ACTIVE" : "INACTIVE";
                                const nextDisplayStatus: "Published" | "Draft" = checked ? "Published" : "Draft";
                                
                                setSeasons((prev) =>
                                  prev.map((s) => {
                                    if (s.id !== activeSeason.id) return s;
                                    const updatedEpisodes = s.episodes.map((ep) =>
                                      ep.id === e.id ? { ...ep, status: nextDisplayStatus } : ep
                                    );
                                    // If an episode is published, season becomes Published.
                                    // If all episodes in this season are now Draft, season becomes Draft.
                                    const anyPublished = updatedEpisodes.some((ep) => ep.status === "Published");
                                    return {
                                      ...s,
                                      status: anyPublished ? "Published" : "Draft",
                                      episodes: updatedEpisodes,
                                    };
                                  })
                                );

                                try {
                                  await updateEpisodeApi(seriesId, activeSeason.id, e.id, {
                                    status: newStatus,
                                  });
                                  toast.success(
                                    `EP ${e.number} status updated to ${nextDisplayStatus}`
                                  );
                                  await onUpdated?.();
                                  await loadAll(activeSeason.id);
                                } catch (err) {
                                  await loadAll(activeSeason.id);
                                  toast.error("Failed to update episode status");
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit Episode"
                            onClick={() => {
                              setEditingEpisode(e);
                              setEpisodeSeasonId(activeSeason.id);
                              setEpisodeDialogOpen(true);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            title="Delete Episode"
                            onClick={() => handleDeleteEpisode(activeSeason.id, e.id, e.title)}
                            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}

                    {activeSeason.episodes.length === 0 && (
                      <li className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                        <Film className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p className="font-medium text-foreground">No episodes in this season yet.</p>
                        <p className="mt-1 text-xs">
                          Click <span className="font-semibold text-primary">Add Episode</span> to add one or{" "}
                          <span className="font-semibold text-primary">Bulk Add Episodes</span> to upload multiple episodes at once.
                        </p>
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <Film className="mb-2 h-8 w-8 text-muted-foreground/40" />
                  Select or add a season on the left to view and manage its episodes.
                </div>
              )}
            </main>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.type === "season" ? "Delete Season" : "Delete Episode"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === "season"
                ? `Are you sure you want to delete "${confirmDelete?.title}"? This action cannot be undone and will permanently remove all episodes inside this season.`
                : `Are you sure you want to delete "${confirmDelete?.title}"? This video and all associated streaming media will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              {confirmDelete?.type === "season" ? "Delete Season" : "Delete Episode"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Season Dialog (Add / Edit) */}
      <SeasonDialog
        open={seasonDialogOpen}
        onOpenChange={setSeasonDialogOpen}
        nextNumber={seasons.length + 1}
        season={editingSeason}
        onSave={handleSaveSeason}
      />

      {/* Single Episode Dialog (Add / Edit) */}
      <EpisodeDialog
        open={episodeDialogOpen}
        onOpenChange={(openState) => {
          setEpisodeDialogOpen(openState);
          if (!openState) setEditingEpisode(null);
        }}
        nextNumber={
          (seasons.find((s) => s.id === episodeSeasonId)?.episodes.length ?? 0) + 1
        }
        episode={editingEpisode}
        onSave={handleSaveEpisode}
      />

      {/* Bulk Add Episodes Dialog */}
      <BulkEpisodesDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        seriesId={seriesId}
        seasonId={bulkSeasonId}
        seasonTitle={seasons.find((s) => s.id === bulkSeasonId)?.title || "Season"}
        startEpisodeNumber={
          (seasons.find((s) => s.id === bulkSeasonId)?.episodes.length ?? 0) + 1
        }
        onSuccess={async () => {
          if (bulkSeasonId) {
            await loadAll(bulkSeasonId);
          }
          await onUpdated?.();
        }}
      />
    </>
  );
}

// ==========================================
// Season Dialog Component
// ==========================================
function SeasonDialog({
  open,
  onOpenChange,
  nextNumber,
  season,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextNumber: number;
  season: Season | null;
  onSave: (s: SeasonFormData) => void | Promise<void>;
}) {
  const [v, setV] = useState<SeasonFormData>({
    number: nextNumber,
    title: `Season ${nextNumber}`,
    description: "",
    duration: "",
    releaseDate: new Date().toISOString().slice(0, 10),
    status: "Published",
    posterFile: null,
    videoFile: null,
  });

  const [posterPreview, setPosterPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (season) {
        const pUrl = season.poster ? getMediaUrl(season.poster) : "";
        setV({
          number: season.number,
          title: season.title,
          description: season.description,
          duration: season.duration ? season.duration.replace("m", "") : "",
          releaseDate: season.releaseDate || new Date().toISOString().slice(0, 10),
          status: season.status,
          posterFile: null,
          videoFile: null,
        });
        setPosterPreview(pUrl);
      } else {
        setV({
          number: nextNumber,
          title: `Season ${nextNumber}`,
          description: "",
          duration: "",
          releaseDate: new Date().toISOString().slice(0, 10),
          status: "Published",
          posterFile: null,
          videoFile: null,
        });
        setPosterPreview("");
      }
    }
  }, [open, season, nextNumber]);

  const submit = async (mode?: "draft" | "publish") => {
    if (!v.title.trim()) {
      toast.error("Season title is required");
      return;
    }

    const targetStatus =
      mode === "draft"
        ? "Draft"
        : mode === "publish"
        ? "Published"
        : v.status || "Published";

    setSaving(true);
    try {
      await onSave({
        ...v,
        status: targetStatus,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {season ? "Edit Season" : "Add New Season"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {season
              ? "Update this season's information, release date and artwork."
              : "Create a new season and configure episodes under this series."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
          <Field label="Season Number" required>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={v.number}
              onChange={(e) => setV({ ...v, number: Number(e.target.value) || 1 })}
            />
          </Field>
          <Field label="Release Date">
            <input
              type="date"
              className={inputCls}
              value={v.releaseDate}
              onChange={(e) => setV({ ...v, releaseDate: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Season Title" required>
              <input
                className={inputCls}
                placeholder="e.g., Season 1: The Beginning"
                value={v.title}
                onChange={(e) => setV({ ...v, title: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Season Synopsis">
              <textarea
                rows={3}
                placeholder="Enter storyline or arc synopsis for this season..."
                className="w-full resize-none rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                value={v.description}
                onChange={(e) => setV({ ...v, description: e.target.value })}
              />
            </Field>
          </div>

          {/* Season Poster Upload Dropzone */}
          <div className="sm:col-span-2">
            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setV((p) => ({ ...p, posterFile: file }));
                setPosterPreview(URL.createObjectURL(file));
              }}
            />
            <div
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden",
                posterPreview
                  ? "border-primary/40 bg-card/90 shadow-sm"
                  : "border-dashed border-border/80 bg-secondary/20 hover:border-primary/50 hover:bg-primary/[0.03] p-4 text-center cursor-pointer"
              )}
              onClick={() => {
                if (!posterPreview) posterInputRef.current?.click();
              }}
            >
              <div className="flex items-center justify-between gap-2 p-3 pb-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
                  SEASON POSTER
                </span>
                {posterPreview && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="h-3 w-3" /> Ready
                  </span>
                )}
              </div>

              {posterPreview ? (
                <div className="p-3 pt-2 space-y-2.5">
                  <div className="relative h-32 w-full rounded-xl overflow-hidden bg-neutral-950 border border-border/70 shadow-2xs">
                    <img
                      src={posterPreview}
                      alt="Season Poster"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-foreground">
                        {v.posterFile ? v.posterFile.name : "Season Poster Attached"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {v.posterFile ? `${(v.posterFile.size / (1024 * 1024)).toFixed(2)} MB` : "Uploaded artwork active"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          posterInputRef.current?.click();
                        }}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 text-[11px] font-semibold hover:bg-secondary hover:text-foreground transition cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setV((p) => ({ ...p, posterFile: null }));
                          setPosterPreview("");
                        }}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 transition cursor-pointer"
                        title="Remove poster"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {v.posterFile && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-500 animate-in fade-in">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Poster ready: {v.posterFile.name} ({(v.posterFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary/70 border border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/10 transition-all duration-200 shadow-2xs">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Upload Season Poster
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      640×960 px · Portrait Artwork
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      posterInputRef.current?.click();
                    }}
                    className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-3.5 text-xs font-semibold hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition cursor-pointer shadow-2xs"
                  >
                    <Upload className="h-3.5 w-3.5" /> Browse Image
                  </button>
                </div>
              )}
            </div>
          </div>

          {saving && (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/25 px-3 py-2 text-xs font-semibold text-primary animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>Saving season data & uploading media... please wait</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl border border-border/80 bg-secondary/40 px-4 text-xs font-semibold hover:bg-secondary transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit("draft")}
            className="h-10 rounded-xl border border-border/80 bg-card px-4 text-xs font-semibold hover:bg-secondary transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(season ? (v.status === "Draft" ? "draft" : "publish") : "publish")}
            className="h-10 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </span>
            ) : season ? (
              "Update Season"
            ) : (
              "Publish Season"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Single Episode Dialog Component
// ==========================================
function EpisodeDialog({
  open,
  onOpenChange,
  nextNumber,
  episode,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextNumber: number;
  episode: Episode | null;
  onSave: (e: EpisodeFormData) => void | Promise<void>;
}) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [v, setV] = useState({
    number: nextNumber,
    title: `Episode ${nextNumber}`,
    description: "",
    duration: "45",
    releaseDate: new Date().toISOString().slice(0, 10),
    preview: 2,
  });

  const [toggles, setToggles] = useState({
    download: false,
    featured: false,
    ads: true,
  });

  useEffect(() => {
    if (open) {
      setVideoFile(null);
      setThumbnailFile(null);
      if (episode) {
        const tUrl = episode.thumbnail ? getMediaUrl(episode.thumbnail) : "";
        const vUrl = episode.videoFile ? getMediaUrl(episode.videoFile) : "";
        setThumbnailPreview(tUrl);
        setVideoPreview(vUrl);
        setV({
          number: episode.number,
          title: episode.title,
          description: episode.description ?? "",
          duration: episode.duration ? episode.duration.replace("m", "") : "45",
          releaseDate: episode.releaseDate || new Date().toISOString().slice(0, 10),
          preview: episode.previewDuration ?? 2,
        });
        setToggles({
          download: episode.isDownloadEnabled ?? false,
          featured: episode.isFeatured ?? false,
          ads: true,
        });
      } else {
        setThumbnailPreview("");
        setVideoPreview("");
        setV({
          number: nextNumber,
          title: `Episode ${nextNumber}`,
          description: "",
          duration: "45",
          releaseDate: new Date().toISOString().slice(0, 10),
          preview: 2,
        });
        setToggles({
          download: false,
          featured: false,
          ads: true,
        });
      }
    }
  }, [open, episode, nextNumber]);

  const submit = async (mode: "draft" | "publish" | "scheduled") => {
    if (!v.title.trim()) {
      toast.error("Episode title is required");
      return;
    }
    if (!episode && !videoFile) {
      toast.error("Episode video file is required");
      return;
    }
    if (!episode && !thumbnailFile) {
      toast.error("Episode thumbnail is required");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        number: v.number,
        title: v.title,
        description: v.description,
        duration: `${v.duration || 0}m`,
        releaseDate: v.releaseDate || new Date().toISOString().slice(0, 10),
        status: mode === "publish" ? "Published" : mode === "scheduled" ? "Scheduled" : "Draft",
        videoFile,
        thumbnailFile,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {episode ? "Edit Episode" : "Add Episode"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {episode
              ? "Update details or media for this episode."
              : "Create and publish a new episode with video and thumbnail."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
          <Field label="Episode Number" required>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={v.number}
              onChange={(e) => setV({ ...v, number: Number(e.target.value) || 1 })}
            />
          </Field>
          <Field label="Duration (minutes)" required>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={v.duration}
              onChange={(e) => setV({ ...v, duration: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Episode Title" required>
              <input
                className={inputCls}
                placeholder="e.g., Episode 1 - The Awakening"
                value={v.title}
                onChange={(e) => setV({ ...v, title: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                rows={3}
                placeholder="Enter episode synopsis..."
                className="w-full resize-none rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                value={v.description}
                onChange={(e) => setV({ ...v, description: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Release Date">
            <input
              type="date"
              className={inputCls}
              value={v.releaseDate}
              onChange={(e) => setV({ ...v, releaseDate: e.target.value })}
            />
          </Field>
          <Field label={`Free Preview (${v.preview} min)`}>
            <input
              type="range"
              min={0}
              max={15}
              value={v.preview}
              onChange={(e) => setV({ ...v, preview: Number(e.target.value) })}
              className="mt-3 w-full accent-primary"
            />
          </Field>

          {/* Episode Thumbnail Upload Dropzone */}
          <div className="sm:col-span-2">
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setThumbnailFile(file);
                setThumbnailPreview(URL.createObjectURL(file));
              }}
            />
            <div
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden",
                thumbnailPreview
                  ? "border-primary/40 bg-card/90 shadow-sm"
                  : "border-dashed border-border/80 bg-secondary/20 hover:border-primary/50 hover:bg-primary/[0.03] p-4 text-center cursor-pointer"
              )}
              onClick={() => {
                if (!thumbnailPreview) thumbInputRef.current?.click();
              }}
            >
              <div className="flex items-center justify-between gap-2 p-3 pb-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
                  EPISODE THUMBNAIL
                </span>
                {thumbnailPreview && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="h-3 w-3" /> Ready
                  </span>
                )}
              </div>

              {thumbnailPreview ? (
                <div className="p-3 pt-2 space-y-2.5">
                  <div className="relative h-32 w-full rounded-xl overflow-hidden bg-neutral-950 border border-border/70 shadow-2xs">
                    <img
                      src={thumbnailPreview}
                      alt="Episode Thumbnail"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-foreground">
                        {thumbnailFile ? thumbnailFile.name : "Episode Thumbnail Attached"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {thumbnailFile ? `${(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB` : "Uploaded thumbnail active"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          thumbInputRef.current?.click();
                        }}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 text-[11px] font-semibold hover:bg-secondary hover:text-foreground transition cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnailFile(null);
                          setThumbnailPreview("");
                        }}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 transition cursor-pointer"
                        title="Remove thumbnail"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {thumbnailFile && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-500 animate-in fade-in">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Thumbnail attached: {thumbnailFile.name} ({(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB) — Ready</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary/70 border border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/10 transition-all duration-200 shadow-2xs">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Upload Episode Thumbnail
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      1280×720 px · 16:9 HD Artwork
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      thumbInputRef.current?.click();
                    }}
                    className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-3.5 text-xs font-semibold hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition cursor-pointer shadow-2xs"
                  >
                    <Upload className="h-3.5 w-3.5" /> Browse Image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Episode Video Upload Dropzone */}
          <div className="sm:col-span-2">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/mkv,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setVideoFile(file);
                setVideoPreview(URL.createObjectURL(file));
              }}
            />
            <div
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden",
                videoPreview
                  ? "border-primary/40 bg-card/90 shadow-sm"
                  : "border-dashed border-border/80 bg-secondary/20 hover:border-primary/50 hover:bg-primary/[0.03] p-4 text-center cursor-pointer"
              )}
              onClick={() => {
                if (!videoPreview) videoInputRef.current?.click();
              }}
            >
              <div className="flex items-center justify-between gap-2 p-3 pb-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
                  EPISODE MASTER VIDEO
                </span>
                {videoPreview && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="h-3 w-3" /> Ready
                  </span>
                )}
              </div>

              {videoPreview ? (
                <div className="p-3 pt-2 space-y-2.5">
                  <div className="relative h-32 w-full rounded-xl overflow-hidden bg-neutral-950 grid place-items-center border border-border/70 shadow-2xs">
                    <video
                      src={videoPreview}
                      className="h-full w-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-2xs">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white shadow-lg">
                        <Play className="h-4 w-4 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-foreground">
                        {videoFile ? videoFile.name : "Episode Master Video"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for stream` : "Master video stream ready"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          videoInputRef.current?.click();
                        }}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 text-[11px] font-semibold hover:bg-secondary hover:text-foreground transition cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoFile(null);
                          setVideoPreview("");
                        }}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 transition cursor-pointer"
                        title="Remove video"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {videoFile && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-500 animate-in fade-in">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Video ready: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB) — Ready to upload</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary/70 border border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/10 transition-all duration-200 shadow-2xs">
                    <VideoIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Upload Episode Video File
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      MP4, MKV, MOV · 1080p, 4K Master
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      videoInputRef.current?.click();
                    }}
                    className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-3.5 text-xs font-semibold hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition cursor-pointer shadow-2xs"
                  >
                    <Upload className="h-3.5 w-3.5" /> Browse Video
                  </button>
                </div>
              )}
            </div>
          </div>

          {[
            { k: "download", l: "Allow Offline Downloads" },
            { k: "featured", l: "Featured Episode" },
            { k: "ads", l: "Ads Enabled" },
          ].map((r) => (
            <div
              key={r.k}
              className="sm:col-span-2 flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 p-3"
            >
              <div className="text-xs font-medium text-foreground">{r.l}</div>
              <Switch
                checked={(toggles as any)[r.k]}
                onCheckedChange={(b) => setToggles((p) => ({ ...p, [r.k]: b }))}
              />
            </div>
          ))}

          {saving && (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/25 px-3 py-2 text-xs font-semibold text-primary animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>Uploading video & saving episode... please wait</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl border border-border/80 bg-secondary/40 px-4 text-xs font-semibold hover:bg-secondary transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit("draft")}
            className="h-10 rounded-xl border border-border/80 bg-card px-4 text-xs font-semibold hover:bg-secondary transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(episode ? (episode.status === "Draft" ? "draft" : "publish") : "publish")}
            className="h-10 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading & Saving...
              </span>
            ) : episode ? (
              "Update Episode"
            ) : (
              "Publish Episode"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Bulk Add Episodes Dialog Component
// ==========================================
type BulkEpisodeRow = {
  id: string;
  number: number;
  title: string;
  duration: string;
  releaseDate: string;
  status: "Published" | "Draft" | "Scheduled";
  videoFile: File | null;
  thumbnailFile: File | null;
};

function BulkEpisodesDialog({
  open,
  onOpenChange,
  seriesId,
  seasonId,
  seasonTitle,
  startEpisodeNumber,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seriesId: string;
  seasonId: string | null;
  seasonTitle: string;
  startEpisodeNumber: number;
  onSuccess: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<BulkEpisodeRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      const initial: BulkEpisodeRow[] = [
        {
          id: Math.random().toString(36).slice(2),
          number: startEpisodeNumber,
          title: `Episode ${startEpisodeNumber}`,
          duration: "45",
          releaseDate: today,
          status: "Published",
          videoFile: null,
          thumbnailFile: null,
        },
      ];
      setRows(initial);
      setIsUploading(false);
      setCurrentUploadIndex(0);
      setUploadStatusText("");
    }
  }, [open, startEpisodeNumber]);

  const addRow = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextNum = rows.length > 0 ? Math.max(...rows.map((r) => r.number)) + 1 : startEpisodeNumber;
    setRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        number: nextNum,
        title: `Episode ${nextNum}`,
        duration: "45",
        releaseDate: today,
        status: "Published",
        videoFile: null,
        thumbnailFile: null,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) {
      toast.error("At least one episode row is required");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, updates: Partial<BulkEpisodeRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  // Batch video file selection
  const handleBatchVideoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const today = new Date().toISOString().slice(0, 10);

    const newRows: BulkEpisodeRow[] = fileArray.map((file, idx) => {
      const num = startEpisodeNumber + idx;
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]/g, " ")
        .trim();

      return {
        id: Math.random().toString(36).slice(2),
        number: num,
        title: cleanName || `Episode ${num}`,
        duration: "45",
        releaseDate: today,
        status: "Published",
        videoFile: file,
        thumbnailFile: null,
      };
    });

    setRows(newRows);
    toast.success(`Generated ${newRows.length} episode entries from video files`);
  };

  const handleBulkSubmit = async () => {
    if (!seasonId) {
      toast.error("Season ID is missing");
      return;
    }

    // Validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.title.trim()) {
        toast.error(`Episode #${r.number} title is missing`);
        return;
      }
      if (!r.videoFile) {
        toast.error(`Episode #${r.number} (${r.title}) is missing video file`);
        return;
      }
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setCurrentUploadIndex(i + 1);
        setUploadStatusText(`Uploading ${i + 1}/${rows.length}: ${row.title}...`);

        // 1. Upload video
        const videoKey = await uploadMediaFile(row.videoFile!, `Video for ${row.title}`);

        // 2. Upload thumbnail or use fallback
        let thumbnailKey = "";
        if (row.thumbnailFile) {
          thumbnailKey = await uploadMediaFile(
            row.thumbnailFile,
            `Thumbnail for ${row.title}`
          );
        } else {
          // If no thumbnail, use videoKey as reference or empty
          thumbnailKey = videoKey;
        }

        // 3. Create episode via API
        const payload = {
          episodeNumber: row.number,
          title: row.title,
          description: "",
          duration: Number(String(row.duration).replace("m", "")) || 45,
          releaseDate: row.releaseDate,
          videoFile: videoKey,
          thumbnail: thumbnailKey,
          status:
            row.status === "Published"
              ? "ACTIVE"
              : row.status === "Scheduled"
                ? "SCHEDULED"
                : "INACTIVE",
        };

        await createEpisode(seriesId, seasonId, payload);
      }

      toast.success(`All ${rows.length} episodes added successfully!`);
      await onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("BULK EPISODE ERROR:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed during bulk upload"
      );
    } finally {
      setIsUploading(false);
      setUploadStatusText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={isUploading ? () => {} : onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-primary" /> Bulk Add Episodes - {seasonTitle}
          </DialogTitle>
          <DialogDescription>
            Add multiple episodes at once or batch upload videos to auto-generate episodes.
          </DialogDescription>
        </DialogHeader>

        {isUploading ? (
          <div className="my-8 flex flex-col items-center justify-center space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h4 className="text-base font-semibold text-foreground">
                Uploading & Creating Episodes
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">{uploadStatusText}</p>
            </div>
            <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(currentUploadIndex / Math.max(rows.length, 1)) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Please keep this window open while files are uploading to storage.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary">
                  <Upload className="h-3.5 w-3.5 text-primary" /> Select Multiple Video Files
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleBatchVideoFiles(e.target.files)}
                  />
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Auto-generates rows from video files
                </span>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Episode Row
              </button>
            </div>

            {/* Episodes Rows List */}
            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-border bg-card p-3.5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Episode Entry #{idx + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    {/* Ep Number */}
                    <div className="col-span-2">
                      <label className="text-[11px] font-medium text-muted-foreground">Ep #</label>
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={row.number}
                        onChange={(e) =>
                          updateRow(row.id, { number: Number(e.target.value) || 1 })
                        }
                      />
                    </div>

                    {/* Title */}
                    <div className="col-span-5">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Title *
                      </label>
                      <input
                        className={inputCls}
                        placeholder="Episode Title"
                        value={row.title}
                        onChange={(e) => updateRow(row.id, { title: e.target.value })}
                      />
                    </div>

                    {/* Duration */}
                    <div className="col-span-2">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Duration (m)
                      </label>
                      <input
                        type="number"
                        className={inputCls}
                        value={row.duration}
                        onChange={(e) => updateRow(row.id, { duration: e.target.value })}
                      />
                    </div>

                    {/* Status */}
                    <div className="col-span-3">
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Status</label>
                      <CustomSelect
                        value={row.status}
                        onChange={(val) =>
                          updateRow(row.id, {
                            status: val as "Published" | "Draft" | "Scheduled",
                          })
                        }
                        options={["Published", "Draft", "Scheduled"]}
                      />
                    </div>

                    {/* Video File Picker */}
                    <div className="col-span-6">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Video File *
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <label className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary">
                          {row.videoFile ? "Change Video" : "Browse Video"}
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) updateRow(row.id, { videoFile: file });
                            }}
                          />
                        </label>
                        <div className="min-w-0 flex-1 truncate text-xs">
                          {row.videoFile ? (
                            <span className="font-medium text-primary flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{row.videoFile.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No video selected</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail File Picker */}
                    <div className="col-span-6">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Thumbnail (Optional)
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <label className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-secondary">
                          {row.thumbnailFile ? "Change Image" : "Browse Image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) updateRow(row.id, { thumbnailFile: file });
                            }}
                          />
                        </label>
                        <div className="min-w-0 flex-1 truncate text-xs">
                          {row.thumbnailFile ? (
                            <span className="font-medium text-primary flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{row.thumbnailFile.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Optional (auto-fallback)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg border border-border bg-card px-4 text-sm hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isUploading || rows.length === 0}
            onClick={handleBulkSubmit}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading Episodes...
              </>
            ) : (
              <>
                <ListPlus className="h-4 w-4" /> Upload & Create {rows.length}{" "}
                {rows.length === 1 ? "Episode" : "Episodes"}
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


