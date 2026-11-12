import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Tv2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Film,
  Video as VideoIcon,
  Image as ImageIcon,
  CheckCircle2,
  Upload,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaUploadCard } from "@/components/admin/MediaUploadCard";
import {
  fetchContentGenres,
  fetchContentCategories,
  uploadContentFile,
  type ContentGenre,
} from "@/lib/services/content";
import { getProducers } from "@/lib/services/producers";
import { CustomSelect } from "@/components/admin/CustomSelect";

export type FormEpisode = {
  _id?: string;
  id?: string;
  episodeNumber: number;
  title: string;
  description: string;
  duration: number | string;
  videoFile?: string;
  thumbnail?: string;
  releaseDate?: string;
  uploadingVideo?: boolean;
  uploadingThumb?: boolean;
};

export type FormSeason = {
  _id?: string;
  id?: string;
  seasonNumber: number;
  title: string;
  description: string;
  episodes: FormEpisode[];
};

export type NewSeries = {
  title: string;
  category?: string;
  categories?: string[];
  genres: string[];
  language: string[];
  status?: string;
  approvalStatus?: string;
  releaseYear: number;
  releaseDate: string;
  totalSeasons: number;
  totalEpisodes: number;
  duration?: number;
  producer: string;
  director?: string;
  cast?: any;
  tags?: string | string[];
  metaTitle?: string;
  metaDesc?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  poster?: string | string[];
  banner?: string | string[];
  thumbnail?: string;
  teaserVideo?: string | string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isSubscriptionRequired?: boolean;
  isDownloadEnabled?: boolean;
  type?: string;
  seasons?: any[];
};

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";
const selectCls =
  inputCls + " appearance-none bg-no-repeat bg-[right_0.85rem_center] bg-[length:14px_14px] pr-9 cursor-pointer";
const textareaCls =
  "w-full resize-none rounded-xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";

const caretBg = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
};

const TABS = [
  "Basics",
  "Media Assets",
  "Seasons & Episodes",
  "OTT Controls",
  "SEO & Publish",
] as const;

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="mb-1.5 block text-[12px] font-medium text-foreground/80">
    {children}
    {required && <span className="ml-0.5 text-primary">*</span>}
  </label>
);

export function AddSeriesDialog({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  series,
  genres = [],
  categories = [],
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreate: (s: NewSeries) => Promise<any> | any;
  onUpdate: (id: string, s: NewSeries) => Promise<any> | any;
  series?: any;
  genres?: ContentGenre[];
  categories?: ContentGenre[];
}) {
  const [tab, setTab] = useState(0);

  const [loadedGenres, setLoadedGenres] = useState<string[]>([]);
  const [loadedCategories, setLoadedCategories] = useState<string[]>([]);
  const [loadedProducers, setLoadedProducers] = useState<string[]>([]);

  const [f, setF] = useState({
    title: "",
    shortDesc: "",
    fullDesc: "",
    category: "",
    genre: "",
    language: "",
    subtitles: "",
    rating: "",
    director: "",
    cast: "",
    tags: "",
    year: "",
    releaseDate: "",
    producer: "",
    totalSeasons: 1,
    totalEpisodes: 8,
    duration: "",
    imdb: "",
    country: "",
    trailerUrl: "",
    availability: "",
    metaTitle: "",
    metaDesc: "",
    slug: "",
  });

  const [t, setT] = useState({
    featured: false,
    trending: false,
    subRequired: false,
    download: false,
  });

  const [seasons, setSeasons] = useState<FormSeason[]>([
    {
      seasonNumber: 1,
      title: "Season 1",
      description: "",
      episodes: [
        {
          episodeNumber: 1,
          title: "Episode 1",
          description: "",
          duration: 45,
          videoFile: "",
          thumbnail: "",
          releaseDate: new Date().toISOString().split("T")[0],
        },
      ],
    },
  ]);

  const [activeSeasonIdx, setActiveSeasonIdx] = useState(0);

  const [media, setMedia] = useState({
    poster: null as File | null,
    banner: null as File | null,
    thumbnail: null as File | null,
    trailer: null as File | null,
  });

  const [uploading, setUploading] = useState(false);

  // Fetch Category, Genre, and Producer datasets from their respective modules
  useEffect(() => {
    if (open) {
      fetchContentGenres()
        .then((items) => {
          if (Array.isArray(items) && items.length > 0) {
            const names = items.map((g: any) => g.name || g.label).filter(Boolean);
            setLoadedGenres(names);
          }
        })
        .catch(() => {});

      fetchContentCategories()
        .then((items) => {
          if (Array.isArray(items) && items.length > 0) {
            const names = items.map((c: any) => c.name || c.label).filter(Boolean);
            setLoadedCategories(names);
          }
        })
        .catch(() => {});

      getProducers()
        .then((res: any) => {
          const list =
            res?.results?.data ||
            res?.results ||
            res?.data?.producers ||
            res?.data ||
            (Array.isArray(res) ? res : []);
          if (Array.isArray(list) && list.length > 0) {
            const names = list
              .map((p: any) => p.name || p.fullName || p.companyName || p.productionHouse)
              .filter(Boolean);
            setLoadedProducers(names);
          }
        })
        .catch(() => {});
    }
  }, [open, series]);

  // Prepopulate form when editing an existing series
  useEffect(() => {
    if (series && open) {
      const rawGenres = series.genres || (series.genre ? [series.genre] : []);
      let genreName = "";
      if (Array.isArray(rawGenres) && rawGenres.length > 0) {
        const first = rawGenres[0];
        if (typeof first === "object" && first !== null) {
          genreName = first.name || first.label || "";
        } else if (typeof first === "string") {
          const found = genres?.find(
            (item) => item._id === first || item.name?.toLowerCase() === first.toLowerCase()
          );
          genreName = found?.name ?? first;
        }
      }

      let catVal = "";
      if (typeof series.category === "string") {
        catVal = series.category;
      } else if (series.category && typeof series.category === "object") {
        catVal =
          (series.category as any).name ||
          (series.category as any).title ||
          (series.category as any).label ||
          (series.category as any)._id ||
          "";
      } else if (typeof series.categoryName === "string") {
        catVal = series.categoryName;
      } else if (Array.isArray(series.categories) && series.categories.length > 0) {
        const first = series.categories[0];
        if (typeof first === "string") {
          catVal = first;
        } else if (first && typeof first === "object") {
          catVal =
            (first as any).name ||
            (first as any).title ||
            (first as any).label ||
            (first as any)._id ||
            "";
        }
      }

      const prodVal =
        series.producer ||
        (series.uploadedBy &&
        series.uploadedBy.role !== "Admin" &&
        series.uploadedBy.name !== "Admin" &&
        series.uploadedBy.name !== "admin"
          ? series.uploadedBy.companyName ||
            series.uploadedBy.fullName ||
            series.uploadedBy.name
          : undefined) ||
        "Uthsava Studios";

      const dirVal =
        series.director ||
        (Array.isArray(series.crew)
          ? series.crew.find(
              (c: any) =>
                String(c.role).toLowerCase() === "director" ||
                String(c.type).toUpperCase() === "CREW" ||
                c.name
            )?.name
          : "") ||
        (Array.isArray(series.castCrew)
          ? series.castCrew.find(
              (c: any) =>
                String(c.role).toLowerCase() === "director" ||
                String(c.type).toUpperCase() === "CREW"
            )?.name
          : "") ||
        "";

      const durationVal =
        series.duration !== undefined &&
        series.duration !== null &&
        String(series.duration) !== ""
          ? String(series.duration)
          : series.durationInMinutes !== undefined &&
            series.durationInMinutes !== null
          ? String(series.durationInMinutes)
          : "";

      let relDate = "";
      if (series.releaseDate) {
        try {
          relDate = new Date(series.releaseDate).toISOString().split("T")[0];
        } catch {
          relDate = String(series.releaseDate);
        }
      }

      // Populate seasons & episodes
      let loadedSeasons: FormSeason[] = [];
      if (Array.isArray(series.seasons) && series.seasons.length > 0) {
        loadedSeasons = series.seasons.map((s: any, sIdx: number) => ({
          _id: s._id || s.id,
          seasonNumber: s.seasonNumber || sIdx + 1,
          title: s.title || `Season ${sIdx + 1}`,
          description: s.description || "",
          episodes: Array.isArray(s.episodes) && s.episodes.length > 0
            ? s.episodes.map((ep: any, epIdx: number) => ({
                _id: ep._id || ep.id,
                episodeNumber: ep.episodeNumber || epIdx + 1,
                title: ep.title || `Episode ${epIdx + 1}`,
                description: ep.description || "",
                duration: ep.duration || 45,
                videoFile: ep.videoFile || ep.video || ep.videoUrl || "",
                thumbnail: ep.thumbnail || ep.thumbnailUrl || ep.thumbnailImage || "",
                releaseDate: ep.releaseDate
                  ? new Date(ep.releaseDate).toISOString().split("T")[0]
                  : relDate || new Date().toISOString().split("T")[0],
              }))
            : [
                {
                  episodeNumber: 1,
                  title: "Episode 1",
                  description: "",
                  duration: 45,
                  videoFile: "",
                  thumbnail: "",
                  releaseDate: relDate || new Date().toISOString().split("T")[0],
                },
              ],
        }));
      } else {
        const totalS = Number(series.totalSeasons) || 1;
        const totalEp = Number(series.totalEpisodes) || 8;
        const epPerS = Math.max(1, Math.round(totalEp / totalS));
        loadedSeasons = Array.from({ length: totalS }, (_, i) => ({
          seasonNumber: i + 1,
          title: `Season ${i + 1}`,
          description: "",
          episodes: Array.from({ length: epPerS }, (_, j) => ({
            episodeNumber: j + 1,
            title: `Episode ${j + 1}`,
            description: "",
            duration: 45,
            videoFile: "",
            thumbnail: "",
            releaseDate: relDate || new Date().toISOString().split("T")[0],
          })),
        }));
      }

      setSeasons(loadedSeasons);
      setActiveSeasonIdx(0);

      const computedEpisodes = loadedSeasons.reduce(
        (sum, s) => sum + s.episodes.length,
        0
      );

      setF({
        title: series.title || "",
        shortDesc: series.shortDescription || series.shortDesc || "",
        fullDesc: series.description || series.fullDesc || "",
        category: catVal,
        genre: genreName,
        language: Array.isArray(series.language)
          ? series.language[0] || "Hindi"
          : series.language || "Hindi",
        subtitles: Array.isArray(series.subtitles)
          ? series.subtitles.join(", ")
          : series.subtitles || "English, Hindi",
        rating: series.ageRating || series.rating || "U/A",
        director: dirVal,
        cast: Array.isArray(series.cast)
          ? series.cast.map((c: any) => c.name || c).join(", ")
          : series.cast || "",
        tags: Array.isArray(series.tags) ? series.tags.join(", ") : series.tags || "",
        year: String(series.releaseYear || 2026),
        releaseDate: relDate || new Date().toISOString().split("T")[0],
        producer: prodVal,
        totalSeasons: loadedSeasons.length || 1,
        totalEpisodes: computedEpisodes || 8,
        duration: durationVal,
        imdb: series.imdb?.rating ? String(series.imdb.rating) : "8.5",
        country: series.country || "India",
        trailerUrl: Array.isArray(series.teaserVideo)
          ? series.teaserVideo[0] || ""
          : series.teaserVideo || series.trailerUrl || "",
        availability:
          series.isSubscriptionRequired === false || series.isFree ? "Free" : "Subscription",
        metaTitle: series.metaTitle || series.title || "",
        metaDesc: series.metaDesc || series.description || "",
        slug: series.slug || "",
      });

      setT({
        featured: series.isFeatured || false,
        trending: series.isTrending || false,
        subRequired:
          series.isSubscriptionRequired !== undefined ? series.isSubscriptionRequired : true,
        download: series.isDownloadEnabled !== undefined ? series.isDownloadEnabled : true,
      });

      setMedia({
        poster: null,
        banner: null,
        thumbnail: null,
        trailer: null,
      });
    } else if (!series && open) {
      const defaultSeasons: FormSeason[] = [
        {
          seasonNumber: 1,
          title: "Season 1",
          description: "",
          episodes: Array.from({ length: 4 }, (_, j) => ({
            episodeNumber: j + 1,
            title: `Episode ${j + 1}`,
            description: "",
            duration: 45,
            videoFile: "",
            thumbnail: "",
            releaseDate: new Date().toISOString().split("T")[0],
          })),
        },
      ];

      setSeasons(defaultSeasons);
      setActiveSeasonIdx(0);

      setF({
        title: "",
        shortDesc: "",
        fullDesc: "",
        category: "",
        genre: "",
        language: "",
        subtitles: "",
        rating: "",
        director: "",
        cast: "",
        tags: "",
        year: "",
        releaseDate: "",
        producer: "",
        totalSeasons: 1,
        totalEpisodes: 4,
        duration: "",
        imdb: "",
        country: "",
        trailerUrl: "",
        availability: "",
        metaTitle: "",
        metaDesc: "",
        slug: "",
      });

      setT({
        featured: false,
        trending: false,
        subRequired: false,
        download: false,
      });

      setMedia({
        poster: null,
        banner: null,
        thumbnail: null,
        trailer: null,
      });
      setTab(0);
    }
  }, [series, open]);

  // Season and Episode mutations
  const handleAddSeason = () => {
    const nextSeasonNum = seasons.length + 1;
    const newSeason: FormSeason = {
      seasonNumber: nextSeasonNum,
      title: `Season ${nextSeasonNum}`,
      description: "",
      episodes: [
        {
          episodeNumber: 1,
          title: "Episode 1",
          description: "",
          duration: 45,
          videoFile: "",
          thumbnail: "",
          releaseDate: f.releaseDate || new Date().toISOString().split("T")[0],
        },
      ],
    };

    const updated = [...seasons, newSeason];
    setSeasons(updated);
    setActiveSeasonIdx(updated.length - 1);
    const totalEps = updated.reduce((acc, s) => acc + s.episodes.length, 0);
    setF((prev) => ({
      ...prev,
      totalSeasons: updated.length,
      totalEpisodes: totalEps,
    }));
    toast.success(`Season ${nextSeasonNum} added`);
  };

  const handleRemoveSeason = (sIdx: number) => {
    if (seasons.length <= 1) {
      toast.error("A series must have at least one season");
      return;
    }

    const updated = seasons
      .filter((_, idx) => idx !== sIdx)
      .map((s, idx) => ({ ...s, seasonNumber: idx + 1 }));

    setSeasons(updated);
    setActiveSeasonIdx(Math.max(0, sIdx - 1));
    const totalEps = updated.reduce((acc, s) => acc + s.episodes.length, 0);
    setF((prev) => ({
      ...prev,
      totalSeasons: updated.length,
      totalEpisodes: totalEps,
    }));
    toast.success("Season removed");
  };

  const handleAddEpisode = (sIdx: number) => {
    const currentSeason = seasons[sIdx];
    if (!currentSeason) return;

    const nextEpNum = currentSeason.episodes.length + 1;
    const newEp: FormEpisode = {
      episodeNumber: nextEpNum,
      title: `Episode ${nextEpNum}`,
      description: "",
      duration: 45,
      videoFile: "",
      thumbnail: "",
      releaseDate: f.releaseDate || new Date().toISOString().split("T")[0],
    };

    const updated = seasons.map((s, idx) =>
      idx === sIdx
        ? { ...s, episodes: [...s.episodes, newEp] }
        : s
    );

    setSeasons(updated);
    const totalEps = updated.reduce((acc, s) => acc + s.episodes.length, 0);
    setF((prev) => ({ ...prev, totalEpisodes: totalEps }));
    toast.success(`Episode ${nextEpNum} added to Season ${currentSeason.seasonNumber}`);
  };

  const handleRemoveEpisode = (sIdx: number, epIdx: number) => {
    const currentSeason = seasons[sIdx];
    if (!currentSeason) return;

    if (currentSeason.episodes.length <= 1) {
      toast.error("Each season must have at least one episode");
      return;
    }

    const updatedEpisodes = currentSeason.episodes
      .filter((_, idx) => idx !== epIdx)
      .map((ep, idx) => ({ ...ep, episodeNumber: idx + 1 }));

    const updated = seasons.map((s, idx) =>
      idx === sIdx ? { ...s, episodes: updatedEpisodes } : s
    );

    setSeasons(updated);
    const totalEps = updated.reduce((acc, s) => acc + s.episodes.length, 0);
    setF((prev) => ({ ...prev, totalEpisodes: totalEps }));
    toast.success("Episode removed");
  };

  const updateSeasonField = (sIdx: number, key: keyof FormSeason, val: any) => {
    setSeasons((prev) =>
      prev.map((s, idx) => (idx === sIdx ? { ...s, [key]: val } : s))
    );
  };

  const updateEpisodeField = (
    sIdx: number,
    epIdx: number,
    key: keyof FormEpisode,
    val: any
  ) => {
    setSeasons((prev) =>
      prev.map((s, idx) =>
        idx === sIdx
          ? {
              ...s,
              episodes: s.episodes.map((ep, eIdx) =>
                eIdx === epIdx ? { ...ep, [key]: val } : ep
              ),
            }
          : s
      )
    );
  };

  const handleEpisodeFileUpload = async (
    sIdx: number,
    epIdx: number,
    file: File,
    type: "video" | "thumbnail"
  ) => {
    const loadingKey = type === "video" ? "uploadingVideo" : "uploadingThumb";
    updateEpisodeField(sIdx, epIdx, loadingKey, true);

    try {
      toast.info(`Uploading episode ${type}...`);
      const uploadedUrl = await uploadContentFile(
        file,
        type === "video" ? "episodes" : "thumbnails"
      );
      if (type === "video") {
        updateEpisodeField(sIdx, epIdx, "videoFile", uploadedUrl);
      } else {
        updateEpisodeField(sIdx, epIdx, "thumbnail", uploadedUrl);
      }
      toast.success(`Episode ${type} uploaded successfully`);
    } catch (err: any) {
      console.error(`Failed to upload episode ${type}:`, err);
      toast.error(err?.message || `Failed to upload episode ${type}`);
    } finally {
      updateEpisodeField(sIdx, epIdx, loadingKey, false);
    }
  };

  const categoryOptions = useMemo(() => {
    const list = loadedCategories.length > 0 ? [...loadedCategories] : [];
    const catStr = typeof f.category === "string" ? f.category.trim() : "";
    if (catStr && !list.includes(catStr)) {
      list.unshift(catStr);
    }
    return Array.from(
      new Set(
        list.map((c) =>
          typeof c === "object" && c
            ? (c as any).name || (c as any).label || (c as any)._id || String(c)
            : String(c)
        )
      )
    ).filter(Boolean);
  }, [loadedCategories, f.category]);

  const genreOptions = useMemo(() => {
    const combined = Array.from(
      new Set([
        ...loadedGenres,
        ...(genres && genres.length > 0
          ? genres.map((g) => (typeof g === "object" ? g.name || (g as any).label : String(g)))
          : []),
      ])
    ).filter(Boolean);

    const genreStr = typeof f.genre === "string" ? f.genre.trim() : "";
    if (genreStr && !combined.includes(genreStr)) {
      combined.unshift(genreStr);
    }
    return Array.from(new Set(combined)).filter(Boolean);
  }, [genres, loadedGenres, f.genre]);

  const producerOptions = useMemo(() => {
    const list = [
      ...loadedProducers,
      "Uthsava Studios",
      "Excel Entertainment",
      "Balaji Telefilms",
      "Dharma Productions",
      "Red Chillies",
      "YRF Entertainment",
    ];
    const prodStr = typeof f.producer === "string" ? f.producer.trim() : "";
    if (prodStr && !list.includes(prodStr)) {
      list.unshift(prodStr);
    }
    return Array.from(new Set(list)).filter(Boolean);
  }, [loadedProducers, f.producer]);

  const upd = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const setMediaFile = (
    key: "poster" | "banner" | "thumbnail" | "trailer",
    file: File | null
  ) => {
    setMedia((current) => ({ ...current, [key]: file }));
  };

  const handleSubmit = async (targetApproval: "DRAFT" | "PENDING" | "APPROVED") => {
    if (!f.title.trim()) {
      toast.error("Series title is required");
      setTab(0);
      return;
    }

    if (!f.category) {
      toast.error("Content category is required");
      setTab(0);
      return;
    }

    if (!f.genre) {
      toast.error("Primary genre is required");
      setTab(0);
      return;
    }

    if (!f.releaseDate) {
      toast.error("Release date is required");
      setTab(0);
      return;
    }

    try {
      setUploading(true);

      const mediaUrls: {
        poster?: string;
        banner?: string;
        thumbnail?: string;
        trailer?: string;
      } = {};

      const uploadTasks: Promise<void>[] = [];

      if (media.poster) {
        uploadTasks.push(
          uploadContentFile(media.poster, "posters").then((url) => {
            mediaUrls.poster = url;
          })
        );
      }

      if (media.banner) {
        uploadTasks.push(
          uploadContentFile(media.banner, "banners").then((url) => {
            mediaUrls.banner = url;
          })
        );
      }

      if (media.thumbnail) {
        uploadTasks.push(
          uploadContentFile(media.thumbnail, "thumbnails").then((url) => {
            mediaUrls.thumbnail = url;
          })
        );
      }

      if (media.trailer) {
        uploadTasks.push(
          uploadContentFile(media.trailer, "trailers").then((url) => {
            mediaUrls.trailer = url;
          })
        );
      }

      if (uploadTasks.length > 0) {
        toast.info(`Uploading ${uploadTasks.length} media file(s) in parallel...`);
        await Promise.all(uploadTasks);
      }

      const existingPoster = Array.isArray(series?.poster)
        ? series.poster[0]
        : series?.poster || series?.posterUrl || series?.posterImage;
      const existingBanner = Array.isArray(series?.banner)
        ? series.banner[0]
        : series?.banner || series?.bannerUrl || series?.bannerImage;
      const existingThumbnail = series?.thumbnail || series?.thumbnailUrl || series?.thumbnailImage;
      const existingTrailer = Array.isArray(series?.teaserVideo)
        ? series.teaserVideo[0]
        : series?.teaserVideo || series?.trailerUrl || series?.mainVideo;

      const finalPoster = mediaUrls.poster || existingPoster || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=800";
      const finalBanner = mediaUrls.banner || existingBanner || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200";
      const finalThumbnail = mediaUrls.thumbnail || existingThumbnail || finalPoster;
      const finalTrailer = mediaUrls.trailer || (f.trailerUrl?.trim() ? f.trailerUrl.trim() : existingTrailer) || undefined;

      const formattedSeasons = seasons.map((s, sIdx) => ({
        _id: s._id,
        id: s.id,
        seasonNumber: s.seasonNumber || sIdx + 1,
        title: s.title || `Season ${sIdx + 1}`,
        description: s.description || `Season ${sIdx + 1} of ${f.title}`,
        status: targetApproval === "APPROVED" ? "ACTIVE" : "INACTIVE",
        episodes: s.episodes.map((ep, epIdx) => ({
          _id: ep._id,
          id: ep.id,
          episodeNumber: ep.episodeNumber || epIdx + 1,
          title: ep.title || `Episode ${epIdx + 1}`,
          description: ep.description || "",
          duration: Number(ep.duration) || 45,
          videoFile: ep.videoFile || "",
          thumbnail: ep.thumbnail || "",
          releaseDate: ep.releaseDate || f.releaseDate || new Date().toISOString(),
          status: targetApproval === "APPROVED" ? "ACTIVE" : "INACTIVE",
        })),
      }));

      const totalEpisodesCount = formattedSeasons.reduce(
        (acc, s) => acc + s.episodes.length,
        0
      );

      const catStr =
        typeof f.category === "string"
          ? f.category.trim()
          : (f.category as any)?.name || (f.category as any)?._id || "";
      const genreStr =
        typeof f.genre === "string"
          ? f.genre.trim()
          : (f.genre as any)?.name || (f.genre as any)?._id || "";
      const langStr =
        typeof f.language === "string"
          ? f.language.trim()
          : Array.isArray(f.language)
          ? String(f.language[0] || "Hindi").trim()
          : "Hindi";

      const payload: NewSeries = {
        title: f.title.trim(),
        shortDescription: f.shortDesc || f.title.trim(),
        description: f.fullDesc || f.shortDesc || f.title.trim(),
        category: catStr,
        categories: catStr ? [catStr] : [],
        genres: genreStr ? [genreStr] : [],
        language: langStr ? [langStr] : ["Hindi"],
        releaseYear: Number(f.year) || 2026,
        releaseDate: f.releaseDate,
        totalSeasons: formattedSeasons.length,
        totalEpisodes: totalEpisodesCount,
        duration: f.duration ? Number(f.duration) : undefined,
        producer: f.producer.trim(),
        director: f.director.trim() || undefined,
        cast: f.cast.trim() || undefined,
        tags: f.tags.trim()
          ? f.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        metaTitle: f.metaTitle.trim() || f.title.trim(),
        metaDesc: f.metaDesc.trim() || f.fullDesc || f.shortDesc,
        slug: f.slug.trim() || undefined,
        poster: finalPoster ? [finalPoster] : undefined,
        banner: finalBanner ? [finalBanner] : undefined,
        thumbnail: finalThumbnail || undefined,
        teaserVideo: finalTrailer ? [finalTrailer] : undefined,
        isFeatured: t.featured,
        isTrending: t.trending,
        isSubscriptionRequired: f.availability === "Free" ? false : t.subRequired,
        isDownloadEnabled: t.download,
        status: targetApproval === "APPROVED" ? "ACTIVE" : "INACTIVE",
        approvalStatus: targetApproval,
        type: "SERIES",
        seasons: formattedSeasons,
      };

      if (series && (series._id || series.id)) {
        await onUpdate(series._id || series.id, payload);
      } else {
        await onCreate(payload);
      }

      onOpenChange(false);
      setTab(0);
    } catch (err: any) {
      console.error("Failed to save series:", err);
      toast.error(err?.message || "Failed to save series");
    } finally {
      setUploading(false);
    }
  };

  const currentActiveSeason = seasons[activeSeasonIdx] || seasons[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto rounded-2xl border-border bg-card p-0 shadow-2xl">
        <div className="px-7 pt-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Tv2 className="h-4.5 w-4.5" />
              </span>
              {series ? "Edit Series" : "Add New Series"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {series
                ? "Update series metadata, media assets, seasons, and episodes."
                : "Fill in metadata, upload artwork, schedule seasons & episodes, and configure playback rules."}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="mt-5 flex items-center gap-1 border-b border-border overflow-x-auto">
            {TABS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setTab(i)}
                className={cn(
                  "relative h-10 px-4 text-[13px] font-medium transition cursor-pointer whitespace-nowrap",
                  i === tab
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
                {i === 2 && (
                  <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                    {seasons.length}S · {seasons.reduce((acc, sn) => acc + sn.episodes.length, 0)}Ep
                  </span>
                )}
                {i === tab && (
                  <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          {/* TAB 0: BASICS */}
          {tab === 0 && (
            <div className="space-y-5">
              <div>
                <Label required>Series Title</Label>
                <input
                  className={inputCls}
                  value={f.title}
                  onChange={(e) => upd("title", e.target.value)}
                  placeholder="e.g., Mirzapur Season 3"
                />
              </div>

              <div>
                <Label>Short Description</Label>
                <input
                  className={inputCls}
                  value={f.shortDesc}
                  onChange={(e) => upd("shortDesc", e.target.value)}
                  maxLength={160}
                  placeholder="One-liner shown on cards and previews"
                />
              </div>

              <div>
                <Label>Full Story Synopsis</Label>
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={f.fullDesc}
                  onChange={(e) => upd("fullDesc", e.target.value)}
                  placeholder="Detailed synopsis of the entire show and seasons…"
                />
              </div>

              <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                {/* Content Category */}
                <div>
                  <Label required>Content Category</Label>
                  <CustomSelect
                    value={typeof f.category === "string" ? f.category : ""}
                    onChange={(val) => upd("category", val)}
                    options={categoryOptions}
                    placeholder="Select Category"
                  />
                </div>

                {/* Primary Genre */}
                <div>
                  <Label required>Primary Genre</Label>
                  <CustomSelect
                    value={typeof f.genre === "string" ? f.genre : ""}
                    onChange={(val) => upd("genre", val)}
                    options={genreOptions}
                    placeholder="Select Primary Genre"
                  />
                </div>

                {/* Audio Language */}
                <div>
                  <Label>Audio Language</Label>
                  <CustomSelect
                    value={typeof f.language === "string" ? f.language : ""}
                    onChange={(val) => upd("language", val)}
                    options={[
                      "Hindi",
                      "English",
                      "Tamil",
                      "Telugu",
                      "Bengali",
                      "Marathi",
                      "Malayalam",
                      "Kannada",
                      "Punjabi",
                      "Gujarati",
                      "Arabic",
                    ]}
                    placeholder="Select Audio Language"
                  />
                </div>

                {/* Producer */}
                <div>
                  <Label required>Producer / Production House</Label>
                  <CustomSelect
                    value={typeof f.producer === "string" ? f.producer : ""}
                    onChange={(val) => upd("producer", val)}
                    options={producerOptions}
                    placeholder="Select Producer"
                  />
                </div>

                {/* Total Seasons */}
                <div>
                  <Label required>Total Seasons (Configured in Seasons Tab)</Label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={seasons.length}
                    readOnly
                  />
                </div>

                {/* Total Episodes */}
                <div>
                  <Label required>Total Episodes (Configured in Seasons Tab)</Label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={seasons.reduce((acc, s) => acc + s.episodes.length, 0)}
                    readOnly
                  />
                </div>

                {/* Release Year */}
                <div>
                  <Label>Release Year</Label>
                  <input
                    type="number"
                    className={inputCls}
                    value={f.year}
                    onChange={(e) => upd("year", e.target.value)}
                  />
                </div>

                {/* Release Date */}
                <div>
                  <Label required>Release Date</Label>
                  <input
                    type="date"
                    className={inputCls}
                    value={f.releaseDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      upd("releaseDate", val);
                      if (val) {
                        const yearPart = val.split("-")[0];
                        if (yearPart && yearPart.length === 4) {
                          upd("year", yearPart);
                        }
                      }
                    }}
                  />
                </div>

                {/* Episode Duration */}
                <div>
                  <Label>Default Duration per Episode (Minutes / Optional)</Label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={f.duration}
                    onChange={(e) => upd("duration", e.target.value)}
                    placeholder="e.g. 45"
                  />
                </div>

                {/* Director / Showrunner */}
                <div>
                  <Label>Director / Showrunner</Label>
                  <input
                    className={inputCls}
                    value={f.director}
                    onChange={(e) => upd("director", e.target.value)}
                    placeholder="Showrunner / Director name…"
                  />
                </div>

                {/* Starring Cast */}
                <div>
                  <Label>Starring Cast (Comma Separated)</Label>
                  <input
                    className={inputCls}
                    value={f.cast}
                    onChange={(e) => upd("cast", e.target.value)}
                    placeholder="Pankaj Tripathi, Ali Fazal, Shweta Tripathi"
                  />
                </div>

                {/* Age Rating */}
                <div>
                  <Label>Age Rating</Label>
                  <CustomSelect
                    value={typeof f.rating === "string" ? f.rating : "U/A"}
                    onChange={(val) => upd("rating", val)}
                    options={[
                      { label: "U (Universal)", value: "U" },
                      { label: "U/A (Parental Guidance)", value: "U/A" },
                      { label: "A (Adults Only)", value: "A" },
                      { label: "18+ (Mature Audience)", value: "18+" },
                    ]}
                    placeholder="Select Age Rating"
                  />
                </div>

                {/* Subtitle Languages */}
                <div>
                  <Label>Subtitle Languages</Label>
                  <input
                    className={inputCls}
                    value={f.subtitles}
                    onChange={(e) => upd("subtitles", e.target.value)}
                    placeholder="English, Hindi, Tamil"
                  />
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Tags / Badges</Label>
                    <span className="text-[10px] text-muted-foreground">Click presets or enter custom tags</span>
                  </div>
                  {/* Preset tag chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {["NEW", "TRENDING", "TOP_RATED", "MOST_VIEWED"].map((tag) => {
                      const currentTags = (f.tags || "")
                        .split(",")
                        .map((t) => t.trim().toUpperCase())
                        .filter(Boolean);
                      const isSelected = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            let updated: string[];
                            if (isSelected) {
                              updated = currentTags.filter((t) => t !== tag);
                            } else {
                              updated = [...currentTags, tag];
                            }
                            upd("tags", updated.join(", "));
                          }}
                          className={cn(
                            "px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-secondary/80"
                          )}
                        >
                          {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    className={inputCls}
                    value={f.tags}
                    onChange={(e) => upd("tags", e.target.value)}
                    placeholder="NEW, TRENDING, TOP_RATED (comma separated)"
                  />
                </div>

                {/* Country */}
                <div>
                  <Label>Country of Origin</Label>
                  <CustomSelect
                    value={typeof f.country === "string" ? f.country : "India"}
                    onChange={(val) => upd("country", val)}
                    options={[
                      "India",
                      "United States",
                      "United Kingdom",
                      "Canada",
                      "Australia",
                      "UAE",
                      "Singapore",
                    ]}
                    placeholder="Select Country"
                  />
                </div>

                {/* IMDb Rating */}
                <div>
                  <Label>IMDb Rating</Label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    className={inputCls}
                    value={f.imdb}
                    onChange={(e) => upd("imdb", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: MEDIA ASSETS */}
          {tab === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Poster 2:3 */}
              <MediaUploadCard
                id="series-poster-file"
                label="Series Poster (2:3)"
                hint="JPG, PNG or WebP · 1080×1620 px"
                accept="image/jpeg,image/png,image/webp"
                type="image"
                file={media.poster}
                existingUrl={
                  series
                    ? Array.isArray(series.poster)
                      ? series.poster[0]
                      : series.poster || series.posterUrl || series.posterImage
                    : undefined
                }
                disabled={uploading}
                onFileChange={(file) => setMediaFile("poster", file)}
                badgeText="2:3 Aspect"
              />

              {/* Hero Banner 16:9 */}
              <MediaUploadCard
                id="series-banner-file"
                label="Hero Banner (16:9)"
                hint="JPG, PNG or WebP · 1920×1080 px"
                accept="image/jpeg,image/png,image/webp"
                type="image"
                file={media.banner}
                existingUrl={
                  series
                    ? Array.isArray(series.banner)
                      ? series.banner[0]
                      : series.banner || series.bannerUrl || series.bannerImage
                    : undefined
                }
                disabled={uploading}
                onFileChange={(file) => setMediaFile("banner", file)}
                badgeText="16:9 Hero"
              />

              {/* Card Thumbnail 16:9 */}
              <MediaUploadCard
                id="series-thumbnail-file"
                label="Card Thumbnail (16:9)"
                hint="JPG, PNG or WebP · 640×360 px"
                accept="image/jpeg,image/png,image/webp"
                type="image"
                file={media.thumbnail}
                existingUrl={series ? series.thumbnail || series.thumbnailUrl || series.thumbnailImage : undefined}
                disabled={uploading}
                onFileChange={(file) => setMediaFile("thumbnail", file)}
                badgeText="16:9 Card"
              />

              {/* Trailer Video */}
              <MediaUploadCard
                id="series-trailer-file"
                label="Teaser / Trailer Video"
                hint="MP4, WebM or HLS stream manifest"
                accept="video/mp4,video/webm,application/x-mpegURL,application/vnd.apple.mpegurl"
                type="video"
                file={media.trailer}
                existingUrl={
                  series
                    ? Array.isArray(series.teaserVideo)
                      ? series.teaserVideo[0]
                      : series.teaserVideo || series.trailerUrl || series.mainVideo
                    : undefined
                }
                disabled={uploading}
                onFileChange={(file) => setMediaFile("trailer", file)}
                badgeText="Teaser / Preview"
              />
            </div>
          )}

          {/* TAB 2: SEASONS & EPISODES DIRECT MANAGEMENT */}
          {tab === 2 && (
            <div className="space-y-6">
              {/* Seasons Selector Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {seasons.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSeasonIdx(idx)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer whitespace-nowrap",
                        activeSeasonIdx === idx
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background text-muted-foreground hover:text-foreground border border-border hover:bg-secondary"
                      )}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {s.title || `Season ${idx + 1}`}
                      <span className="ml-1 rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]">
                        {s.episodes.length} Ep
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddSeason}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-primary/50 bg-primary/10 px-3.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Season
                </button>
              </div>

              {/* Active Season Config */}
              {currentActiveSeason && (
                <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">
                          Season {currentActiveSeason.seasonNumber} Configuration
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Manage episodes, video masters, and thumbnails for this season.
                        </p>
                      </div>
                    </div>

                    {seasons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSeason(activeSeasonIdx)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Season
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label required>Season Title</Label>
                      <input
                        className={inputCls}
                        value={currentActiveSeason.title}
                        onChange={(e) =>
                          updateSeasonField(activeSeasonIdx, "title", e.target.value)
                        }
                        placeholder={`Season ${currentActiveSeason.seasonNumber}`}
                      />
                    </div>
                    <div>
                      <Label>Season Description / Logline</Label>
                      <input
                        className={inputCls}
                        value={currentActiveSeason.description}
                        onChange={(e) =>
                          updateSeasonField(activeSeasonIdx, "description", e.target.value)
                        }
                        placeholder="Overview of this season's plot..."
                      />
                    </div>
                  </div>

                  {/* Episodes List */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Episodes ({currentActiveSeason.episodes.length})
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddEpisode(activeSeasonIdx)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:brightness-110 transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Episode
                      </button>
                    </div>

                    <div className="space-y-3">
                      {currentActiveSeason.episodes.map((ep, epIdx) => (
                        <div
                          key={epIdx}
                          className="group relative rounded-xl border border-border/80 bg-secondary/20 p-4 transition hover:border-primary/40 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                                {ep.episodeNumber}
                              </span>
                              <span className="text-xs font-semibold text-foreground">
                                Episode {ep.episodeNumber}
                              </span>
                            </div>

                            {currentActiveSeason.episodes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEpisode(activeSeasonIdx, epIdx)}
                                className="text-muted-foreground hover:text-destructive transition cursor-pointer p-1"
                                title="Remove Episode"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                              <Label required>Episode Title</Label>
                              <input
                                className={inputCls}
                                value={ep.title}
                                onChange={(e) =>
                                  updateEpisodeField(
                                    activeSeasonIdx,
                                    epIdx,
                                    "title",
                                    e.target.value
                                  )
                                }
                                placeholder={`Episode ${ep.episodeNumber}`}
                              />
                            </div>
                            <div>
                              <Label>Duration (Mins)</Label>
                              <input
                                type="number"
                                min="1"
                                className={inputCls}
                                value={ep.duration}
                                onChange={(e) =>
                                  updateEpisodeField(
                                    activeSeasonIdx,
                                    epIdx,
                                    "duration",
                                    Number(e.target.value) || 45
                                  )
                                }
                                placeholder="45"
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Episode Synopsis</Label>
                            <input
                              className={inputCls}
                              value={ep.description}
                              onChange={(e) =>
                                updateEpisodeField(
                                  activeSeasonIdx,
                                  epIdx,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Summary of this episode..."
                            />
                          </div>

                          {/* Media Links / Upload for Episode */}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                            {/* Video File */}
                            <div className="rounded-xl border border-border/70 bg-background/50 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <VideoIcon className="h-3.5 w-3.5 text-primary" /> Video Master
                                </span>
                                {ep.videoFile && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
                                    <CheckCircle2 className="h-3 w-3" /> Attached
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                                  value={ep.videoFile || ""}
                                  onChange={(e) =>
                                    updateEpisodeField(
                                      activeSeasonIdx,
                                      epIdx,
                                      "videoFile",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Video URL or upload file..."
                                />
                                <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-secondary px-2.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition">
                                  {ep.uploadingVideo ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="h-3.5 w-3.5" />
                                  )}
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    disabled={ep.uploadingVideo}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        void handleEpisodeFileUpload(
                                          activeSeasonIdx,
                                          epIdx,
                                          file,
                                          "video"
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Thumbnail File */}
                            <div className="rounded-xl border border-border/70 bg-background/50 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <ImageIcon className="h-3.5 w-3.5 text-primary" /> Card Thumbnail
                                </span>
                                {ep.thumbnail && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
                                    <CheckCircle2 className="h-3 w-3" /> Attached
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60"
                                  value={ep.thumbnail || ""}
                                  onChange={(e) =>
                                    updateEpisodeField(
                                      activeSeasonIdx,
                                      epIdx,
                                      "thumbnail",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Image URL or upload file..."
                                />
                                <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-secondary px-2.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition">
                                  {ep.uploadingThumb ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="h-3.5 w-3.5" />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={ep.uploadingThumb}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        void handleEpisodeFileUpload(
                                          activeSeasonIdx,
                                          epIdx,
                                          file,
                                          "thumbnail"
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OTT CONTROLS */}
          {tab === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                <div>
                  <Label>Online Trailer Stream URL (Optional CDN link)</Label>
                  <input
                    className={inputCls}
                    value={f.trailerUrl}
                    onChange={(e) => upd("trailerUrl", e.target.value)}
                    placeholder="https://cdn.uthsava.com/trailer.m3u8"
                  />
                </div>

                <div>
                  <Label>OTT Availability Status</Label>
                  <CustomSelect
                    value={typeof f.availability === "string" ? f.availability : ""}
                    onChange={(val) => {
                      upd("availability", val);
                      setT((p) => ({ ...p, subRequired: val !== "Free" && Boolean(val) }));
                    }}
                    options={["Subscription", "Free", "Rental", "Premium", "Coming Soon"]}
                    placeholder="Select Availability"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-sm font-medium">Featured Series</div>
                    <div className="text-xs text-muted-foreground">Pin to top hero banner carousel.</div>
                  </div>
                  <Switch
                    checked={t.featured}
                    onCheckedChange={(v) => setT((p) => ({ ...p, featured: v }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-sm font-medium">Trending Series</div>
                    <div className="text-xs text-muted-foreground">Show under Trending Now rail.</div>
                  </div>
                  <Switch
                    checked={t.trending}
                    onCheckedChange={(v) => setT((p) => ({ ...p, trending: v }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-sm font-medium">Requires Subscription</div>
                    <div className="text-xs text-muted-foreground">Lock behind paid member plan.</div>
                  </div>
                  <Switch
                    checked={t.subRequired}
                    onCheckedChange={(v) => setT((p) => ({ ...p, subRequired: v }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-sm font-medium">Offline Download Allowed</div>
                    <div className="text-xs text-muted-foreground">Enable mobile offline caching.</div>
                  </div>
                  <Switch
                    checked={t.download}
                    onCheckedChange={(v) => setT((p) => ({ ...p, download: v }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEO & PUBLISH */}
          {tab === 4 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Summary & Configuration
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Title: </span>
                    <span className="font-semibold text-foreground">{f.title || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category: </span>
                    <span className="font-semibold text-foreground">{f.category || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Genre: </span>
                    <span className="font-semibold text-foreground">{f.genre || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seasons: </span>
                    <span className="font-semibold text-foreground">{seasons.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Episodes: </span>
                    <span className="font-semibold text-foreground">
                      {seasons.reduce((acc, s) => acc + s.episodes.length, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Producer: </span>
                    <span className="font-semibold text-foreground">{f.producer || "—"}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Custom URL Slug</Label>
                <input
                  className={inputCls}
                  value={f.slug}
                  onChange={(e) => upd("slug", e.target.value)}
                  placeholder="e.g. mirzapur-season-3"
                />
              </div>

              <div>
                <Label>SEO Meta Title</Label>
                <input
                  className={inputCls}
                  value={f.metaTitle}
                  onChange={(e) => upd("metaTitle", e.target.value)}
                  placeholder="Watch Mirzapur Season 3 in 4K on Uthsava"
                />
              </div>

              <div>
                <Label>SEO Meta Description</Label>
                <textarea
                  rows={3}
                  className={textareaCls}
                  value={f.metaDesc}
                  onChange={(e) => upd("metaDesc", e.target.value)}
                  placeholder="Stream all episodes of Mirzapur in HD and 4K..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t border-border bg-card/50 px-7 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="inline-flex h-9 items-center rounded-xl border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer"
            >
              Cancel
            </button>
            {tab > 0 && (
              <button
                type="button"
                onClick={() => setTab((prev) => prev - 1)}
                disabled={uploading}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {tab < TABS.length - 1 ? (
              <button
                type="button"
                onClick={() => setTab((prev) => prev + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-xl bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:brightness-110 transition cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit("DRAFT")}
                  disabled={uploading}
                  className="inline-flex h-9 items-center rounded-xl border border-border bg-secondary/80 px-3.5 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit("PENDING")}
                  disabled={uploading}
                  className="inline-flex h-9 items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 text-xs font-medium text-amber-500 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Submit for Review
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit("APPROVED")}
                  disabled={uploading}
                  className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:brightness-110 transition cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  {series ? "Save Changes" : "Publish Immediately"}
                </button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
