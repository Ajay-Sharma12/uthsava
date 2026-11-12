import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuickAction } from "@/hooks/use-quick-action";
import { QA } from "@/lib/quick-actions";
import { PageHeader, Surface, StatusPill } from "@/components/admin/Primitives";
import {
  fetchResource,
  createResource,
  updateResource,
  deleteResource,
  updateCategoryStatus,
  updateCategoryDisplayOrder,
} from "@/lib/services/resources";
import {
  Sparkles,
  Flame,
  Star,
  Globe,
  Smile,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Tag,
  Layers,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Hash,
  Film,
  Tv2,
  ArrowUpDown,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";
import { AddCategoryDialog, CategoryValue } from "@/components/admin/AddCategoryDialog";
import { AddGenreDialog, GenreValue } from "@/components/admin/AddGenreDialog";
import { ViewSheet } from "@/components/admin/ViewSheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories & Genres — Uthsava Admin" }] }),
  component: CategoriesPage,
});

const ICONS: Record<string, any> = { Sparkles, Flame, Star, Globe, Smile, Tag, Layers };

type CategoryRow = any;
type GenreRow = any;

function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [genres, setGenres] = useState<GenreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"both" | "categories" | "genres">("both");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showSkeleton = true) => {
    try {
      if (showSkeleton) setLoading(true);

      const [categoryRes, genreRes] = await Promise.all([
        fetchResource("/admin/categories", {
          type: "category",
          sortBy: "displayOrder",
          sortOrder: "asc",
        }),
        fetchResource("/admin/categories", {
          type: "genre",
          sortBy: "displayOrder",
          sortOrder: "asc",
        }),
      ]);

      setCategories(categoryRes?.results?.data ?? []);
      setGenres(genreRes?.results?.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Categories and Genres");
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  const [catQ, setCatQ] = useState("");
  const [genQ, setGenQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [genFilter, setGenFilter] = useState("All");

  const [catOpen, setCatOpen] = useState(false);
  const [catEdit, setCatEdit] = useState<CategoryValue | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genEdit, setGenEdit] = useState<GenreValue | null>(null);

  const [viewCat, setViewCat] = useState<CategoryRow | null>(null);
  const [viewGen, setViewGen] = useState<GenreRow | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: "category" | "genre";
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit Display Order modal state
  const [orderTarget, setOrderTarget] = useState<{
    id: string;
    name: string;
    currentOrder: number;
    type: "category" | "genre";
  } | null>(null);
  const [newOrder, setNewOrder] = useState<number | string>(1);
  const [orderDialogError, setOrderDialogError] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  useQuickAction(QA.ADD_CATEGORY, () => {
    setCatEdit(null);
    setCatOpen(true);
  });
  useQuickAction(QA.ADD_GENRE, () => {
    setGenEdit(null);
    setGenOpen(true);
  });

  const saveCategory = async (c: CategoryValue, addAnother?: boolean) => {
    try {
      const displayOrder = Number(c.order ?? (c as any).displayOrder ?? 1);
      const payload = {
        name: c.name.trim(),
        type: "category",
        description: c.description ?? "",
        status: c.status ?? "active",
        displayOrder,
        seoTitle: c.metaTitle ?? (c as any).seoTitle ?? "",
        seoDescription: c.metaDesc ?? (c as any).seoDescription ?? "",
      };

      const categoryId = (c as any)._id || catEdit?._id;
      if (categoryId) {
        await updateResource("/admin/categories", categoryId, payload);
        toast.success("Category updated successfully");
      } else {
        await createResource("/admin/categories", payload);
        toast.success("Category created successfully");
      }

      await loadData(false);

      if (!addAnother) {
        setCatOpen(false);
        setCatEdit(null);
      }
    } catch (err: any) {
      console.error("Save Category Error:", err);
      const backendData = err?.response?.data?.data || err?.data?.data;
      const errorMsg =
        backendData?.name ||
        backendData?.displayOrder ||
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to save category";
      toast.error(errorMsg);
      throw err;
    }
  };

  const saveGenre = async (g: GenreValue) => {
    try {
      const displayOrder = Number(g.order ?? (g as any).displayOrder ?? 1);
      const payload = {
        name: g.name.trim(),
        type: "genre",
        description: g.description ?? "",
        status: g.status ?? "active",
        displayOrder,
        seoTitle: g.metaTitle ?? (g as any).seoTitle ?? "",
        seoDescription: g.metaDesc ?? (g as any).seoDescription ?? "",
      };

      const genreId = (g as any)._id || genEdit?._id;
      if (genreId) {
        await updateResource("/admin/categories", genreId, payload);
        toast.success("Genre updated successfully");
      } else {
        await createResource("/admin/categories", payload);
        toast.success("Genre created successfully");
      }

      await loadData(false);
      setGenOpen(false);
      setGenEdit(null);
    } catch (err: any) {
      console.error("Save Genre Error:", err);
      const backendData = err?.response?.data?.data || err?.data?.data;
      const errorMsg =
        backendData?.name ||
        backendData?.displayOrder ||
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to save genre";
      toast.error(errorMsg);
      throw err;
    }
  };

  const toggleCat = async (id: string) => {
    const target = categories.find((c) => c._id === id);
    if (!target) return;
    const nextStatus = target.status === "active" ? "inactive" : "active";

    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c._id === id ? { ...c, status: nextStatus } : c))
    );

    try {
      await updateCategoryStatus(id, nextStatus);
      toast.success(`Category "${target.name}" is now ${nextStatus}`);
    } catch (err: any) {
      setCategories((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: target.status } : c))
      );
      toast.error(err?.message || "Failed to update status");
    }
  };

  const toggleGen = async (id: string) => {
    const target = genres.find((g) => g._id === id);
    if (!target) return;
    const nextStatus = target.status === "active" ? "inactive" : "active";

    // Optimistic update
    setGenres((prev) =>
      prev.map((g) => (g._id === id ? { ...g, status: nextStatus } : g))
    );

    try {
      await updateCategoryStatus(id, nextStatus);
      toast.success(`Genre "${target.name}" is now ${nextStatus}`);
    } catch (err: any) {
      setGenres((prev) =>
        prev.map((g) => (g._id === id ? { ...g, status: target.status } : g))
      );
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteResource("/admin/categories", deleteTarget.id);

      if (deleteTarget.type === "category") {
        setCategories((prev) => prev.filter((c) => c._id !== deleteTarget.id));
        toast.success(`Category "${deleteTarget.name}" deleted successfully`);
      } else {
        setGenres((prev) => prev.filter((g) => g._id !== deleteTarget.id));
        toast.success(`Genre "${deleteTarget.name}" deleted successfully`);
      }

      setDeleteTarget(null);
      await loadData(false);
    } catch (err: any) {
      console.error("Delete Resource Error:", err);
      toast.error(err?.data?.message || err?.message || `Failed to delete ${deleteTarget.type}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveDisplayOrder = async () => {
    if (!orderTarget) return;

    const orderNum = Number(newOrder);
    if (!newOrder || isNaN(orderNum)) {
      setOrderDialogError("Display order is required");
      return;
    }
    if (orderNum < 1 || !Number.isInteger(orderNum)) {
      setOrderDialogError("Display order must be at least 1 (positive whole number)");
      return;
    }

    const list = orderTarget.type === "category" ? categories : genres;
    const duplicate = list.find(
      (item) => item.displayOrder === orderNum && item._id !== orderTarget.id
    );
    if (duplicate) {
      setOrderDialogError(
        `Display order ${orderNum} is already assigned to "${duplicate.name}"`
      );
      return;
    }

    try {
      setSavingOrder(true);
      setOrderDialogError("");
      await updateCategoryDisplayOrder(orderTarget.id, orderNum);
      toast.success("Display order updated");
      setOrderTarget(null);
      await loadData(false);
    } catch (err: any) {
      console.error("Save display order error:", err);
      const backendData = err?.response?.data?.data || err?.data?.data;
      const msg =
        backendData?.displayOrder ||
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to update display order";
      setOrderDialogError(msg);
    } finally {
      setSavingOrder(false);
    }
  };

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          (catFilter === "All" || c.status === catFilter) &&
          (!catQ ||
            c.name.toLowerCase().includes(catQ.toLowerCase()) ||
            (c.description && c.description.toLowerCase().includes(catQ.toLowerCase())))
      ),
    [categories, catFilter, catQ]
  );

  const filteredGenres = useMemo(
    () =>
      genres.filter(
        (g) =>
          (genFilter === "All" || g.status === genFilter) &&
          (!genQ ||
            g.name.toLowerCase().includes(genQ.toLowerCase()) ||
            (g.description && g.description.toLowerCase().includes(genQ.toLowerCase())))
      ),
    [genres, genFilter, genQ]
  );

  const totalTitlesMapped = useMemo(() => {
    const catTitles = categories.reduce((sum, c) => sum + (Number(c.contentCount) || 0), 0);
    const genTitles = genres.reduce((sum, g) => sum + (Number(g.contentCount) || 0), 0);
    return Math.max(catTitles, genTitles);
  }, [categories, genres]);

  const activeCategoriesCount = categories.filter((c) => c.status === "active").length;
  const activeGenresCount = genres.filter((g) => g.status === "active").length;

  return (
    <>
      <PageHeader
        title="Categories & Genres"
        description="Organize content catalog into discoverable channels, formats, and genres."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCatEdit(null);
                setCatOpen(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4 text-primary" /> Add Category
            </button>
            <button
              onClick={() => {
                setGenEdit(null);
                setGenOpen(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> Add Genre
            </button>
          </div>
        }
      />

      {/* 5-Card Top Summary Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Total Categories</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {categories.length.toLocaleString()}
          </div>
        </Surface>

        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Active Categories</div>
          <div className="mt-1 text-2xl font-bold text-emerald-500">
            {activeCategoriesCount.toLocaleString()}
          </div>
        </Surface>

        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Total Genres</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {genres.length.toLocaleString()}
          </div>
        </Surface>

        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Active Genres</div>
          <div className="mt-1 text-2xl font-bold text-emerald-500">
            {activeGenresCount.toLocaleString()}
          </div>
        </Surface>

        <Surface className="p-4 rounded-2xl border border-border bg-card shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-muted-foreground">Mapped Titles</div>
          <div className="mt-1 text-2xl font-bold text-indigo-400">
            {totalTitlesMapped.toLocaleString()}
          </div>
        </Surface>
      </div>

      {/* View Mode Segmented Controls */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
          <button
            type="button"
            onClick={() => setViewMode("both")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
              viewMode === "both"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Split View (Both)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("categories")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
              viewMode === "categories"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("genres")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
              viewMode === "genres"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Genres ({genres.length})
          </button>
        </div>
      </div>

      {/* Grid Panels */}
      <div
        className={cn(
          "grid grid-cols-1 gap-6",
          viewMode === "both" ? "xl:grid-cols-2" : "grid-cols-1"
        )}
      >
        {/* Categories Panel */}
        {(viewMode === "both" || viewMode === "categories") && (
          <Surface className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Content Categories</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Top-level catalog sections (e.g., Movies, Series, Originals)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCatEdit(null);
                  setCatOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-xl bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> New Category
              </button>
            </div>

            <div className="mb-4 flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
                <input
                  value={catQ}
                  onChange={(e) => setCatQ(e.target.value)}
                  placeholder="Search categories by name or description…"
                  className="h-9 w-full rounded-xl border border-border/70 bg-secondary/35 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition"
                />
                {catQ && (
                  <button
                    type="button"
                    onClick={() => setCatQ("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="relative">
                <Filter className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors", catFilter !== "All" ? "text-primary" : "text-muted-foreground")} />
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className={cn(
                    "h-9 appearance-none rounded-xl border pl-8.5 pr-8 text-xs font-medium outline-none transition cursor-pointer",
                    catFilter !== "All"
                      ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-2xs"
                      : "border-border/70 bg-secondary/35 text-foreground hover:bg-secondary/60"
                  )}
                >
                  <option value="All">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredCategories.map((c) => {
                  const Icon = ICONS[c.icon] || Tag;
                  return (
                    <div
                      key={c._id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 p-3.5 transition hover:border-primary/40 hover:bg-secondary/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold shadow-xs">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {c.name}
                            </span>
                            {c.featured && (
                              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-500">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOrderTarget({
                                  id: c._id,
                                  name: c.name,
                                  currentOrder: c.displayOrder,
                                  type: "category",
                                });
                                setNewOrder(c.displayOrder);
                                setOrderDialogError("");
                              }}
                              className="inline-flex items-center gap-0.5 rounded-md bg-secondary/80 px-1.5 py-0.5 font-medium text-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer"
                              title="Click to edit display position"
                            >
                              <Hash className="h-3 w-3 text-muted-foreground" /> Order {c.displayOrder}
                              <Pencil className="h-2.5 w-2.5 ml-0.5 opacity-60 group-hover:opacity-100" />
                            </button>
                            <span>·</span>
                            <span>{c.contentCount || 0} Titles</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCat(c._id)}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                            c.status === "active"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              c.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                            )}
                          />
                          {c.status === "active" ? "ACTIVE" : "INACTIVE"}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewCat(c)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCatEdit(c);
                              setCatOpen(true);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                            title="Edit Category"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: c._id,
                                name: c.name,
                                type: "category",
                              })
                            }
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredCategories.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                    No categories found matching your filter criteria.
                  </div>
                )}
              </div>
            )}
          </Surface>
        )}

        {/* Genres Panel */}
        {(viewMode === "both" || viewMode === "genres") && (
          <Surface className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Content Genres</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Style, emotion, and thematic classifications (e.g., Action, Drama, Thriller)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setGenEdit(null);
                  setGenOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-xl bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> New Genre
              </button>
            </div>

            <div className="mb-4 flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
                <input
                  value={genQ}
                  onChange={(e) => setGenQ(e.target.value)}
                  placeholder="Search genres by name or description…"
                  className="h-9 w-full rounded-xl border border-border/70 bg-secondary/35 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition"
                />
                {genQ && (
                  <button
                    type="button"
                    onClick={() => setGenQ("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="relative">
                <Filter className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors", genFilter !== "All" ? "text-primary" : "text-muted-foreground")} />
                <select
                  value={genFilter}
                  onChange={(e) => setGenFilter(e.target.value)}
                  className={cn(
                    "h-9 appearance-none rounded-xl border pl-8.5 pr-8 text-xs font-medium outline-none transition cursor-pointer",
                    genFilter !== "All"
                      ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-2xs"
                      : "border-border/70 bg-secondary/35 text-foreground hover:bg-secondary/60"
                  )}
                >
                  <option value="All">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredGenres.map((g) => (
                  <div
                    key={g._id}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 p-3.5 transition hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 text-xs font-bold uppercase text-primary shadow-xs">
                        {g.name?.slice(0, 2) || "GN"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {g.name}
                          </span>
                          {g.featured && (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-500">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setOrderTarget({
                                id: g._id,
                                name: g.name,
                                currentOrder: g.displayOrder,
                                type: "genre",
                              });
                              setNewOrder(g.displayOrder);
                              setOrderDialogError("");
                            }}
                            className="inline-flex items-center gap-0.5 rounded-md bg-secondary/80 px-1.5 py-0.5 font-medium text-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer"
                            title="Click to edit display position"
                          >
                            <Hash className="h-3 w-3 text-muted-foreground" /> Order {g.displayOrder}
                            <Pencil className="h-2.5 w-2.5 ml-0.5 opacity-60 group-hover:opacity-100" />
                          </button>
                          <span>·</span>
                          <span>{g.contentCount || 0} Titles</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleGen(g._id)}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          g.status === "active"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            g.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                          )}
                        />
                        {g.status === "active" ? "ACTIVE" : "INACTIVE"}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewGen(g)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setGenEdit(g);
                            setGenOpen(true);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                          title="Edit Genre"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              id: g._id,
                              name: g.name,
                              type: "genre",
                            })
                          }
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                          title="Delete Genre"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredGenres.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                    No genres found matching your filter criteria.
                  </div>
                )}
              </div>
            )}
          </Surface>
        )}
      </div>

      <AddCategoryDialog
        open={catOpen}
        onOpenChange={(o) => {
          setCatOpen(o);
          if (!o) setCatEdit(null);
        }}
        initial={catEdit}
        onSave={saveCategory}
        existingNames={categories.map((c) => c.name)}
        existingOrders={categories.map((c) => ({
          id: c._id,
          order: c.displayOrder,
          name: c.name,
        }))}
      />

      <AddGenreDialog
        open={genOpen}
        onOpenChange={(o) => {
          setGenOpen(o);
          if (!o) setGenEdit(null);
        }}
        initial={genEdit}
        onSave={saveGenre}
        existingNames={genres.map((g) => g.name)}
        existingOrders={genres.map((g) => ({
          id: g._id,
          order: g.displayOrder,
          name: g.name,
        }))}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-lg font-semibold">
              <AlertTriangle className="h-5 w-5" />
              Delete {deleteTarget?.type === "category" ? "Category" : "Genre"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                "{deleteTarget?.name}"
              </span>
              ? This action cannot be undone and will remove the{" "}
              {deleteTarget?.type === "category" ? "category" : "genre"} from any associated content.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="h-10 rounded-xl border border-border bg-background px-4 text-xs font-semibold hover:bg-secondary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="h-10 rounded-xl bg-destructive px-5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition cursor-pointer disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Display Order Modal */}
      <Dialog
        open={!!orderTarget}
        onOpenChange={(o) => {
          if (!o && !savingOrder) {
            setOrderTarget(null);
            setOrderDialogError("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Hash className="h-5 w-5 text-primary" />
              Change Display Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set priority ordering position for{" "}
              <span className="font-semibold text-foreground">"{orderTarget?.name}"</span>. Lower numbers appear first on the OTT app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            <label className="text-xs font-medium text-foreground">
              Display Order Position (Minimum: 1) *
            </label>
            <input
              type="number"
              min={1}
              step={1}
              autoFocus
              className={`h-11 w-full rounded-xl border bg-background px-3.5 text-sm placeholder:text-muted-foreground/70 transition focus:outline-none focus:ring-2 ${
                orderDialogError
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                  : "border-border focus:border-primary/50 focus:ring-primary/20"
              }`}
              value={newOrder}
              onChange={(e) => {
                setNewOrder(e.target.value === "" ? "" : Number(e.target.value));
                if (orderDialogError) setOrderDialogError("");
              }}
              placeholder="e.g. 1"
            />
            {orderDialogError && (
              <p className="text-[11px] font-medium text-destructive mt-1">
                {orderDialogError}
              </p>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <button
              type="button"
              disabled={savingOrder}
              onClick={() => {
                setOrderTarget(null);
                setOrderDialogError("");
              }}
              className="h-10 rounded-xl border border-border bg-background px-4 text-xs font-semibold hover:bg-secondary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingOrder}
              onClick={handleSaveDisplayOrder}
              className="h-10 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-110 transition cursor-pointer disabled:opacity-50"
            >
              {savingOrder ? "Saving…" : "Save Position"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category View Sheet */}
      <ViewSheet
        open={!!viewCat}
        onOpenChange={(o) => !o && setViewCat(null)}
        title={viewCat?.name ?? ""}
        subtitle={viewCat?.description || "Content Category Channel"}
        status={viewCat?.status === "active" ? "Active" : "Inactive"}
        sections={
          viewCat
            ? [
                {
                  title: "Overview",
                  rows: [
                    {
                      label: "Status",
                      value: <StatusPill status={viewCat.status === "active" ? "Active" : "Inactive"} />,
                    },
                    {
                      label: "Display Order",
                      value: `#${viewCat.displayOrder}`,
                    },
                    {
                      label: "Mapped Titles",
                      value: `${viewCat.contentCount || 0} titles`,
                    },
                    {
                      label: "Created",
                      value: viewCat.createdAt
                        ? new Date(viewCat.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—",
                    },
                  ],
                },
                {
                  title: "SEO Configuration",
                  rows: [
                    {
                      label: "SEO Title",
                      value: viewCat.seoTitle || "—",
                    },
                    {
                      label: "SEO Description",
                      value: viewCat.seoDescription || "—",
                    },
                  ],
                },
              ]
            : []
        }
        actions={[
          {
            label: "Edit Category",
            variant: "primary",
            onClick: () => {
              if (viewCat) {
                setCatEdit(viewCat);
                setCatOpen(true);
                setViewCat(null);
              }
            },
          },
          { label: "Close", onClick: () => setViewCat(null) },
        ]}
      />

      {/* Genre View Sheet */}
      <ViewSheet
        open={!!viewGen}
        onOpenChange={(o) => !o && setViewGen(null)}
        title={viewGen?.name ?? ""}
        subtitle={viewGen?.description || "Thematic Content Classification"}
        status={viewGen?.status === "active" ? "Active" : "Inactive"}
        sections={
          viewGen
            ? [
                {
                  title: "Overview",
                  rows: [
                    {
                      label: "Status",
                      value: <StatusPill status={viewGen.status === "active" ? "Active" : "Inactive"} />,
                    },
                    {
                      label: "Display Order",
                      value: `#${viewGen.displayOrder}`,
                    },
                    {
                      label: "Mapped Titles",
                      value: `${viewGen.contentCount || 0} titles`,
                    },
                    {
                      label: "Created",
                      value: viewGen.createdAt
                        ? new Date(viewGen.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—",
                    },
                  ],
                },
                {
                  title: "SEO Configuration",
                  rows: [
                    {
                      label: "SEO Title",
                      value: viewGen.seoTitle || "—",
                    },
                    {
                      label: "SEO Description",
                      value: viewGen.seoDescription || "—",
                    },
                  ],
                },
              ]
            : []
        }
        actions={[
          {
            label: "Edit Genre",
            variant: "primary",
            onClick: () => {
              if (viewGen) {
                setGenEdit(viewGen);
                setGenOpen(true);
                setViewGen(null);
              }
            },
          },
          { label: "Close", onClick: () => setViewGen(null) },
        ]}
      />
    </>
  );
}
