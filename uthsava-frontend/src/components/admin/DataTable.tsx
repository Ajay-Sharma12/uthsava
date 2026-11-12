import { Search, Filter, Download, Plus, Eye, Pencil, Trash2, Inbox, RotateCcw, X, Check, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "./Primitives";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { toast } from "sonner";
import { useState, useMemo, useRef, useEffect } from "react";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => string | number;
};

export type RowAction<T> = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (row: T) => void;
  destructive?: boolean;
};

function TableFilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAll = !value || value === "All" || value === "ALL";

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
          open
            ? "border-primary/50 bg-primary/10 ring-2 ring-primary/20 text-primary font-semibold shadow-xs"
            : !isAll
            ? "border-primary/40 bg-primary/10 text-primary font-semibold shadow-2xs"
            : "border-border/70 bg-secondary/35 text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:border-border",
        )}
      >
        <Filter
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            !isAll ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="truncate max-w-[130px]">
          {!isAll ? `${label}: ${value}` : `${label}: All`}
        </span>

        {!isAll && (
          <span
            role="button"
            title="Reset this filter"
            onClick={(e) => {
              e.stopPropagation();
              onChange("All");
            }}
            className="grid h-4 w-4 place-items-center rounded-full hover:bg-primary/20 text-primary transition ml-0.5 cursor-pointer"
          >
            <X className="h-3 w-3 stroke-[2.5]" />
          </span>
        )}

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[200px] max-h-72 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl p-1.5 shadow-2xl space-y-1 animate-in fade-in-0 zoom-in-95 text-foreground ring-1 ring-border/50 scrollbar-thin">
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/50 pb-1.5">
            <span>Filter by {label}</span>
            {!isAll && (
              <button
                type="button"
                onClick={() => {
                  onChange("All");
                  setOpen(false);
                }}
                className="text-primary hover:underline text-[10px] font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {options.length > 5 && (
            <div className="px-1 py-0.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 w-full rounded-lg border border-border/70 bg-secondary/40 pl-7 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("All");
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition cursor-pointer",
                isAll
                  ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              <span>All ({options.length})</span>
              {isAll && <Check className="h-3.5 w-3.5 shrink-0 text-primary stroke-[2.5]" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-xs text-muted-foreground">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary stroke-[2.5]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  loading = false,

  searchValue,
  onSearchChange,
  searchKeys,

  filters,
  primaryAction,
  exportFileName = "export",
  exportColumns,
  pageSize = 8,
  rowActions,
  onRowClick,
  emptyState,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchKeys?: (keyof T | string)[];

  filters?: {
    label: string;
    key?: string;
    options: string[];
    getValue?: (row: T) => string;
  }[];
  primaryAction?: { label: string; onClick?: () => void };
  exportFileName?: string;
  exportColumns?: Column<T>[];
  pageSize?: number;
  rowActions?: RowAction<T>[];
  onRowClick?: (row: T) => void;
  emptyState?: { title: string; description: string; ctaLabel?: string; onCta?: () => void };
}) {
  const [page, setPage] = useState(1);
  const [internalSearch, setInternalSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ row: T; action: RowAction<T> } | null>(null);
  const [confirmExport, setConfirmExport] = useState(false);

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const effectiveSearch = (searchValue !== undefined ? searchValue : internalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      // Search matching
      if (effectiveSearch) {
        if (searchKeys && searchKeys.length > 0) {
          const matchesKey = searchKeys.some((k) => {
            const val = row[k as string];
            if (val === undefined || val === null) return false;
            return String(val).toLowerCase().includes(effectiveSearch);
          });
          if (!matchesKey) return false;
        } else {
          const matchesCol = columns.some((col) => {
            const val = col.accessor ? col.accessor(row) : row[col.key];
            if (val === undefined || val === null) return false;
            return String(val).toLowerCase().includes(effectiveSearch);
          });
          const matchesProp = Object.values(row).some((val) => {
            if (typeof val === "string" || typeof val === "number") {
              return String(val).toLowerCase().includes(effectiveSearch);
            }
            return false;
          });
          if (!matchesCol && !matchesProp) return false;
        }
      }

      // Dropdown filters
      return (
        filters?.every((filter) => {
          const filterKey = filter.key || filter.label;
          const selectedValue = activeFilters[filterKey] || activeFilters[filter.label];

          if (!selectedValue || selectedValue === "All") {
            return true;
          }

          const rowValue = filter.getValue
            ? filter.getValue(row)
            : String(row[filter.key ?? filter.label.toLowerCase()] ?? "");

          const normalizedRowValue = rowValue.split(",").map((value) => value.trim().toLowerCase());

          return normalizedRowValue.includes(selectedValue.toLowerCase());
        }) ?? true
      );
    });
  }, [rows, filters, activeFilters, effectiveSearch, searchKeys, columns]);

  const activeFilterEntries = useMemo(() => {
    return Object.entries(activeFilters).filter(
      ([_, val]) => Boolean(val) && val !== "All" && val !== "ALL",
    );
  }, [activeFilters]);

  const hasFiltersApplied = activeFilterEntries.length > 0 || Boolean(effectiveSearch);

  const computedEmptyState = useMemo(() => {
    if (!hasFiltersApplied) {
      return {
        title: emptyState?.title ?? "No records found",
        description: emptyState?.description ?? "Upload or create your first item to get started.",
        ctaLabel: emptyState?.ctaLabel,
        onCta: emptyState?.onCta,
        isFiltered: false,
      };
    }

    // Check specific filter conditions
    for (const [key, val] of activeFilterEntries) {
      const lower = val.toLowerCase();
      if (lower.includes("await") || lower.includes("pend")) {
        return {
          title: "No pending data",
          description: "There are no pending submissions awaiting approval.",
          ctaLabel: "Clear filter",
          onCta: () => setActiveFilters((prev) => ({ ...prev, [key]: "All" })),
          isFiltered: true,
        };
      }
      if (lower.includes("hold")) {
        return {
          title: "No data on hold",
          description: "There is no content currently placed on a 24-hour verification hold.",
          ctaLabel: "Clear filter",
          onCta: () => setActiveFilters((prev) => ({ ...prev, [key]: "All" })),
          isFiltered: true,
        };
      }
      if (lower.includes("re-edit") || lower.includes("reedit") || lower.includes("re_edit")) {
        return {
          title: "No re-edit requests",
          description: "There are no records currently awaiting producer revisions.",
          ctaLabel: "Clear filter",
          onCta: () => setActiveFilters((prev) => ({ ...prev, [key]: "All" })),
          isFiltered: true,
        };
      }
      if (lower.includes("reject")) {
        return {
          title: "No rejected data",
          description: "There are no rejected records found in this view.",
          ctaLabel: "Clear filter",
          onCta: () => setActiveFilters((prev) => ({ ...prev, [key]: "All" })),
          isFiltered: true,
        };
      }
      if (lower.includes("draft")) {
        return {
          title: "No draft data",
          description: "No draft records found in this view.",
          ctaLabel: "Clear filter",
          onCta: () => setActiveFilters((prev) => ({ ...prev, [key]: "All" })),
          isFiltered: true,
        };
      }
      if (lower === "active" || lower === "approved") {
        return {
          title: `No ${val.toLowerCase()} data`,
          description: `No records found with status "${val}".`,
          ctaLabel: "Clear filter",
          onCta: () => setActiveFilters((prev) => ({ ...prev, [key]: "All" })),
          isFiltered: true,
        };
      }
      if (lower === "inactive") {
        return {
          title: "No inactive data",
          description: "No inactive records found matching your criteria.",
          ctaLabel: "Clear filter",
          onCta: () => setActiveFilters((prev) => ({ ...prev, [key]: "All" })),
          isFiltered: true,
        };
      }
    }

    if (effectiveSearch) {
      return {
        title: `No results for "${effectiveSearch}"`,
        description: "No records found matching your search term. Try a different keyword or reset filters.",
        ctaLabel: "Clear search",
        onCta: () => {
          setInternalSearch("");
          onSearchChange?.("");
        },
        isFiltered: true,
      };
    }

    const filterSummary = activeFilterEntries.map(([k, v]) => `${k}: ${v}`).join(", ");
    return {
      title: "No matching records found",
      description: `No records match the selected filter (${filterSummary}).`,
      ctaLabel: "Reset filters",
      onCta: () => setActiveFilters({}),
      isFiltered: true,
    };
  }, [emptyState, hasFiltersApplied, activeFilterEntries, effectiveSearch, onSearchChange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const defaultActions: RowAction<T>[] = rowActions ?? [
    {
      label: "View",
      icon: Eye,
      onClick: (r) => toast.info(`Opening ${r.id ?? r.name ?? "record"}…`),
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: (r) => toast.success(`Editing ${r.id ?? r.name ?? "record"}`),
    },
    {
      label: "Delete",
      icon: Trash2,
      destructive: true,
      onClick: (r) => toast.error(`Deleted ${r.id ?? r.name ?? "record"}`),
    },
  ];

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const columnsToExport = exportColumns ?? columns;

    const headers = columnsToExport.map((column) => column.header);

    const escapeCsvValue = (value: unknown) => {
      const stringValue = String(value ?? "");
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvRows = filtered.map((row) =>
      columnsToExport
        .map((column) => {
          const value = column.accessor ? column.accessor(row) : row[column.key];

          return escapeCsvValue(value);
        })
        .join(","),
    );

    const csvContent = [headers.map(escapeCsvValue).join(","), ...csvRows].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success(`Exported ${filtered.length} rows`);
  };

  // console.log("DataTable loading =", loading);

  return (
    <TooltipProvider delayDuration={150}>
      <Surface className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border/80 p-3.5 sm:p-4">
          {/* Search Box */}
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={searchValue ?? internalSearch}
              onChange={(e) => {
                if (onSearchChange) {
                  onSearchChange(e.target.value);
                } else {
                  setInternalSearch(e.target.value);
                  setPage(1);
                }
              }}
              placeholder="Search records..."
              className="h-9 w-full rounded-xl border border-border/70 bg-secondary/40 pl-9 pr-8 text-xs sm:text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {Boolean(searchValue ?? internalSearch) && (
              <button
                type="button"
                onClick={() => {
                  if (onSearchChange) onSearchChange("");
                  else {
                    setInternalSearch("");
                    setPage(1);
                  }
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-4 w-4 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          {filters && filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {filters.map((f) => {
                const filterKey = f.key || f.label;
                const currentVal = activeFilters[filterKey] || activeFilters[f.label] || "All";
                return (
                  <TableFilterDropdown
                    key={f.label}
                    label={f.label}
                    value={currentVal}
                    options={f.options}
                    onChange={(val) => {
                      setActiveFilters((prev) => ({
                        ...prev,
                        [filterKey]: val,
                        [f.label]: val,
                      }));
                      setPage(1);
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setConfirmExport(true)}
                  disabled={loading || filtered.length === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/40 px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground hover:border-border disabled:cursor-not-allowed disabled:opacity-50 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Export
                </button>
              </TooltipTrigger>
              <TooltipContent>Download as CSV</TooltipContent>
            </Tooltip>
            {primaryAction && (
              <button
                type="button"
                onClick={() => primaryAction.onClick?.()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] px-3.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> {primaryAction.label.replace(/^\+\s*/, "")}
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasFiltersApplied && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 bg-secondary/15 px-4 py-2 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">
              Active Filters:
            </span>

            {Boolean(effectiveSearch) && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <span>Search: "{effectiveSearch}"</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSearchChange) onSearchChange("");
                    else setInternalSearch("");
                  }}
                  className="hover:text-foreground rounded-full p-0.5 cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            {activeFilterEntries.map(([key, val]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                <span>
                  {key}: <strong className="font-semibold">{val}</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveFilters((prev) => ({
                      ...prev,
                      [key]: "All",
                    }))
                  }
                  className="hover:text-foreground rounded-full p-0.5 cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={() => {
                setActiveFilters({});
                if (onSearchChange) onSearchChange("");
                else setInternalSearch("");
              }}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-destructive transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset all</span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {columns.map((c) => (
                  <th key={c.key} className={cn("px-4 py-3 font-medium", c.className)}>
                    {c.header}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={index} className="border-b border-border/60">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        <Skeleton className="h-5 w-full rounded-md" />
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {pageRows.map((r, i) => (
                    <tr
                      key={i}
                      onClick={() => onRowClick?.(r)}
                      className={cn(
                        "border-b border-border/60 transition hover:bg-secondary/40",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn("px-4 py-3.5 text-foreground/90", c.className)}
                        >
                          {c.render ? c.render(r) : String(r[c.key] ?? "")}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-0.5">
                          {defaultActions.map((a) => (
                            <Tooltip key={a.label}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (a.destructive) setConfirmDelete({ row: r, action: a });
                                    else a.onClick(r);
                                  }}
                                  className={cn(
                                    "grid h-8 w-8 place-items-center rounded-md transition",
                                    a.destructive
                                      ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                                  )}
                                >
                                  <a.icon className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{a.label}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-16">
                        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                          <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
                            <Inbox className="h-6 w-6" />
                          </div>
                          <h3 className="mt-3 text-sm font-semibold">
                            {computedEmptyState.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {computedEmptyState.description}
                          </p>
                          {computedEmptyState.ctaLabel && (
                            <button
                              type="button"
                              onClick={() => computedEmptyState.onCta?.()}
                              className={cn(
                                "mt-4 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition cursor-pointer",
                                computedEmptyState.isFiltered
                                  ? "border border-border bg-card text-foreground hover:bg-secondary shadow-sm"
                                  : "bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110",
                              )}
                            >
                              {computedEmptyState.isFiltered ? (
                                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                              {computedEmptyState.ctaLabel}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
          <span>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 rounded-md border border-border px-2.5 disabled:opacity-40 hover:bg-secondary"
            >
              Prev
            </button>
            <span className="px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 rounded-md border border-border px-2.5 disabled:opacity-40 hover:bg-secondary"
            >
              Next
            </button>
          </div>
        </div>
      </Surface>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) confirmDelete.action.onClick(confirmDelete.row);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Export Confirmation Dialog */}
      <AlertDialog open={confirmExport} onOpenChange={setConfirmExport}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Download className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center">Download CSV file?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground">
              Are you sure you want to download{" "}
              <span className="font-semibold text-foreground">
                {exportFileName}-{new Date().toISOString().slice(0, 10)}.csv
              </span>
              ?
              <br className="mt-1" />
              This will export <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              record{filtered.length === 1 ? "" : "s"} with currently applied filters and search.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5"
              onClick={() => {
                setConfirmExport(false);
                handleExport();
              }}
            >
              <Download className="h-4 w-4" /> Download CSV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
