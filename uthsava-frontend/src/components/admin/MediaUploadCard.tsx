import { useState, useEffect, useRef } from "react";
import { Upload, Play, Eye, X, Film, Image as ImageIcon, Sparkles, Check } from "lucide-react";
import { cn, resolveMedia } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type MediaPreviewData = {
  url: string;
  type: "image" | "video";
  title: string;
};

interface MediaUploadCardProps {
  id: string;
  label: string;
  hint: string;
  accept: string;
  type: "image" | "video";
  file: File | null;
  existingUrl?: string | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  aspectRatio?: "2:3" | "16:9" | "auto";
  badgeText?: string;
}

export function MediaUploadCard({
  id,
  label,
  hint,
  accept,
  type,
  file,
  existingUrl,
  disabled = false,
  onFileChange,
  badgeText,
}: MediaUploadCardProps) {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [removedExisting, setRemovedExisting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRemovedExisting(false);
  }, [existingUrl, file]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl("");
    }
  }, [file]);

  const activeMediaUrl = blobUrl || (!removedExisting ? resolveMedia(existingUrl) : "");
  const hasMedia = Boolean(activeMediaUrl);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileChange(droppedFile);
    }
  };

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group relative flex min-h-[220px] w-full flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300",
          hasMedia
            ? "border-white/15 bg-black/80 shadow-lg shadow-black/40 hover:border-primary/50"
            : "border-dashed border-border/80 bg-secondary/20 hover:border-primary/50 hover:bg-primary/5",
          isDragging && "border-primary bg-primary/10 scale-[1.01] ring-2 ring-primary/20",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        {/* Background Preview */}
        {hasMedia && (
          <>
            {type === "image" ? (
              <img
                src={activeMediaUrl}
                alt={label}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <video
                src={activeMediaUrl}
                muted
                playsInline
                autoPlay
                loop
                className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none"
              />
            )}
            {/* Cinematic Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/35 backdrop-blur-[1px] transition-opacity duration-300" />
          </>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          id={id}
          className="sr-only"
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            onFileChange(selected);
            if (e.target) e.target.value = "";
          }}
        />

        {/* Card Content */}
        {hasMedia ? (
          /* Media Present State */
          <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between p-4">
            {/* Top Bar: Badges and Remove Action */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md border border-white/15 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                <span className="font-semibold">{label}</span>
                {badgeText && (
                  <span className="ml-1 border-l border-white/20 pl-1.5 text-white/70 text-[10px]">
                    {badgeText}
                  </span>
                )}
              </div>

              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileChange(null);
                    setRemovedExisting(true);
                  }}
                  title="Remove asset"
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-md border border-white/15 transition-all hover:bg-destructive/80 hover:text-white hover:border-destructive shadow-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Center Area: Glowing Glassmorphic Preview Button */}
            <div className="my-auto flex flex-col items-center justify-center py-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="group/btn inline-flex items-center gap-2.5 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md border border-white/25 shadow-xl shadow-black/60 transition-all duration-300 hover:scale-105 hover:bg-primary hover:border-primary hover:shadow-primary/30 active:scale-95 cursor-pointer"
              >
                {type === "video" ? (
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-white text-black group-hover/btn:bg-white group-hover/btn:text-primary transition-colors shadow-sm">
                    <Play className="h-3 w-3 fill-current ml-0.5" />
                  </div>
                ) : (
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white group-hover/btn:bg-white group-hover/btn:text-primary transition-colors">
                    <Eye className="h-3 w-3" />
                  </div>
                )}
                <span>
                  Preview{" "}
                  {type === "video"
                    ? label.toLowerCase().includes("trailer")
                      ? "Trailer"
                      : "Video"
                    : label.toLowerCase().includes("thumbnail")
                      ? "Thumbnail"
                      : "Poster"}
                </span>
              </button>
            </div>

            {/* Bottom Bar: File Details & Change Button */}
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white drop-shadow-sm">
                  {file ? file.name : "Current file active"}
                </p>
                <p className="text-[10px] text-white/70">
                  {file ? formatFileSize(file.size) : hint}
                </p>
              </div>

              {!disabled && (
                <label
                  htmlFor={id}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-md border border-white/15 transition hover:bg-black/90 hover:border-white/30 cursor-pointer shadow-sm"
                >
                  <Upload className="h-3 w-3" />
                  Change
                </label>
              )}
            </div>
          </div>
        ) : (
          /* Empty / Upload State */
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card border border-border/80 text-muted-foreground shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary/40 group-hover:text-primary group-hover:shadow-md">
              {type === "video" ? <Film className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
            </div>

            <div className="mt-3 text-sm font-semibold text-foreground tracking-tight">{label}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>

            <div className="mt-4 flex items-center gap-2">
              <label
                htmlFor={id}
                className={cn(
                  "inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-secondary hover:border-primary/30 hover:scale-105 active:scale-95 cursor-pointer",
                  disabled && "pointer-events-none opacity-50",
                )}
              >
                <Upload className="h-3.5 w-3.5 text-primary" />
                Browse files
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Cinematic Preview Lightbox / Player Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border border-white/15 text-white shadow-2xl rounded-2xl">
          <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900/90 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              {type === "video" ? (
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <Film className="h-4 w-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
              <div>
                <DialogTitle className="text-sm font-semibold text-white">{label} Preview</DialogTitle>
                <p className="text-[11px] text-muted-foreground">{hint}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative min-h-[300px] max-h-[75vh] flex items-center justify-center p-4 bg-black/90">
            {type === "video" ? (
              <video
                key={activeMediaUrl}
                src={activeMediaUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[70vh] w-full rounded-xl object-contain shadow-2xl bg-black"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={activeMediaUrl}
                alt={label}
                className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
