import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DataTable, Column, RowAction } from "@/components/admin/DataTable";
import { PageHeader, StatusPill, Surface } from "@/components/admin/Primitives";
import {
  fetchMovies,
  getMovieById,
  createMovie,
  deleteMovie,
  updateMovie,
} from "@/lib/services/movies";
import {
  fetchContentGenres,
  fetchContentCategories,
  updateContentStatus,
  type ContentGenre,
} from "@/lib/services/content";
import { Star, Film, Eye, Pencil, Trash2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddMovieDialog, NewMovie } from "@/components/admin/AddMovieDialog";
import { ViewSheet } from "@/components/admin/ViewSheet";
import {
  displayLanguage,
  displayPrimaryLanguage,
  formatMovieDuration,
  formatProducerName,
} from "@/lib/services/content-approval";
import { toast } from "sonner";

export const Route = createFileRoute("/movies")({
  head: () => ({ meta: [{ title: "Movies — Uthsava Admin" }] }),
  component: MoviesPage,
});

type C = any;

function MoviesPage() {
  const [rows, setRows] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<ContentGenre[]>([]);
  const [categories, setCategories] = useState<ContentGenre[]>([]);
  const [editingMovie, setEditingMovie] = useState<C | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [movies, genreList, categoryList] = await Promise.all([
          fetchMovies(),
          fetchContentGenres(),
          fetchContentCategories(),
        ]);
        setRows(movies);
        setGenres(genreList);
        setCategories(categoryList);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<C | null>(null);

  const handleApproval = async (id: string, approvalStatus: "APPROVED" | "REJECTED") => {
    try {
      if (!id) {
        toast.error("Movie ID is missing");
        return;
      }

      const newStatus = approvalStatus === "APPROVED" ? "ACTIVE" : "INACTIVE";

      // Update backend
      await updateMovie(id, {
        approvalStatus,
        status: newStatus,
      });

      // Get fresh data from backend
      const movies = await fetchMovies();
      setRows(movies);

      // Update the currently opened movie
      const updatedMovie = movies.find((movie: any) => (movie._id ?? movie.id) === id);

      if (updatedMovie) {
        setView(updatedMovie);
      } else {
        setView((current: any) =>
          current
            ? {
                ...current,
                approvalStatus,
                status: newStatus,
              }
            : current,
        );
      }

      toast.success(
        approvalStatus === "APPROVED"
          ? "Movie approved successfully"
          : "Movie rejected successfully",
      );
    } catch (error: any) {
      console.error("APPROVAL UPDATE ERROR:", error);

      toast.error(
        error?.message || `Failed to ${approvalStatus === "APPROVED" ? "approve" : "reject"} movie`,
      );
    }
  };

  const openMovieDetails = async (movie: C) => {
    try {
      setView(movie);

      const movieId = (movie as any)._id ?? (movie as any).id;
      if (!movieId) {
        throw new Error("Movie ID is missing.");
      }
      const detailsResponse = await getMovieById(movieId);
      const details =
        (detailsResponse as any)?.results?.content ??
        (detailsResponse as any)?.content ??
        detailsResponse;

      const normalizedMovie = {
        ...movie,
        ...details,

        // Keep the frontend ID
        id: details?._id ?? movieId,
        _id: details?._id ?? movieId,

        // Descriptions
        shortDescription: details?.shortDescription ?? details?.shortDesc ?? details?.synopsis ?? details?.overview ?? movie.shortDescription ?? (movie as any)?.shortDesc ?? "",
        shortDesc: details?.shortDescription ?? details?.shortDesc ?? details?.synopsis ?? details?.overview ?? movie.shortDescription ?? (movie as any)?.shortDesc ?? "",
        description: details?.description ?? details?.fullDesc ?? details?.desc ?? details?.overview ?? movie.description ?? (movie as any)?.fullDesc ?? "",
        fullDesc: details?.description ?? details?.fullDesc ?? details?.desc ?? details?.overview ?? movie.description ?? (movie as any)?.fullDesc ?? "",

        // Normalize categories and category
        categories: details?.categories ?? details?.category ?? movie.categories ?? (movie.category ? [movie.category] : []),
        category:
          (Array.isArray(details?.category) ? details.category[0] : details?.category) ??
          (Array.isArray(details?.categories) ? details.categories[0] : details?.categories) ??
          movie.category,

        // Normalize language
        language: details?.language ?? details?.languageIds ?? (details as any)?.lang ?? movie.language ?? (movie as any)?.lang ?? [],
        lang: (Array.isArray(details?.language) ? details.language[0] : details?.language) ?? (movie as any)?.lang,

        subtitles:
          details?.subtitles ??
          details?.subtitleLanguages ??
          details?.subtitle ??
          (movie as any)?.subtitles ??
          (movie as any)?.subtitleLanguages ??
          (Array.isArray(details?.language) && details.language.length > 1 ? details.language.slice(1) : undefined),
        subtitleLanguages:
          details?.subtitleLanguages ??
          details?.subtitles ??
          (movie as any)?.subtitleLanguages ??
          (movie as any)?.subtitles,

        // Normalize release date, release year, duration
        releaseDate: details?.releaseDate ?? details?.contentReleaseDate ?? movie.releaseDate ?? "",
        releaseYear: details?.releaseYear ?? movie.releaseYear ?? movie.year,
        duration: details?.duration ?? movie.duration,

        // Backend: poster: []
        // Frontend ViewSheet: posterUrl
        posterUrl: details?.poster?.[0] ?? details?.posterUrl ?? movie.posterUrl,

        // Backend: thumbnail
        // Frontend: thumbnailUrl
        thumbnailUrl: details?.thumbnail ?? details?.thumbnailUrl ?? movie.thumbnailUrl,

        // Backend: mainVideo
        // Frontend ViewSheet: videoUrl
        videoUrl: details?.mainVideo ?? details?.videoUrl ?? movie.videoUrl,

        // Backend: teaserVideo: []
        // Frontend: trailerUrl
        trailerUrl: details?.teaserVideo?.[0] ?? details?.trailerUrl ?? movie.trailerUrl,

        reEditRequestedReason: details?.reEditRequestedReason ?? (movie as any)?.reEditRequestedReason ?? details?.approvalNotes,
        rejectionReason: details?.rejectionReason ?? movie.rejectionReason,
        approvalNotes: details?.approvalNotes ?? (movie as any)?.approvalNotes,
      };
      setView(normalizedMovie as C);
    } catch (error) {
      console.error("FAILED TO LOAD MOVIE DETAILS:", error);

      toast.error(error instanceof Error ? error.message : "Failed to load movie details.");
    }
  };

  const handleStatusToggle = async (movie: C) => {
    try {
      const movieId = (movie as any)._id ?? (movie as any).id;

      if (!movieId) {
        toast.error("Movie ID is missing");
        return;
      }

      const currentIsActive = (movie as any).isActive === true || (movie.status || "").toUpperCase() === "ACTIVE";
      const newIsActive = !currentIsActive;
      const newStatus = newIsActive ? "ACTIVE" : "INACTIVE";

      await updateContentStatus(movieId, newIsActive);

      setRows((prev) =>
        prev.map((item) => {
          const itemId = (item as any)._id ?? (item as any).id;

          return itemId === movieId
            ? {
                ...item,
                status: newStatus,
                isActive: newIsActive,
              }
            : item;
        }),
      );

      toast.success(
        newIsActive ? `${movie.title} activated successfully.` : `${movie.title} deactivated successfully.`,
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to update movie status");
    }
  };

  const cols: Column<C>[] = [
    {
      key: "title",
      header: "Movie",
      accessor: (r) => {
        const genreNames = (r.genres ?? [])
          .map((genre: any) => {
            if (typeof genre === "string") {
              return genres.find((g) => g._id === genre)?.name ?? genre;
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
            {r.title.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {r.title}
              {r.featured && <Star className="h-3 w-3 fill-warning text-warning" />}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Film className="h-3 w-3" />
              <span className="truncate">
                Movie ·{" "}
                {(r.genres ?? [])
                  .map((id: any) => genres.find((g) => g._id === id)?.name ?? id)
                  .join(", ")}{" "}
                · {displayPrimaryLanguage(r.language)}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      accessor: (r) => formatMovieDuration(r.duration),
      render: (r) => formatMovieDuration(r.duration),
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
        (r as any).uploadedBy?.companyName ||
        (r as any).uploadedBy?.fullName ||
        (r as any).uploadedBy?.name ||
        "-",
      render: (r) =>
        r.producer ||
        (r as any).uploadedBy?.companyName ||
        (r as any).uploadedBy?.fullName ||
        (r as any).uploadedBy?.name ||
        "-",
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
        const approval = (r.approvalStatus || (r as any).approval || "").toUpperCase();
        if (approval === "APPROVED") {
          return (r.status?.toUpperCase() === "ACTIVE" || (r as any).isActive !== false) ? "ACTIVE" : "INACTIVE";
        }
        if (["PENDING", "AWAITING", "UNDER_REVIEW"].includes(approval)) {
          return "PENDING";
        }
        if (approval === "DRAFT") {
          return "DRAFT";
        }
        return "INACTIVE";
      },
      render: (r) => {
        const approval = (r.approvalStatus || (r as any).approval || "").toUpperCase();
        const isApproved = approval === "APPROVED";
        const isPending = ["PENDING", "AWAITING", "UNDER_REVIEW"].includes(approval);

        let status = "inactive";
        if (isApproved) {
          status = (r.status?.toLowerCase() === "active" && (r as any).isActive !== false) ? "active" : "inactive";
        } else if (isPending) {
          status = "pending";
        } else if (approval === "DRAFT") {
          status = "draft";
        } else {
          status = "inactive";
        }

        return (
          <button
            type="button"
            title={
              !isApproved
                ? "Cannot be activated until the movie is approved"
                : `Click to mark as ${status === "active" ? "INACTIVE" : "ACTIVE"}`
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!isApproved) {
                toast.error("Status cannot be activated until the movie is approved");
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

  const actions: RowAction<C>[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (r) => void openMovieDetails(r),
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: async (r) => {
        try {
          const movieId = (r as any)._id ?? (r as any).id;

          if (!movieId) {
            toast.error("Movie ID is missing");
            return;
          }

          const response = await getMovieById(movieId);

          const details =
            (response as any)?.results?.content ?? (response as any)?.content ?? response;

          const fullMovie = {
            ...r,
            ...details,

            _id: details?._id ?? movieId,
            id: details?._id ?? movieId,

            shortDescription: details?.shortDescription ?? details?.shortDesc ?? details?.synopsis ?? details?.overview ?? (r as any).shortDescription ?? (r as any).shortDesc ?? "",
            shortDesc: details?.shortDescription ?? details?.shortDesc ?? details?.synopsis ?? details?.overview ?? (r as any).shortDescription ?? (r as any).shortDesc ?? "",
            description: details?.description ?? details?.fullDesc ?? details?.desc ?? details?.overview ?? (r as any).description ?? (r as any).fullDesc ?? "",
            fullDesc: details?.description ?? details?.fullDesc ?? details?.desc ?? details?.overview ?? (r as any).description ?? (r as any).fullDesc ?? "",

            categories: details?.categories ?? details?.category ?? r.categories ?? (r.category ? [r.category] : []),
            category:
              (Array.isArray(details?.category) ? details.category[0] : details?.category) ??
              (Array.isArray(details?.categories) ? details.categories[0] : details?.categories) ??
              r.category,

            language: details?.language ?? details?.languageIds ?? (details as any)?.lang ?? r.language ?? (r as any).lang,
            lang: (Array.isArray(details?.language) ? details.language[0] : details?.language) ?? (details as any)?.lang ?? (r as any).lang,

            subtitles:
              details?.subtitles ??
              details?.subtitleLanguages ??
              details?.subtitle ??
              (r as any).subtitles ??
              (r as any).subtitleLanguages ??
              (Array.isArray(details?.language) && details.language.length > 1 ? details.language.slice(1) : undefined),
            subtitleLanguages:
              details?.subtitleLanguages ??
              details?.subtitles ??
              (r as any).subtitleLanguages ??
              (r as any).subtitles,

            releaseDate: details?.releaseDate ?? details?.contentReleaseDate ?? r.releaseDate ?? "",
            releaseYear: details?.releaseYear ?? r.releaseYear ?? (r as any).year,
            duration: details?.duration ?? r.duration,

            // Backend → frontend media names
            posterUrl: details?.poster?.[0] ?? details?.posterUrl ?? r.posterUrl,

            thumbnailUrl: details?.thumbnail ?? details?.thumbnailUrl ?? r.thumbnailUrl,

            videoUrl: details?.mainVideo ?? details?.videoUrl ?? r.videoUrl,

            trailerUrl: details?.teaserVideo?.[0] ?? details?.trailerUrl ?? r.trailerUrl,
          };

          setEditingMovie(fullMovie as C);
          setOpen(true);
        } catch (error: any) {
          console.error("FAILED TO LOAD MOVIE FOR EDIT:", error);

          toast.error(error?.message || "Failed to load movie details");
        }
      },
    },
    {
      label: "Delete",
      icon: Trash2,
      destructive: true,
      onClick: async (r) => {
        try {
          const movieId = (r as any)._id ?? (r as any).id;

          if (!movieId) {
            toast.error("Movie ID is missing");
            return;
          }

          await deleteMovie(movieId);

          // Remove from UI only after backend deletion succeeds
          setRows((prev) =>
            prev.filter((item) => {
              const itemId = (item as any)._id ?? (item as any).id;
              return itemId !== movieId;
            }),
          );

          toast.success(`${r.title} deleted successfully`);
        } catch (error: any) {
          console.error("MOVIE DELETE ERROR:", error);

          toast.error(error?.message || "Failed to delete movie");
        }
      },
    },
  ];

  const handleCreate = async (c: any) => {
    try {
      console.log("========== MOVIE CREATE DATA ==========");
      console.log(JSON.stringify(c, null, 2));

      // Do not send the request if required media is missing
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
        categories: (c as any).categories?.length
          ? (c as any).categories
          : (c as any).category
            ? [(c as any).category]
            : [],
        category: (c as any).category,
        language: c.lang ? [c.lang] : (c as any).language?.length ? (c as any).language : ["Hi"],
        lang: c.lang || "Hi",

        duration: Number(c.duration),
        releaseYear: Number(c.year),
        releaseDate: c.releaseDate,

        producer: c.producer,

        shortDescription: c.shortDescription ?? (c as any).shortDesc ?? "",
        shortDesc: c.shortDescription ?? (c as any).shortDesc ?? "",
        description: c.description ?? (c as any).fullDesc ?? "",
        fullDesc: c.description ?? (c as any).fullDesc ?? "",

        ageRating: (c as any).ageRating ?? "",

        cast: (c as any).cast ?? [],
        crew: (c as any).crew ?? [],

        tags: (c as any).tags ?? [],
        country: (c as any).country ?? "India",

        imdb: (c as any).imdb ?? null,

        subtitles: (c as any).subtitles ?? [],
        subtitleLanguages: (c as any).subtitleLanguages ?? (c as any).subtitles ?? [],

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

      console.log("========== FINAL MOVIE PAYLOAD ==========");
      console.log(JSON.stringify(payload, null, 2));

      const response = await createMovie(payload);

      console.log("========== MOVIE CREATE RESPONSE ==========");
      console.log(response);

      if (!response || response.success === false || Number(response.status) >= 400) {
        throw new Error(response?.message || "Movie could not be created");
      }

      const created =
        response?.results?.content ?? response?.results ?? response?.content ?? response;

      setRows((prev) => [created, ...prev]);

      toast.success("Movie created successfully");
    } catch (error: any) {
      console.error("MOVIE CREATE ERROR:", error);

      toast.error(error?.message || "Failed to create movie");

      throw error;
    }
  };

  const handleUpdate = async (id: string, payload: any) => {
    try {
      console.log("========== MOVIE UPDATE ==========");
      console.log("Movie ID:", id);
      console.log("Update Payload:", payload);

      const updatePayload = {
        ...payload,

        type: "MOVIE",

        genres: payload.genre ? [payload.genre] : (payload.genres ?? []),
        categories: payload.category
          ? [payload.category]
          : (payload.categories ?? []),
        category: payload.category,

        language: payload.lang ? [payload.lang] : (payload.language ?? []),
        lang: payload.lang,

        shortDescription: payload.shortDescription ?? payload.shortDesc ?? "",
        shortDesc: payload.shortDescription ?? payload.shortDesc ?? "",
        description: payload.description ?? payload.fullDesc ?? "",
        fullDesc: payload.description ?? payload.fullDesc ?? "",

        subtitles: payload.subtitles ?? [],
        subtitleLanguages: payload.subtitleLanguages ?? payload.subtitles ?? [],

        releaseDate: payload.releaseDate,
        releaseYear: payload.year ? Number(payload.year) : payload.releaseYear,
        duration: payload.duration ? Number(payload.duration) : undefined,
      };

      delete updatePayload.genre;
      delete updatePayload.year;

      console.log("FINAL UPDATE PAYLOAD:");
      console.log(JSON.stringify(updatePayload, null, 2));

      const response = await updateMovie(id, updatePayload);

      console.log("UPDATE API RESPONSE:");
      console.log(response);

      const movies = await fetchMovies();

      setRows(movies);

      toast.success("Movie updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update movie");
      throw error;
    }
  };
  return (
    <>
      <PageHeader
        title="Movies"
        description="All movies in the Uthsava catalog."
        actions={
          <button
            onClick={() => {
              setEditingMovie(null);
              setOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Add Movie
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {[
          { l: "Total Movies", v: rows.length.toLocaleString() },
          {
            l: "Pending Approvals",
            v: rows.filter((r) => ["PENDING", "AWAITING", "UNDER_REVIEW"].includes((r.approvalStatus || (r as any).approval || "").toUpperCase())).length,
            tone: "text-warning",
          },
          {
            l: "Holded for 24hrs",
            v: rows.filter((r) => ["ON_HOLD", "HOLD"].includes((r.approvalStatus || (r as any).approval || "").toUpperCase())).length,
            tone: "text-amber-500",
          },
          {
            l: "Re-edit Requested",
            v: rows.filter((r) => ["RE_EDIT_REQUESTED"].includes((r.approvalStatus || (r as any).approval || "").toUpperCase()) || Boolean((r as any).reEditRequestedReason)).length,
            tone: "text-rose-400",
          },
          {
            l: "Published",
            v: rows.filter((r) => r.approvalStatus?.toUpperCase() === "APPROVED" && ((r.status || "").toUpperCase() === "ACTIVE" || (r as any).isActive !== false)).length,
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
        exportFileName="movies"
        searchKeys={["title", "producer", "genre", "lang"]}
        filters={[
          {
            label: "Genre",
            options: genres.map((g) => g.name),
            getValue: (r) =>
              (r.genres ?? [])
                .map((genre: any) => {
                  if (typeof genre === "string") {
                    return genres.find((g) => g._id === genre)?.name ?? genre;
                  }

                  return (
                    genre.name ?? genres.find((g) => g._id === (genre._id ?? genre.id))?.name ?? ""
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
            options: ["Approved", "Pending", "Holded for 24hrs", "Re-edit Requested", "Draft", "Rejected"],
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
          { label: "Status", options: ["ACTIVE", "INACTIVE"] },
        ]}
        primaryAction={{
          label: "Add Movie",
          onClick: () => {
            setEditingMovie(null);
            setOpen(true);
          },
        }}
        rowActions={actions}
        onRowClick={(r) => void openMovieDetails(r)}
        emptyState={{
          title: "No movies yet",
          description: "Upload your first movie to start streaming.",
          ctaLabel: "Add Movie",
          onCta: () => {
            setEditingMovie(null);
            setOpen(true);
          },
        }}
      />
      <AddMovieDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);

          if (!value) {
            setEditingMovie(null);
          }
        }}
        movie={editingMovie}
        genres={genres}
        categories={categories}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ViewSheet
        open={!!view}
        onOpenChange={(o) => !o && setView(null)}
        title={view?.title ?? ""}
        subtitle={
          view
            ? `Movie · ${view.genres
                ?.map((id: any) => genres.find((g) => g._id === id)?.name ?? id)
                .join(", ")} · ${displayLanguage(view.language)}`
            : ""
        }
        status={view?.approvalStatus || view?.status}
        hero={
          view ? (
            <div className="relative w-full overflow-hidden rounded-xl bg-black">
              {view.videoUrl ? (
                <video
                  key={view.videoUrl}
                  src={view.videoUrl}
                  poster={view.posterUrl}
                  controls
                  preload="metadata"
                  className="h-56 w-full object-contain"
                />
              ) : view.posterUrl ? (
                <img
                  src={view.posterUrl}
                  alt={`${view.title} poster`}
                  className="h-56 w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="grid h-56 place-items-center text-sm text-muted-foreground">
                  Video not available
                </div>
              )}

              <div className="absolute bottom-2 left-3 rounded bg-background/70 px-2 py-1 text-[11px] text-foreground backdrop-blur">
                {formatMovieDuration(view.duration)}
              </div>
            </div>
          ) : null
        }
        sections={
          view
            ? [
                {
                  title: "Metadata",
                  rows: [
                    {
                      label: "Short Description",
                      value: view.shortDescription || (view as any).shortDesc || "—",
                    },
                    {
                      label: "Full Description",
                      value: view.description || (view as any).fullDesc || "—",
                    },
                    {
                      label: "Category",
                      value: (() => {
                        const movieCats = view.categories ?? (view.category ? [view.category] : []);
                        if (Array.isArray(movieCats) && movieCats.length > 0) {
                          const resolved = movieCats
                            .map((item: any) => {
                              const idOrName = typeof item === "object" ? item._id || item.name : item;
                              return (
                                categories.find((c) => c._id === idOrName || c.name === idOrName)?.name ??
                                (typeof item === "object" ? item.name : idOrName)
                              );
                            })
                            .filter(Boolean);
                          if (resolved.length > 0) return resolved.join(", ");
                        }
                        const single = categories.find(
                          (c) =>
                            c._id === view.categoryId ||
                            c._id === view.categoryIds?.[0] ||
                            c._id === view.category ||
                            c.name === view.category
                        );
                        return single?.name ?? (typeof view.category === "object" ? (view.category as any)?.name : view.category) ?? "—";
                      })(),
                    },
                    {
                      label: "Genre",
                      value:
                        view.genres
                          ?.map((id: any) => genres.find((g) => g._id === id)?.name ?? id)
                          .join(", ") ?? "-",
                    },
                    { label: "Language", value: displayLanguage(view.language) },
                    { label: "Duration", value: formatMovieDuration(view.duration) },
                    {
                      label: "Release Date",
                      value: view.releaseDate || (view as any).contentReleaseDate
                        ? new Date(view.releaseDate || (view as any).contentReleaseDate).toLocaleDateString("en-GB")
                        : view.releaseYear ? String(view.releaseYear) : "—",
                    },
                    { label: "Year", value: view.releaseYear ?? "-" },
                    {
                      label: "Producer",
                      value:
                        view.producer ||
                        (view as any).uploadedBy?.companyName ||
                        (view as any).uploadedBy?.fullName ||
                        (view as any).uploadedBy?.name ||
                        "-",
                    },
                    {
                      label: "Uploaded",
                      value: view.createdAt
                        ? new Intl.DateTimeFormat("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            timeZone: "UTC",
                          }).format(new Date(view.createdAt))
                        : "-",
                    },
                  ],
                },
                {
                  title: "Watch analytics",
                  rows: [
                    { label: "Views", value: (view.viewsCount ?? 0).toLocaleString() },
                    { label: "Revenue", value: `₹${(view.revenue ?? 0).toLocaleString()}` },
                  ],
                },
                {
                  title: "Approval & Publish",
                  rows: [
                    { label: "Approval", value: <StatusPill status={view.approvalStatus} /> },
                    ...(view.approvalStatus?.toUpperCase() === "RE_EDIT_REQUESTED" && ((view as any).reEditRequestedReason || (view as any).approvalNotes)
                      ? [
                          {
                            label: "Re-edit Feedback",
                            value: (
                              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-medium text-amber-500">
                                {(view as any).reEditRequestedReason || (view as any).approvalNotes || "Re-edit requested by administrator"}
                              </div>
                            ),
                          },
                        ]
                      : []),
                    ...(view.approvalStatus?.toUpperCase() === "REJECTED" && view.rejectionReason
                      ? [
                          {
                            label: "Rejection Reason",
                            value: (
                              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs font-medium text-destructive">
                                {view.rejectionReason}
                              </div>
                            ),
                          },
                        ]
                      : []),
                    {
                      label: "Publish status",
                      value: (
                        <StatusPill
                          status={
                            view.approvalStatus?.toUpperCase() === "APPROVED" &&
                            view.status?.toLowerCase() === "active" &&
                            (view as any).isActive !== false
                              ? "ACTIVE"
                              : "INACTIVE"
                          }
                        />
                      ),
                    },
                    { label: "Featured", value: view.isFeatured ? "Yes" : "No" },
                  ],
                },
              ]
            : []
        }
        actions={
          view
            ? [
                ...(view.trailerUrl
                  ? [
                      {
                        label: "Open Trailer",
                        onClick: () =>
                          window.open(view.trailerUrl, "_blank", "noopener,noreferrer"),
                      },
                    ]
                  : []),
                {
                  label: "Edit Movie",
                  variant: "primary" as const,
                  onClick: () => {
                    const toEdit = view;
                    setView(null);
                    setEditingMovie(toEdit);
                    setOpen(true);
                  },
                },
              ]
            : []
        }
      />
    </>
  );
}
