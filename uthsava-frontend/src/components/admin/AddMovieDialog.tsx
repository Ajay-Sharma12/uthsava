import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Film, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaUploadCard } from "@/components/admin/MediaUploadCard";
import { CustomSelect } from "@/components/admin/CustomSelect";

const LANGUAGE_CODE_MAP: Record<string, string> = {
  English: "En",
  Hindi: "Hi",
  Tamil: "Ta",
  Telugu: "Te",
  Bengali: "Bn",
  Marathi: "Mr",
  Malayalam: "Ml",
  Kannada: "Kn",
  Arabic: "Ar",
  en: "En",
  hi: "Hi",
  ta: "Ta",
  te: "Te",
  bn: "Bn",
  mr: "Mr",
  ml: "Ml",
  kn: "Kn",
  ar: "Ar",
  EN: "En",
  HI: "Hi",
  TA: "Ta",
  TE: "Te",
  BN: "Bn",
  MR: "Mr",
  ML: "Ml",
  KN: "Kn",
  AR: "Ar",
  En: "En",
  Hi: "Hi",
  Ta: "Ta",
  Te: "Te",
  Bn: "Bn",
  Mr: "Mr",
  Ml: "Ml",
  Kn: "Kn",
  Ar: "Ar",
};

function normalizeMovieLanguageCode(raw: any): string {
  if (!raw) return "Hi";
  const val = typeof raw === "object" ? raw.name || raw.code || "" : String(raw);
  const clean = val.trim().toLowerCase();

  if (clean === "hindi" || clean === "hi" || clean === "hin") return "Hi";
  if (clean === "english" || clean === "en" || clean === "eng") return "En";
  if (clean === "tamil" || clean === "ta" || clean === "tam") return "Ta";
  if (clean === "telugu" || clean === "te" || clean === "tel") return "Te";
  if (clean === "bengali" || clean === "bn" || clean === "ben") return "Bn";
  if (clean === "marathi" || clean === "mr" || clean === "mar") return "Mr";
  if (clean === "malayalam" || clean === "ml" || clean === "mal") return "Ml";
  if (clean === "kannada" || clean === "kn" || clean === "kan") return "Kn";
  if (clean === "arabic" || clean === "ar" || clean === "ara") return "Ar";

  return (
    LANGUAGE_CODE_MAP[val] ||
    LANGUAGE_CODE_MAP[val.toUpperCase()] ||
    LANGUAGE_CODE_MAP[clean] ||
    (["Hi", "En", "Ta", "Te", "Bn", "Mr", "Ml", "Kn", "Ar"].includes(val) ? val : "Hi")
  );
}

export type NewMovie = {
  title: string;
  genre: string;
  category?: string;
  categories?: string[];
  lang: string;
  status: "ACTIVE" | "INACTIVE";
  approval: "APPROVED" | "PENDING" | "REJECTED";
  year: number;
  releaseDate: string;
  duration: string;
  producer: string;

  shortDescription?: string;
  description?: string;

  posterUrl?: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  videoUrl?: string;
};

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";
const selectCls =
  inputCls + " appearance-none bg-no-repeat bg-[right_0.85rem_center] bg-[length:14px_14px] pr-9";
const textareaCls =
  "w-full resize-none rounded-xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";

const caretBg = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
};

const TABS = ["Basics", "Media", "OTT Controls", "Review & Publish"] as const;

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="mb-1.5 block text-[12px] font-medium text-foreground/80">
    {children}
    {required && <span className="ml-0.5 text-primary">*</span>}
  </label>
);

import { type ContentGenre, uploadContentFile } from "@/lib/services/content";
import { getProducers } from "@/lib/services/producers";

export function AddMovieDialog({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  movie,
  genres = [],
  categories = [],
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreate: (m: NewMovie) => Promise<void>;
  onUpdate: (id: string, m: NewMovie) => Promise<void>;

  movie?: any;
  genres: ContentGenre[];
  categories?: ContentGenre[];
}) {
  const [tab, setTab] = useState(0);

  const [f, setF] = useState({
    title: "",
    shortDesc: "",
    fullDesc: "",
    genre: "",
    category: "",
    language: "Hi",
    subtitles: "English, Hindi",
    rating: "",
    director: "",
    cast: "",
    tags: "",
    year: "2026",
    releaseDate: "",
    producer: "",
    duration: "",
    imdb: "8.2",
    country: "India",
    trailerUrl: "",
    availability: "Subscription",
    metaTitle: "",
    metaDesc: "",
    slug: "",
  });

  const [t, setT] = useState({
    featured: false,
    trending: false,
    subRequired: true,
    download: false,
  });

  const [media, setMedia] = useState({
    poster: null as File | null,
    thumbnail: null as File | null,
    trailer: null as File | null,
    video: null as File | null,
  });

  const [uploading, setUploading] = useState(false);
  const [durationInSeconds, setDurationInSeconds] = useState(0);
  const [producers, setProducers] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      getProducers()
        .then((res: any) => {
          setProducers(res?.results?.data ?? []);
        })
        .catch((err) => console.error("Failed to load producers:", err));
    }
  }, [open]);
  const setMediaFile = async (
    key: "poster" | "thumbnail" | "trailer" | "video",
    file: File | null,
  ) => {
    setMedia((current) => ({
      ...current,
      [key]: file,
    }));

    // Automatically detect duration from the main video only if duration is not manually set
    if (key === "video" && file) {
      try {
        const videoElement = document.createElement("video");
        const objectUrl = URL.createObjectURL(file);

        videoElement.preload = "metadata";
        videoElement.src = objectUrl;

        await new Promise<void>((resolve, reject) => {
          videoElement.onloadedmetadata = () => resolve();
          videoElement.onerror = () => reject(new Error("Unable to read video duration."));
        });

        const detectedSeconds = Math.round(videoElement.duration);

        if (Number.isFinite(detectedSeconds) && detectedSeconds > 0) {
          setDurationInSeconds(detectedSeconds);
          // Only auto-fill duration if the user has not entered a duration yet
          if (!f.duration || Number(f.duration) <= 0) {
            const durationInMinutes = Math.max(1, Math.round(detectedSeconds / 60));
            upd("duration", String(durationInMinutes));
          }

          console.log("========== MOVIE VIDEO DURATION ==========");
          console.log("Video:", file.name);
          console.log("Duration seconds:", detectedSeconds);
        }

        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error("Failed to detect video duration:", error);
      }
    }
  };

  useEffect(() => {
    if (movie) {
      const castMembers = Array.isArray(movie.cast)
        ? movie.cast
        : Array.isArray(movie.castCrew)
          ? movie.castCrew.filter((c: any) => c.type === "CAST" || c.type === "Cast")
          : [];

      const crewMembers = Array.isArray(movie.crew)
        ? movie.crew
        : Array.isArray(movie.castCrew)
          ? movie.castCrew.filter((c: any) => c.type === "CREW" || c.type === "Crew")
          : [];

      const director =
        movie.director ??
        movie.directorName ??
        crewMembers.find(
          (member: any) =>
            member.role?.toLowerCase() === "director" ||
            member.type?.toLowerCase() === "crew" ||
            member.type?.toLowerCase() === "director",
        )?.name ??
        crewMembers[0]?.name ??
        "";

      const imdbRating =
        typeof movie.imdb === "object"
          ? movie.imdb?.rating
          : movie.imdb ?? movie.imdbRating;

      const subtitleValue = (() => {
        const rawSubs =
          movie.subtitles ??
          (movie as any).subtitleLanguages ??
          (movie as any).subtitle ??
          (movie as any).subtitleLang ??
          (movie as any).additionalLanguages;

        if (Array.isArray(rawSubs) && rawSubs.length > 0) {
          return rawSubs
            .map((s: any) => (typeof s === "string" ? s : s?.language || s?.name || s?.lang || ""))
            .filter(Boolean)
            .join(", ");
        }

        if (typeof rawSubs === "string" && rawSubs.trim()) {
          return rawSubs.trim();
        }

        if (Array.isArray(movie.language) && movie.language.length > 1) {
          return movie.language
            .slice(1)
            .map((s: any) => (typeof s === "string" ? s : s?.name || s?.language || s?.code || ""))
            .filter(Boolean)
            .join(", ");
        }

        return "";
      })();

      const rawTeaser = Array.isArray(movie.teaserVideo)
        ? movie.teaserVideo[0]
        : (Array.isArray(movie.teaserVideos) ? movie.teaserVideos[0] : movie.teaserVideo);

      const resolvedTrailerUrl = movie.trailerUrl ?? movie.trailer ?? rawTeaser ?? "";

      const isSub =
        movie.isSubscriptionRequired !== undefined
          ? Boolean(movie.isSubscriptionRequired)
          : movie.isFree === true
            ? false
            : true;

      setT({
        featured: Boolean(movie.isFeatured ?? movie.featured),
        trending: Boolean(movie.isTrending ?? movie.trending),
        subRequired: isSub,
        download: Boolean(movie.isDownloadEnabled ?? movie.download),
      });

      setF({
        title: movie.title ?? "",
        shortDesc:
          movie.shortDescription ??
          movie.shortDesc ??
          (movie as any).overview ??
          (movie as any).synopsis ??
          (movie as any).plot ??
          (movie as any).metaDescription ??
          "",
        fullDesc:
          movie.description ??
          movie.fullDesc ??
          (movie as any).desc ??
          (movie as any).synopsis ??
          (movie as any).overview ??
          (movie as any).plot ??
          "",

        genre:
          genres.find((g) => g.name === movie.genres?.[0] || g._id === movie.genreIds?.[0] || g._id === movie.genre)?._id ??
          movie.genreIds?.[0] ??
          movie.genre ??
          "",

        category: (() => {
          const rawCats = movie.categories ?? (movie.category ? [movie.category] : []);
          const firstCat = Array.isArray(rawCats) ? rawCats[0] : rawCats;
          const firstCatIdOrName = typeof firstCat === "object" ? firstCat?._id || firstCat?.name : firstCat;

          const matched = categories.find(
            (c) =>
              c._id === firstCatIdOrName ||
              c._id === movie.categoryId ||
              c._id === movie.categoryIds?.[0] ||
              c._id === movie.category ||
              c.name === firstCatIdOrName ||
              c.name === movie.category ||
              (Array.isArray(movie.categories) && movie.categories.some((mc: any) => mc === c._id || mc === c.name || mc?._id === c._id || mc?.name === c.name))
          );

          return matched?._id ?? (categories.some((c) => c._id === firstCatIdOrName) ? firstCatIdOrName : "");
        })(),

        language: (() => {
          const rawLang =
            (Array.isArray(movie.language) ? movie.language[0] : movie.language) ??
            (Array.isArray((movie as any).languages) ? (movie as any).languages[0] : (movie as any).languages) ??
            (Array.isArray(movie.languageIds) ? movie.languageIds[0] : movie.languageIds) ??
            movie.lang ??
            "Hi";

          return normalizeMovieLanguageCode(rawLang);
        })(),

        subtitles: subtitleValue,

        rating: movie.ageRating ?? "U/A",

        director,

        cast: castMembers
          .map((member: any) => member.name)
          .filter(Boolean)
          .join(", "),

        tags: Array.isArray(movie.tags) ? movie.tags.join(", ") : "",

        year: String(movie.releaseYear ?? movie.year ?? 2026),

        releaseDate: (() => {
          const raw = movie.releaseDate ?? movie.contentReleaseDate;
          if (!raw) return "";
          try {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
              return d.toISOString().split("T")[0];
            }
          } catch {}
          return String(raw).slice(0, 10);
        })(),

        producer:
          movie.producer ||
          movie.uploadedBy?.companyName ||
          movie.uploadedBy?.fullName ||
          movie.uploadedBy?.name ||
          "",

        duration: (() => {
          if (movie.duration !== null && movie.duration !== undefined) {
            const dur = Number(movie.duration);
            if (Number.isFinite(dur) && dur > 0) {
              return String(dur);
            }
          }
          return "";
        })(),

        imdb: imdbRating !== null && imdbRating !== undefined ? String(imdbRating) : "",

        country: movie.country ?? "India",

        trailerUrl: resolvedTrailerUrl,

        availability: isSub ? "Subscription" : "Free",

        metaTitle: movie.metaTitle ?? movie.seo?.metaTitle ?? "",

        metaDesc: movie.metaDescription ?? movie.metaDesc ?? movie.seo?.metaDescription ?? "",

        slug: movie.slug ?? "",
      });

    } else {
      setTab(0);
      setMedia({
        poster: null,
        thumbnail: null,
        trailer: null,
        video: null,
      });
      setDurationInSeconds(0);
      setT({
        featured: false,
        trending: false,
        subRequired: true,
        download: false,
      });
      setF({
        title: "",
        shortDesc: "",
        fullDesc: "",
        genre: "",
        category: "",
        language: "Hi",
        subtitles: "",
        rating: "U/A",
        director: "",
        cast: "",
        tags: "",
        year: String(new Date().getFullYear()),
        releaseDate: "",
        producer: "",
        duration: "",
        imdb: "",
        country: "India",
        trailerUrl: "",
        availability: "Subscription",
        metaTitle: "",
        metaDesc: "",
        slug: "",
      });
    }
  }, [movie, open, genres]);

  const upd = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (targetApproval?: "APPROVED" | "PENDING" | "DRAFT") => {
    if (!f.title.trim()) {
      toast.error("Movie title is required");
      setTab(0);
      return;
    }

    if (!f.genre) {
      toast.error("Please select a genre");
      setTab(0);
      return;
    }

    if (!f.language) {
      toast.error("Please select a language");
      setTab(0);
      return;
    }

    if (!f.duration || Number(f.duration) <= 0) {
      toast.error("Please enter a valid duration");
      setTab(0);
      return;
    }

    if (!f.releaseDate) {
      toast.error("Release date is required");
      setTab(0);
      return;
    }

    if (!media.poster && !movie?.posterUrl && !movie?.poster) {
      toast.error("Movie poster is required");
      setTab(1);
      return;
    }

    if (!media.video && !movie?.videoUrl && !movie?.mainVideo) {
      toast.error("Main video is required");
      setTab(1);
      return;
    }

    if (!media.thumbnail && !movie?.thumbnailUrl && !movie?.thumbnail) {
      toast.error("Movie thumbnail is required");
      setTab(1);
      return;
    }

    try {
      setUploading(true);

      const mediaUrls: {
        poster?: string;
        thumbnail?: string;
        trailer?: string;
        video?: string;
      } = {};

      const uploadTasks: Promise<void>[] = [];

      if (media.poster) {
        uploadTasks.push(
          uploadContentFile(media.poster, "posters").then((url) => {
            mediaUrls.poster = url;
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

      if (media.video) {
        uploadTasks.push(
          uploadContentFile(media.video, "videos").then((url) => {
            mediaUrls.video = url;
          })
        );
      }

      if (uploadTasks.length > 0) {
        toast.info(`Uploading ${uploadTasks.length} media file(s) in parallel...`);
        await Promise.all(uploadTasks);
      }

      const cast = f.cast
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          role: "Cast",
        }));

      const crew = f.director.trim()
        ? [
            {
              name: f.director.trim(),
              role: "Director",
            },
          ]
        : [];

      const payload: any = {
        title: f.title.trim(),

        genre: f.genre,
        category: f.category,
        categories: f.category ? [f.category] : [],
        lang: f.language,
        language: [f.language],

        year: Number(f.year),

        releaseDate: f.releaseDate,

        duration: String(
          Number(f.duration) > 0
            ? Number(f.duration)
            : durationInSeconds > 0
              ? Math.max(1, Math.round(durationInSeconds / 60))
              : 1
        ),

        producer: f.producer,

        shortDescription: f.shortDesc,
        shortDesc: f.shortDesc,
        description: f.fullDesc,
        fullDesc: f.fullDesc,

        ageRating: f.rating,

        cast,
        crew,

        tags: f.tags
          ? f.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],

        country: f.country,

        imdb: f.imdb
          ? {
              ...(movie?.imdb || {}),
              rating: Number(f.imdb),
            }
          : (movie?.imdb ?? null),

        subtitles: f.subtitles
          .split(",")
          .map((subtitle) => subtitle.trim())
          .filter(Boolean),
        subtitleLanguages: f.subtitles
          .split(",")
          .map((subtitle) => subtitle.trim())
          .filter(Boolean),

        isFeatured: t.featured,
        isTrending: t.trending,

        isSubscriptionRequired: f.availability === "Free" ? false : t.subRequired,
        isFree: f.availability === "Free" || !t.subRequired,
        isDownloadEnabled: t.download,

        metaTitle: f.metaTitle,
        metaDescription: f.metaDesc,

        slug: f.slug,
      };

      if (targetApproval === "DRAFT") {
        payload.status = "INACTIVE";
        payload.approvalStatus = "DRAFT";
      } else if (targetApproval === "PENDING") {
        payload.status = "INACTIVE";
        payload.approvalStatus = "PENDING";
      } else if (targetApproval === "APPROVED") {
        payload.status = "ACTIVE";
        payload.approvalStatus = "APPROVED";
      }

      if (media.poster) {
        if (!mediaUrls.poster) {
          throw new Error("Poster upload failed.");
        }

        payload.poster = [mediaUrls.poster];
      } else if (movie?.poster) {
        payload.poster = movie.poster;
      }

      if (media.thumbnail) {
        if (!mediaUrls.thumbnail) {
          throw new Error("Thumbnail upload failed.");
        }

        payload.thumbnail = mediaUrls.thumbnail;
      } else if (movie?.thumbnail) {
        payload.thumbnail = movie.thumbnail;
      }

      if (media.trailer) {
        payload.teaserVideo = [mediaUrls.trailer];
        payload.trailerUrl = mediaUrls.trailer;
      } else if (f.trailerUrl?.trim()) {
        payload.teaserVideo = [f.trailerUrl.trim()];
        payload.trailerUrl = f.trailerUrl.trim();
      } else if (movie?.teaserVideo) {
        payload.teaserVideo = Array.isArray(movie.teaserVideo) ? movie.teaserVideo : [movie.teaserVideo];
        payload.trailerUrl = Array.isArray(movie.teaserVideo) ? movie.teaserVideo[0] : movie.teaserVideo;
      }

      if (media.video) {
        if (!mediaUrls.video) {
          throw new Error("Main video upload failed.");
        }

        payload.mainVideo = mediaUrls.video;
      } else if (movie?.mainVideo) {
        payload.mainVideo = movie.mainVideo;
      }

      console.log("========== MOVIE FINAL PAYLOAD ==========");
      console.log(JSON.stringify(payload, null, 2));

      if (movie) {
        await onUpdate(movie._id, payload);
      } else {
        await onCreate(payload);
      }

      onOpenChange(false);
      setTab(0);
    } catch (error: any) {
      console.error("========== MOVIE SAVE ERROR ==========");
      console.error(error);
      console.error("Response:", error?.data);

      toast.error(error?.message || error?.data?.message || "Failed to save movie");
    } finally {
      setUploading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto rounded-2xl border-border bg-card p-0 shadow-2xl">
        <div className="px-7 pt-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Film className="h-4.5 w-4.5" />
              </span>
              {movie ? "Edit Movie" : "Add New Movie"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Set up a movie with media details, OTT controls, and SEO settings.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="mt-5 flex items-center gap-1 border-b border-border">
            {TABS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setTab(i)}
                className={cn(
                  "relative h-10 px-4 text-[13px] font-medium transition",
                  i === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
                {i === tab && (
                  <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          {tab === 0 && (
            <div className="space-y-5">
              <div>
                <Label required>Movie Title</Label>
                <input
                  className={inputCls}
                  value={f.title}
                  onChange={(e) => upd("title", e.target.value)}
                  placeholder="e.g., The Last Kingdom"
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
                <Label>Full Description</Label>
                <textarea
                  rows={4}
                  className={textareaCls}
                  value={f.fullDesc}
                  onChange={(e) => upd("fullDesc", e.target.value)}
                  placeholder="Detailed synopsis…"
                />
              </div>

              <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                {/* Category */}
                <div>
                  <Label>Category</Label>
                  <CustomSelect
                    value={f.category}
                    onChange={(val) => upd("category", val)}
                    options={categories.map((category) => ({ label: category.name, value: category._id }))}
                    placeholder="Select Category"
                  />
                </div>

                {/* Left column */}
                <div>
                  <Label>Genre</Label>
                  <CustomSelect
                    value={f.genre}
                    onChange={(val) => upd("genre", val)}
                    options={genres.map((genre) => ({ label: genre.name, value: genre._id }))}
                    placeholder="Select Genre"
                  />
                </div>
                <div>
                  <Label>Language</Label>
                  <CustomSelect
                    value={f.language}
                    onChange={(val) => upd("language", val)}
                    options={[
                      { label: "Hindi", value: "Hi" },
                      { label: "English", value: "En" },
                      { label: "Tamil", value: "Ta" },
                      { label: "Telugu", value: "Te" },
                      { label: "Bengali", value: "Bn" },
                      { label: "Marathi", value: "Mr" },
                      { label: "Malayalam", value: "Ml" },
                      { label: "Kannada", value: "Kn" },
                      { label: "Arabic", value: "Ar" },
                    ]}
                    placeholder="Select Language"
                  />
                </div>

                <div>
                  <Label>Subtitle Languages</Label>
                  <input
                    className={inputCls}
                    value={f.subtitles}
                    onChange={(e) => upd("subtitles", e.target.value)}
                    placeholder="English, Hindi, Tamil"
                  />
                </div>
                <div>
                  <Label>Release Year</Label>
                  <input
                    type="number"
                    className={inputCls}
                    value={f.year}
                    onChange={(e) => upd("year", e.target.value)}
                  />
                </div>

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

                <div>
                  <Label>Age Rating</Label>
                  <CustomSelect
                    value={f.rating}
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
                <div>
                  <Label>Producer</Label>
                  <CustomSelect
                    value={f.producer}
                    onChange={(val) => upd("producer", val)}
                    options={producers.map((p) => {
                      const name = p.fullName || p.companyName || p.email || "";
                      return { label: name, value: name };
                    })}
                    placeholder="Select Producer"
                  />
                </div>

                <div>
                  <Label>Director</Label>
                  <input
                    className={inputCls}
                    value={f.director}
                    onChange={(e) => upd("director", e.target.value)}
                    placeholder="e.g., Anurag Kashyap"
                  />
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={f.duration}
                    onChange={(e) => {
                      upd("duration", e.target.value);
                      setDurationInSeconds(0);
                    }}
                    placeholder="e.g. 105"
                  />

                  {media.video && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Duration is automatically detected from the uploaded video.
                    </p>
                  )}
                </div>

                <div>
                  <Label>Cast</Label>
                  <input
                    className={inputCls}
                    value={f.cast}
                    onChange={(e) => upd("cast", e.target.value)}
                    placeholder="Comma separated names"
                  />
                </div>
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
                <div>
                  <Label>Country</Label>
                  <CustomSelect
                    value={f.country}
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
              </div>

              {/* Additional fields */}
              <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                <div>
                  <Label>Trailer URL</Label>
                  <input
                    className={inputCls}
                    value={f.trailerUrl}
                    onChange={(e) => upd("trailerUrl", e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <Label>OTT Availability Status</Label>
                  <CustomSelect
                    value={f.availability}
                    onChange={(val) => {
                      upd("availability", val);
                      setT((p) => ({ ...p, subRequired: val !== "Free" }));
                    }}
                    options={["Subscription", "Free", "Rental", "Premium", "Coming Soon"]}
                    placeholder="Select Availability"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-sm font-medium">Featured Movie</div>
                    <div className="text-xs text-muted-foreground">Pin to hero carousel.</div>
                  </div>
                  <Switch
                    checked={t.featured}
                    onCheckedChange={(v) => setT((p) => ({ ...p, featured: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-sm font-medium">Trending Movie</div>
                    <div className="text-xs text-muted-foreground">
                      Show under Trending Now rail.
                    </div>
                  </div>
                  <Switch
                    checked={t.trending}
                    onCheckedChange={(v) => setT((p) => ({ ...p, trending: v }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* {tab === 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { l: "Movie Poster (2:3)", h: "1080×1620 · JPG/PNG" },
                { l: "Banner (16:9)", h: "1920×1080" },
                { l: "Thumbnail", h: "640×360" },
                { l: "Trailer Video", h: "MP4 · max 200MB" },
                { l: "Main Video", h: "MP4 / HLS · DRM optional" },
                { l: "Subtitles (SRT/VTT)", h: "One file per language" },
              ].map((d) => (
                <div key={d.l} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 p-6 text-center transition hover:border-primary/40 hover:bg-primary/5">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-card text-muted-foreground shadow-sm"><Upload className="h-5 w-5" /></div>
                  <div className="text-sm font-medium">{d.l}</div>
                  <div className="text-[11px] text-muted-foreground">{d.h}</div>
                  <button type="button" onClick={() => toast.success(`${d.l} uploaded`)} className="mt-1 inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-secondary">Browse files</button>
                </div>
              ))}
            </div>
          )} */}

          {tab === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Poster */}
              <MediaUploadCard
                id="movie-poster-file"
                label="Poster (2:3)"
                hint="JPG, PNG or WebP"
                accept="image/jpeg,image/png,image/webp"
                type="image"
                file={media.poster}
                existingUrl={
                  movie
                    ? movie.posterUrl ||
                      (Array.isArray(movie.poster) ? movie.poster[0] : movie.poster)
                    : undefined
                }
                disabled={uploading}
                onFileChange={(file) => setMediaFile("poster", file)}
                badgeText="2:3 Aspect"
              />

              {/* Thumbnail */}
              <MediaUploadCard
                id="movie-thumbnail-file"
                label="Thumbnail (16:9)"
                hint="JPG, PNG or WebP"
                accept="image/jpeg,image/png,image/webp"
                type="image"
                file={media.thumbnail}
                existingUrl={movie ? movie.thumbnailUrl || movie.thumbnail : undefined}
                disabled={uploading}
                onFileChange={(file) => setMediaFile("thumbnail", file)}
                badgeText="16:9 Aspect"
              />

              {/* Trailer */}
              <MediaUploadCard
                id="movie-trailer-file"
                label="Trailer video"
                hint="MP4, WebM or HLS manifest"
                accept="video/mp4,video/webm,application/x-mpegURL,application/vnd.apple.mpegurl"
                type="video"
                file={media.trailer}
                existingUrl={
                  movie
                    ? movie.trailerUrl ||
                      movie.trailer ||
                      (Array.isArray(movie.teaserVideo) ? movie.teaserVideo[0] : movie.teaserVideo)
                    : undefined
                }
                disabled={uploading}
                onFileChange={(file) => setMediaFile("trailer", file)}
                badgeText="Teaser / Preview"
              />

              {/* Feature Video */}
              <MediaUploadCard
                id="movie-video-file"
                label="Feature video"
                hint="MP4, WebM or HLS manifest"
                accept="video/mp4,video/webm,application/x-mpegURL,application/vnd.apple.mpegurl"
                type="video"
                file={media.video}
                existingUrl={movie ? movie.videoUrl || movie.mainVideo : undefined}
                disabled={uploading}
                onFileChange={(file) => setMediaFile("video", file)}
                badgeText="Master Video"
              />
            </div>
          )}

          {tab === 2 && (
            <div className="space-y-3">
              {[
                { k: "subRequired", l: "Subscription Required", h: "Restrict to paid plans." },
                { k: "download", l: "Allow Downloads", h: "Available offline." },
                { k: "featured", l: "Featured on Home", h: "Pin to hero carousel." },
                { k: "trending", l: "Mark as Trending", h: "Add to trending rail." },
              ].map((r) => (
                <div
                  key={r.k}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 shadow-sm"
                >
                  <div>
                    <div className="text-sm font-medium">{r.l}</div>
                    <div className="text-xs text-muted-foreground">{r.h}</div>
                  </div>
                  <Switch
                    checked={(t as any)[r.k]}
                    onCheckedChange={(v) => {
                      setT((p) => ({ ...p, [r.k]: v }));
                      if (r.k === "subRequired") {
                        upd("availability", v ? "Subscription" : "Free");
                      }
                    }}
                  />
                </div>
              ))}
              <div>
                <Label>Region Restrictions</Label>
                <input className={inputCls} placeholder="e.g., IN, AE, US (comma separated)" />
              </div>
            </div>
          )}

          {tab === 3 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div>
                <div className="text-sm font-semibold text-foreground">Ready to save “{f.title || "this movie"}”</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review the movie details and media files before saving. You can save as draft, submit for quality review, or publish directly to the live catalog.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/70 bg-background/50 p-3.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Title:</span> <strong className="text-foreground">{f.title || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Producer:</span> <strong className="text-foreground">{f.producer || "Octal Studio"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span> <strong className="text-foreground">{f.duration || "—"} min</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Release Date:</span> <strong className="text-foreground">{f.releaseDate || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Main Video:</span>{" "}
                  <strong className={media.video?.name || movie?.videoUrl ? "text-emerald-500" : "text-amber-500"}>
                    {media.video?.name ? "Selected" : movie?.videoUrl ? "Attached" : "Missing"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Poster Image:</span>{" "}
                  <strong className={media.poster?.name || movie?.posterUrl || movie?.poster ? "text-emerald-500" : "text-amber-500"}>
                    {media.poster?.name ? "Selected" : movie?.posterUrl || movie?.poster ? "Attached" : "Missing"}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border bg-background/60 px-7 py-4 sm:justify-between">
          <div className="flex items-center gap-2">
            {tab > 0 && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => setTab((t) => Math.max(0, t - 1))}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
            )}
            <button
              type="button"
              disabled={uploading}
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2">
            {tab < 3 ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => setTab((t) => Math.min(3, t + 1))}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110 cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                {!movie && (
                  <>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => submit("DRAFT")}
                      className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => submit("PENDING")}
                      className="h-10 rounded-xl border border-warning/40 bg-warning/10 px-4 text-sm font-semibold text-warning hover:bg-warning/20 disabled:opacity-50 cursor-pointer"
                    >
                      Submit for Approval
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => submit(movie ? undefined : "APPROVED")}
                  disabled={uploading}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {uploading ? "Uploading..." : movie ? "Update Movie" : "Publish Directly"}
                </button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
