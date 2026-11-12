import { cn } from "@/lib/utils";
import React from "react";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl bg-secondary/80 dark:bg-muted/30 relative overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

/**
 * Reusable Skeleton for Data Tables
 */
function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full space-y-3 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 bg-card/30 rounded-xl"
        >
          {/* Avatar / Poster Thumbnail */}
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />

          {/* Title & Subtitle */}
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton
              className="h-4 rounded-md"
              style={{ width: `${Math.min(100, 35 + (i % 3) * 20)}%` }}
            />
            <Skeleton className="h-3 w-28 rounded-md opacity-60" />
          </div>

          {/* Dynamic Columns */}
          {Array.from({ length: columns - 2 }).map((_, colIdx) => (
            <div key={colIdx} className="hidden sm:block flex-1">
              <Skeleton
                className="h-4 rounded-md"
                style={{ width: `${Math.min(100, 45 + ((i + colIdx) % 4) * 15)}%` }}
              />
            </div>
          ))}

          {/* Status Badge */}
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />

          {/* Row Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Reusable Skeleton for Content Approval Queue Items
 */
function QueueSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/40 p-3"
        >
          {/* Media Poster Skeleton */}
          <Skeleton className="h-14 w-10.5 shrink-0 rounded-xl" />

          {/* Details */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton
                className="h-4 rounded-md"
                style={{ width: `${50 + (i % 4) * 12}%` }}
              />
              <Skeleton className="h-2 w-2 rounded-full opacity-60" />
            </div>

            <Skeleton className="h-3 w-24 rounded-md opacity-60" />

            <div className="flex items-center gap-2 pt-0.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-md opacity-70" />
              <Skeleton className="h-3 w-14 ml-auto rounded-md opacity-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Reusable Skeleton for Content Approval Details & Video Player View
 */
function MediaDetailSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Video Player Hero Skeleton */}
      <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl overflow-hidden bg-neutral-950/80 border border-border/70 flex flex-col justify-end p-6">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none opacity-40" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <Skeleton className="h-8 w-2/3 max-w-md rounded-lg" />
          <Skeleton className="h-4 w-1/2 max-w-xs rounded-md opacity-70" />
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border border-border/60 bg-card/60">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-md opacity-60" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Synopsis & Review Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Synopsis Skeleton */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border/60 bg-card/60 space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full rounded-md opacity-70" />
            <Skeleton className="h-3.5 w-[90%] rounded-md opacity-70" />
            <Skeleton className="h-3.5 w-[75%] rounded-md opacity-70" />
          </div>

          <div className="pt-3 space-y-2.5">
            <Skeleton className="h-4 w-24 rounded-md" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl border border-border/50 bg-secondary/30">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <Skeleton className="h-3.5 w-full rounded-md" />
                    <Skeleton className="h-2.5 w-12 rounded-md opacity-60" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Review Actions Skeleton */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded-md" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-border/50">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Skeleton for Dashboard KPIs
 */
function KpiCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl border border-border/60 bg-card/60 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-3 w-16 rounded-md opacity-60" />
          </div>
          <Skeleton className="h-6 w-full rounded-md opacity-40" />
        </div>
      ))}
    </div>
  );
}

/**
 * Reusable Skeleton for Categories & Genres
 */
function CategoryCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/20 p-3"
        >
          {/* Icon Skeleton */}
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton
                className="h-4 rounded-md"
                style={{ width: `${Math.min(100, 35 + (i % 3) * 18)}%` }}
              />
              {i % 2 === 0 && (
                <Skeleton className="h-3.5 w-12 rounded-full opacity-60" />
              )}
            </div>
            <Skeleton className="h-2.5 w-36 rounded-md opacity-60" />
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full opacity-70" />
          </div>

          <div className="flex items-center gap-1 shrink-0 border-l border-border/50 pl-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  TableSkeleton,
  QueueSkeleton,
  MediaDetailSkeleton,
  KpiCardsSkeleton,
  CategoryCardsSkeleton,
};
