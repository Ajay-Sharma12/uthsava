import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CustomSelect } from "@/components/admin/CustomSelect";
import {
  Film,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Video as VideoIcon,
  X,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  Lock,
  Download,
  Globe,
  Sliders,
  FileText,
  Clock,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPresignedUrl, uploadToPresignedUrl } from "@/lib/services/upload";
import { fetchContentGenres, fetchContentCategories } from "@/lib/services/content";
import { getProducers } from "@/lib/services/producers";

export type NewContent = {
  title: string;
  type: string;
  category?: string;
  categories?: string[];
  genre: string;
  genres?: string[];
  lang: string;
  year: number;
  duration: string;
  producer: string;
  status: string;
  approval: string;
  poster?: string;
  banner?: string;
  thumbnail?: string;
  trailerVideo?: string;
  mainVideo?: string;
  description?: string;
  cast?: string;
  director?: string;
  tags?: string;
  metaTitle?: string;
  metaDesc?: string;
  slug?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isSubscriptionRequired?: boolean;
  isDownloadEnabled?: boolean;
};

const inputCls =
  "h-10 w-full rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all";

const selectCls =
  "h-10 w-full rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/50 px-3.5 text-xs font-medium text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs backdrop-blur-md";

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

const STEPS = [
  { label: "Basics", icon: FileText, desc: "Title, genre & credits" },
  { label: "Media Assets", icon: ImageIcon, desc: "Posters, banner & videos" },
  { label: "OTT Controls", icon: Sliders, desc: "Feature, preview & access" },
  { label: "SEO & Publish", icon: Globe, desc: "Metadata & release status" },
] as const;

export function AddContentDialog({
  open,
  onOpenChange,
  onCreate,
  initialData,
  initialType,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreate: (c: NewContent, id?: string) => void;
  initialData?: any;
  initialType?: string;
}) {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    title: "",
    type: initialType ?? "Movie",
    category: "Movies",
    genre: "Drama",
    lang: "Hindi",
    year: "2026",
    duration: "120",
    description: "",
    cast: "",
    director: "",
    producer: "Uthsava Studio",
    tags: "",
    metaTitle: "",
    metaDesc: "",
    slug: "",
    poster: "",
    banner: "",
    thumbnail: "",
    trailerVideo: "",
    mainVideo: "",
  });

  // Media upload previews & inline status
  const [mediaPreviews, setMediaPreviews] = useState<{ [key: string]: string }>({});
  const [uploadingMedia, setUploadingMedia] = useState<{ [key: string]: boolean }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});

  const [genreOptions, setGenreOptions] = useState<string[]>([
    "Drama", "Thriller", "Romance", "Action", "Mythology",
    "Documentary", "Comedy", "Horror", "Crime", "Sci-Fi",
  ]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    "Movies", "Web Series", "Originals", "Short Films", "Documentaries",
  ]);
  const [producerOptions, setProducerOptions] = useState<string[]>([
    "Uthsava Studios", "Excel Entertainment", "Balaji Telefilms", "Dharma Productions", "Red Chillies",
  ]);

  const fileInputRefs = {
    poster: useRef<HTMLInputElement>(null),
    banner: useRef<HTMLInputElement>(null),
    thumbnail: useRef<HTMLInputElement>(null),
    trailerVideo: useRef<HTMLInputElement>(null),
    mainVideo: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    if (open) {
      fetchContentGenres()
        .then((items) => {
          if (Array.isArray(items) && items.length > 0) {
            const names = items.map((g: any) => g.name || g.label).filter(Boolean);
            setGenreOptions((prev) => Array.from(new Set([...names, ...prev])).filter(Boolean));
          }
        })
        .catch(() => {});

      fetchContentCategories()
        .then((items) => {
          if (Array.isArray(items) && items.length > 0) {
            const names = items.map((c: any) => c.name || c.label).filter(Boolean);
            setCategoryOptions((prev) => Array.from(new Set([...names, ...prev])).filter(Boolean));
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
            setProducerOptions((prev) => Array.from(new Set([...names, ...prev])).filter(Boolean));
          }
        })
        .catch(() => {});

      if (initialData) {
        const pUrl =
          typeof initialData.poster === "string"
            ? initialData.poster
            : Array.isArray(initialData.poster)
            ? initialData.poster[0]
            : initialData.posterImage?.url || initialData.posterImage || "";
        const bUrl =
          typeof initialData.banner === "string"
            ? initialData.banner
            : Array.isArray(initialData.banner)
            ? initialData.banner[0]
            : initialData.bannerImage?.url || initialData.bannerImage || "";
        const tUrl =
          typeof initialData.thumbnail === "string"
            ? initialData.thumbnail
            : initialData.thumbnailImage?.url || initialData.thumbnailImage || "";
        const trUrl =
          initialData.trailerVideo ||
          initialData.trailerUrl ||
          (Array.isArray(initialData.teaserVideo)
            ? initialData.teaserVideo[0]
            : initialData.teaserVideo) ||
          "";
        const mUrl = initialData.mainVideo || initialData.videoUrl || "";

        const catVal =
          initialData.category?.name ||
          initialData.category ||
          initialData.categoryName ||
          (Array.isArray(initialData.categories) ? initialData.categories[0] : "") ||
          "Movies";

        const prodVal =
          initialData.producer ||
          initialData.uploadedBy?.name ||
          initialData.uploadedBy?.companyName ||
          "Uthsava Studios";

        const genreVal = Array.isArray(initialData.genres)
          ? (typeof initialData.genres[0] === "object" ? initialData.genres[0].name : initialData.genres[0])
          : initialData.genre || "Drama";

        setForm({
          title: initialData.title || "",
          type: initialData.type || initialType || "Movie",
          category: catVal,
          genre: genreVal,
          lang: Array.isArray(initialData.language)
            ? initialData.language[0]
            : initialData.lang || "Hindi",
          year: String(initialData.releaseYear || initialData.year || 2026),
          duration:
            String(
              initialData.duration ||
                (initialData.type === "Series" ? "8" : "120")
            ).replace(/[^0-9]/g, "") || "120",
          description: initialData.description || initialData.shortDescription || "",
          cast: Array.isArray(initialData.cast)
            ? initialData.cast.map((c: any) => c.name || c).join(", ")
            : initialData.cast || "",
          director: initialData.director || "",
          producer: prodVal,
          tags: Array.isArray(initialData.tags)
            ? initialData.tags.join(", ")
            : initialData.tags || "",
          metaTitle: initialData.metaTitle || initialData.title || "",
          metaDesc: initialData.metaDesc || initialData.description || "",
          slug: initialData.slug || "",
          poster: pUrl,
          banner: bUrl,
          thumbnail: tUrl,
          trailerVideo: trUrl,
          mainVideo: mUrl,
        });

        setMediaPreviews({
          poster: pUrl,
          banner: bUrl,
          thumbnail: tUrl,
          trailerVideo: trUrl,
          mainVideo: mUrl,
        });

        setToggles({
          featured: initialData.isFeatured || false,
          trending: initialData.isTrending || false,
          publish: initialData.status !== "Draft" && initialData.status !== "INACTIVE",
          subRequired: initialData.isSubscriptionRequired !== undefined ? initialData.isSubscriptionRequired : true,
          download: initialData.isDownloadEnabled || false,
        });
      } else {
        setForm({
          title: "",
          type: initialType ?? "Movie",
          category: "Movies",
          genre: "Drama",
          lang: "Hindi",
          year: "2026",
          duration: "120",
          description: "",
          cast: "",
          director: "",
          producer: "Uthsava Studios",
          tags: "",
          metaTitle: "",
          metaDesc: "",
          slug: "",
          poster: "",
          banner: "",
          thumbnail: "",
          trailerVideo: "",
          mainVideo: "",
        });
        setMediaPreviews({});
        setToggles({
          featured: false,
          trending: false,
          publish: true,
          subRequired: true,
          download: false,
        });
      }
      setUploadingMedia({});
      setUploadProgress({});
    }
  }, [open, initialData, initialType]);

  const [toggles, setToggles] = useState({
    featured: false,
    trending: false,
    publish: true,
    subRequired: true,
    download: false,
  });
  const [previewMin, setPreviewMin] = useState(5);
  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const tgl = (k: keyof typeof toggles, v: boolean) =>
    setToggles((t) => ({ ...t, [k]: v }));

  // In-card Fast File Upload Handler (No Screen Popups)
  const handleFileUpload = async (
    key: "poster" | "banner" | "thumbnail" | "trailerVideo" | "mainVideo",
    file: File
  ) => {
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setMediaPreviews((prev) => ({ ...prev, [key]: localUrl }));
    setUploadingMedia((prev) => ({ ...prev, [key]: true }));
    setUploadProgress((prev) => ({ ...prev, [key]: "Uploading..." }));

    try {
      const presigned = await getPresignedUrl(file.name, file.type);
      if (presigned?.uploadUrl) {
        await uploadToPresignedUrl(presigned.uploadUrl, file);
        const finalUrl = presigned.fileUrl || presigned.key || localUrl;
        setForm((prev) => ({ ...prev, [key]: finalUrl }));
        setUploadProgress((prev) => ({ ...prev, [key]: "Uploaded ✓" }));
      } else {
        setForm((prev) => ({ ...prev, [key]: localUrl }));
        setUploadProgress((prev) => ({ ...prev, [key]: "Attached ✓" }));
      }
    } catch (err) {
      // Graceful fallback to local preview
      setForm((prev) => ({ ...prev, [key]: localUrl }));
      setUploadProgress((prev) => ({ ...prev, [key]: "Attached ✓" }));
    } finally {
      setUploadingMedia((prev) => ({ ...prev, [key]: false }));
    }
  };

  const submit = (mode: "draft" | "approval" | "publish") => {
    if (!String(form.title || "").trim() || !String(form.producer || "").trim()) {
      toast.error("Title and producer are required");
      return;
    }
    const status = mode === "draft" ? "Inactive" : "Active";
    const approval =
      mode === "publish" ? "APPROVED" : mode === "approval" ? "PENDING" : "DRAFT";

    onCreate(
      {
        title: String(form.title || "").trim(),
        type: form.type,
        category: form.category,
        categories: form.category ? [form.category] : [],
        genre: form.genre,
        genres: form.genre ? [form.genre] : [],
        lang: form.lang,
        year: Number(form.year) || 2026,
        duration:
          form.type === "Series"
            ? `${form.duration} eps`
            : `${form.duration}m`,
        producer: String(form.producer || "").trim(),
        status,
        approval,
        poster: form.poster || undefined,
        banner: form.banner || undefined,
        thumbnail: form.thumbnail || undefined,
        trailerVideo: form.trailerVideo || undefined,
        mainVideo: form.mainVideo || undefined,
        description: form.description || undefined,
        cast: form.cast || undefined,
        director: form.director || undefined,
        tags: form.tags || undefined,
        metaTitle: form.metaTitle || undefined,
        metaDesc: form.metaDesc || undefined,
        isFeatured: toggles.featured,
        isTrending: toggles.trending,
        isSubscriptionRequired: toggles.subRequired,
        isDownloadEnabled: toggles.download,
      },
      initialData?._id || initialData?.id
    );

    toast.success(
      initialData
        ? `"${form.title}" updated successfully`
        : mode === "publish"
        ? `"${form.title}" created & activated`
        : `"${form.title}" saved`
    );
    onOpenChange(false);
    setStep(0);
  };

  // Group 1: Artwork / Images
  const IMAGE_SLOTS = [
    {
      key: "poster" as const,
      badge: "POSTER 2:3",
      label: "Portrait Poster",
      hint: "1080×1620 px · JPG/PNG",
      accept: "image/jpeg,image/png,image/webp",
      isVideo: false,
    },
    {
      key: "banner" as const,
      badge: "BANNER 16:9",
      label: "Hero Banner",
      hint: "1920×1080 px · Hero Carousel",
      accept: "image/jpeg,image/png,image/webp",
      isVideo: false,
    },
    {
      key: "thumbnail" as const,
      badge: "THUMBNAIL",
      label: "Card Thumbnail",
      hint: "640×360 px · Video Grid Card",
      accept: "image/jpeg,image/png,image/webp",
      isVideo: false,
    },
  ];

  // Group 2: Video Streams
  const VIDEO_SLOTS = [
    {
      key: "trailerVideo" as const,
      badge: "TRAILER PREVIEW",
      label: "Official Trailer",
      hint: "MP4 / WebM · Max 200MB",
      accept: "video/mp4,video/webm,video/mkv,video/quicktime",
      isVideo: true,
    },
    {
      key: "mainVideo" as const,
      badge: "FULL MASTER",
      label: form.type === "Series" ? "Episode Video / Trailer" : "Main Master Video",
      hint: "MP4 / HLS / MKV · Master Stream",
      accept: "video/mp4,video/webm,video/mkv,video/quicktime",
      isVideo: true,
    },
  ];

  const renderMediaCard = (slot: typeof IMAGE_SLOTS[0] | typeof VIDEO_SLOTS[0]) => {
    const isUploading = uploadingMedia[slot.key];
    const previewUrl = mediaPreviews[slot.key] || form[slot.key];
    const statusText = uploadProgress[slot.key];
    const inputRef = fileInputRefs[slot.key];

    return (
      <div
        key={slot.key}
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden",
          previewUrl
            ? "border-primary/40 bg-card/90 shadow-sm"
            : "border-dashed border-border/80 bg-secondary/20 hover:border-primary/50 hover:bg-primary/[0.03] p-4 text-center cursor-pointer"
        )}
        onClick={() => {
          if (!previewUrl && !isUploading) {
            inputRef.current?.click();
          }
        }}
      >
        <input
          type="file"
          ref={inputRef}
          accept={slot.accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(slot.key, file);
          }}
        />

        {/* Top Badge & Label */}
        <div className="flex items-center justify-between gap-2 p-3 pb-0">
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
            {slot.badge}
          </span>
          {previewUrl && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Check className="h-3 w-3" /> Ready
            </span>
          )}
        </div>

        {previewUrl ? (
          <div className="p-3 pt-2 space-y-2.5">
            {slot.isVideo ? (
              <div className="relative h-28 w-full rounded-xl overflow-hidden bg-neutral-950 grid place-items-center border border-border/70 shadow-2xs">
                <video
                  src={previewUrl}
                  className="h-full w-full object-cover opacity-75"
                />
                <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-2xs">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white shadow-lg">
                    <Play className="h-4 w-4 fill-white ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-28 w-full rounded-xl overflow-hidden bg-neutral-950 border border-border/70 shadow-2xs">
                <img
                  src={previewUrl}
                  alt={slot.label}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold truncate text-foreground">{slot.label}</div>
                <div className="text-[10px] text-muted-foreground">{slot.hint}</div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-secondary/80 px-2.5 text-[11px] font-semibold hover:bg-secondary hover:text-foreground transition cursor-pointer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setForm((prev) => ({ ...prev, [slot.key]: "" }));
                    setMediaPreviews((prev) => ({
                      ...prev,
                      [slot.key]: "",
                    }));
                    setUploadProgress((prev) => ({
                      ...prev,
                      [slot.key]: "",
                    }));
                  }}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 transition cursor-pointer"
                  title="Remove asset"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary/70 border border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/10 transition-all duration-200 shadow-2xs">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : slot.isVideo ? (
                <VideoIcon className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {slot.label}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {isUploading ? "Uploading file..." : slot.hint}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={isUploading}
              className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-3.5 text-xs font-semibold hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition cursor-pointer shadow-2xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Browse files
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{initialData ? "Edit Content" : "Upload New Content"}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {form.type}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {initialData
                  ? "Update metadata, upload replacement media, and save changes."
                  : "Multi-step studio release wizard for movies, series, episodes and trailers."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper */}
        <div className="mt-3 bg-secondary/40 p-1.5 rounded-2xl border border-border/50">
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === step;
              const isCompleted = i < step;

              return (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-card text-foreground shadow-xs font-semibold border border-border/60"
                        : isCompleted
                        ? "text-muted-foreground hover:text-foreground hover:bg-card/50"
                        : "text-muted-foreground/70 hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px] font-bold transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : isCompleted
                          ? "bg-emerald-500/20 text-emerald-500 font-bold"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : i + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold leading-tight">{s.label}</div>
                      <div className="hidden sm:block truncate text-[9px] text-muted-foreground/80">{s.desc}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-5">
          {/* STEP 0: BASICS */}
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-in fade-in duration-200">
              <div className="sm:col-span-2">
                <Field label="Content Title" required>
                  <input
                    className={inputCls}
                    value={form.title}
                    onChange={(e) => upd("title", e.target.value)}
                    placeholder="e.g., Mumbai Diaries Season 2"
                  />
                </Field>
              </div>

              <Field label="Content Type">
                <CustomSelect
                  value={form.type}
                  onChange={(val) => upd("type", val)}
                  placeholder="Select Content Type"
                  options={["Movie", "Series", "Episode", "Documentary", "Short Film"]}
                />
              </Field>

              <Field label="Content Category">
                <CustomSelect
                  value={form.category || "Movies"}
                  onChange={(val) => upd("category", val)}
                  placeholder="Select Category"
                  options={categoryOptions}
                />
              </Field>

              <Field label="Primary Genre">
                <CustomSelect
                  value={form.genre}
                  onChange={(val) => upd("genre", val)}
                  placeholder="Select Primary Genre"
                  options={genreOptions}
                />
              </Field>

              <Field label="Producer / Production Studio" required>
                <CustomSelect
                  value={form.producer}
                  onChange={(val) => upd("producer", val)}
                  placeholder="Select Producer"
                  options={producerOptions}
                />
              </Field>

              <Field label="Primary Language">
                <CustomSelect
                  value={form.lang}
                  onChange={(val) => upd("lang", val)}
                  placeholder="Select Primary Language"
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
                />
              </Field>

              <Field label="Release Year">
                <input
                  type="number"
                  className={inputCls}
                  value={form.year}
                  onChange={(e) => upd("year", e.target.value)}
                />
              </Field>

              <Field
                label={
                  form.type === "Series"
                    ? "Total Episodes"
                    : "Duration (in minutes)"
                }
              >
                <input
                  type="number"
                  className={inputCls}
                  value={form.duration}
                  onChange={(e) => upd("duration", e.target.value)}
                  placeholder={form.type === "Series" ? "8" : "120"}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Director">
                  <input
                    className={inputCls}
                    value={form.director}
                    onChange={(e) => upd("director", e.target.value)}
                    placeholder="Director name..."
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Cast Members (comma separated)">
                  <input
                    className={inputCls}
                    value={form.cast}
                    onChange={(e) => upd("cast", e.target.value)}
                    placeholder="Mohit Raina, Konkona Sen Sharma, Tina Desai"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Keywords & Search Tags">
                  <input
                    className={inputCls}
                    value={form.tags}
                    onChange={(e) => upd("tags", e.target.value)}
                    placeholder="medical, thriller, mumbai, drama"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Synopsis / Overview">
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                    value={form.description}
                    onChange={(e) => upd("description", e.target.value)}
                    placeholder="Enter storyline, logline, or plot synopsis..."
                  />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 1: MEDIA UPLOAD (BALANCED & GROUPED) */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Artwork & Graphics Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-foreground">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Artwork & Posters</span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    3 Image Assets
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {IMAGE_SLOTS.map((slot) => renderMediaCard(slot))}
                </div>
              </div>

              {/* Video Assets Section */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-foreground">
                    <VideoIcon className="h-4 w-4 text-primary" />
                    <span>Video Masters & Stream Files</span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    2 Video Assets
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {VIDEO_SLOTS.map((slot) => renderMediaCard(slot))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OTT CONTROLS */}
          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {[
                {
                  k: "featured",
                  l: "Featured on Home Hero",
                  h: "Pin title to the top featured promotional carousel banner.",
                  icon: Sparkles,
                },
                {
                  k: "trending",
                  l: "Trending Recommendation",
                  h: "Highlight this title under the Trending Now section.",
                  icon: TrendingUp,
                },
                {
                  k: "subRequired",
                  l: "Subscription Required",
                  h: "Restrict full viewing to paid VIP/Premium subscribers only.",
                  icon: Lock,
                },
                {
                  k: "download",
                  l: "Allow Offline Downloads",
                  h: "Enable viewers to download content offline inside mobile apps.",
                  icon: Download,
                },
              ].map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.k}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 p-4 shadow-2xs hover:border-primary/30 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-secondary/80 text-foreground shrink-0 border border-border/50">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{r.l}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{r.h}</div>
                      </div>
                    </div>
                    <Switch
                      checked={toggles[r.k as keyof typeof toggles]}
                      onCheckedChange={(v) =>
                        tgl(r.k as keyof typeof toggles, v)
                      }
                    />
                  </div>
                );
              })}

              <div className="p-4 rounded-2xl border border-border/70 bg-card/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Free Preview Duration</span>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    {previewMin} Minutes
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={previewMin}
                  onChange={(e) => setPreviewMin(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">
                  Unregistered & free users can watch this many minutes before subscription paywall prompts.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: SEO & PUBLISH */}
          {step === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <Field label="SEO Meta Title">
                <input
                  className={inputCls}
                  value={form.metaTitle}
                  onChange={(e) => upd("metaTitle", e.target.value)}
                  maxLength={60}
                  placeholder="Title optimized for Google & search engines"
                />
              </Field>

              <Field label="SEO Meta Description">
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/40 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                  value={form.metaDesc}
                  onChange={(e) => upd("metaDesc", e.target.value)}
                  maxLength={160}
                  placeholder="Summary snippet displayed on search engine results..."
                />
              </Field>

              <Field label="Custom Slug URL">
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={(e) => upd("slug", e.target.value)}
                  placeholder="mumbai-diaries-s2"
                />
              </Field>

              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 p-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      Publish & Activate Live Immediately
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      If disabled, content will be saved into the draft queue.
                    </div>
                  </div>
                </div>
                <Switch
                  checked={toggles.publish}
                  onCheckedChange={(v) => tgl("publish", v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="mt-6 pt-4 border-t border-border/60 flex-row items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-card/80 px-4 text-xs font-semibold hover:bg-secondary hover:text-foreground disabled:opacity-40 transition cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            {step === STEPS.length - 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => submit("draft")}
                  className="h-10 rounded-xl border border-border/80 bg-card/80 px-4 text-xs font-semibold hover:bg-secondary hover:text-foreground transition cursor-pointer active:scale-[0.98]"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => submit("approval")}
                  className="h-10 rounded-xl border border-warning/40 bg-warning/10 px-4 text-xs font-bold text-warning hover:bg-warning/20 transition cursor-pointer active:scale-[0.98]"
                >
                  Submit for Approval
                </button>
                <button
                  type="button"
                  onClick={() => submit("publish")}
                  className="h-10 rounded-xl bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary px-5 text-xs font-bold text-white shadow-md shadow-primary/25 transition cursor-pointer active:scale-[0.98]"
                >
                  Publish Now
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-rose-600 hover:from-rose-600 hover:to-primary px-5 text-xs font-bold text-white shadow-md shadow-primary/25 transition cursor-pointer active:scale-[0.98]"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
