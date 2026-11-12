import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Search,
  Film,
  Tv2,
  Users,
  Briefcase,
  Tag,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Settings,
  Layers,
  Loader2,
  X,
  Sparkles,
  ShieldCheck,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { getProducers } from "@/lib/services/producers";
import { cn } from "@/lib/utils";

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "Pages" | "Movies & Series" | "Users" | "Producers";
  icon: React.ElementType;
  url?: string;
  onClick?: () => void;
  badge?: string;
  badgeVariant?: "primary" | "success" | "warning" | "info" | "secondary";
  thumbnail?: string;
};

const STATIC_PAGES: SearchResultItem[] = [
  {
    id: "page-dashboard",
    title: "Dashboard Overview",
    subtitle: "Analytics, real-time KPI metrics & quick actions",
    category: "Pages",
    icon: LayoutDashboard,
    url: "/",
  },
  {
    id: "page-movies",
    title: "Movies Catalog",
    subtitle: "Manage video assets, movies & metadata",
    category: "Pages",
    icon: Film,
    url: "/movies",
    badge: "Catalog",
    badgeVariant: "info",
  },
  {
    id: "page-series",
    title: "Web Series & Shows",
    subtitle: "Manage series, multi-seasons & episodes",
    category: "Pages",
    icon: Tv2,
    url: "/series",
    badge: "Catalog",
    badgeVariant: "info",
  },
  {
    id: "page-approval",
    title: "Content Approval Queue",
    subtitle: "Review producer uploads & pending moderation",
    category: "Pages",
    icon: CheckCircle2,
    url: "/content-approval",
    badge: "Moderation",
    badgeVariant: "warning",
  },
  {
    id: "page-users",
    title: "Users & Subscribers",
    subtitle: "Customer accounts, profiles & subscription state",
    category: "Pages",
    icon: Users,
    url: "/users",
  },
  {
    id: "page-producers",
    title: "Producers & Partners",
    subtitle: "Production houses, studios & payout agreements",
    category: "Pages",
    icon: Briefcase,
    url: "/producers",
  },
  {
    id: "page-plans",
    title: "Subscription Plans",
    subtitle: "Pricing tiers, durations & entitlements",
    category: "Pages",
    icon: CreditCard,
    url: "/plans",
  },
  {
    id: "page-categories",
    title: "Categories & Genres",
    subtitle: "Taxonomy tags, genre groupings & badges",
    category: "Pages",
    icon: Layers,
    url: "/categories",
  },
  {
    id: "page-coupons",
    title: "Coupons & Promotions",
    subtitle: "Discount vouchers, user limits & campaigns",
    category: "Pages",
    icon: Tag,
    url: "/coupons",
  },
  {
    id: "page-notifications",
    title: "Push Notifications",
    subtitle: "Broadcast announcements to apps & web",
    category: "Pages",
    icon: Bell,
    url: "/notifications",
  },
  {
    id: "page-transactions",
    title: "Transactions & Billing",
    subtitle: "Payment gateway receipts & purchase history",
    category: "Pages",
    icon: CreditCard,
    url: "/transactions",
  },
  {
    id: "page-payouts",
    title: "Producer Payouts",
    subtitle: "Revenue shares, statements & remittances",
    category: "Pages",
    icon: Briefcase,
    url: "/payouts",
  },
  {
    id: "page-audit",
    title: "Audit Logs",
    subtitle: "System actions, admin security & audit trail",
    category: "Pages",
    icon: ShieldCheck,
    url: "/audit-logs",
  },
  {
    id: "page-settings",
    title: "System Settings",
    subtitle: "App configuration, portal branding & environment",
    category: "Pages",
    icon: Settings,
    url: "/settings",
  },
];

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  initialQuery = "",
}: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [contentResults, setContentResults] = useState<SearchResultItem[]>([]);
  const [userResults, setUserResults] = useState<SearchResultItem[]>([]);
  const [producerResults, setProducerResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Sync initial query when opened
  useEffect(() => {
    if (open) {
      setQuery(initialQuery || "");
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, initialQuery]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // Filter static pages
  const pageResults = STATIC_PAGES.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }).slice(0, query.trim() ? 6 : 8);

  // Fetch live API data when typing
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setContentResults([]);
      setUserResults([]);
      setProducerResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [contentRes, userRes, prodRes] = await Promise.allSettled([
          apiGet("/admin/contents", { search: trimmed, limit: 6, page: 1 }),
          apiGet("/admin/users", { search: trimmed, limit: 5, page: 1 }),
          getProducers(trimmed),
        ]);

        // Process Contents (Movies & Series)
        if (contentRes.status === "fulfilled" && contentRes.value) {
          const raw = contentRes.value;
          const items: any[] =
            raw?.results?.contents ||
            raw?.results?.data ||
            raw?.results?.items ||
            raw?.results ||
            raw?.data?.contents ||
            raw?.data ||
            (Array.isArray(raw) ? raw : []);

          if (Array.isArray(items)) {
            const mapped: SearchResultItem[] = items.slice(0, 6).map((c) => {
              const isSeries = (c.type || c.contentType || "").toUpperCase() === "SERIES";
              const title = c.title || "Untitled Title";
              const targetUrl = isSeries ? `/series` : `/movies`;
              return {
                id: `content-${c._id || c.id}`,
                title,
                subtitle: `${isSeries ? "Web Series" : "Movie"} · ${
                  c.releaseYear || new Date(c.createdAt || Date.now()).getFullYear()
                }${c.genre || c.genres?.[0] ? ` · ${typeof c.genres?.[0] === "object" ? c.genres[0].name : c.genre || c.genres?.[0]}` : ""}`,
                category: "Movies & Series",
                icon: isSeries ? Tv2 : Film,
                url: targetUrl,
                thumbnail: c.thumbnail || c.poster || (Array.isArray(c.poster) ? c.poster[0] : ""),
                badge: isSeries ? "Series" : "Movie",
                badgeVariant: "info",
              };
            });
            setContentResults(mapped);
          } else {
            setContentResults([]);
          }
        }

        // Process Users
        if (userRes.status === "fulfilled" && userRes.value) {
          const raw = userRes.value;
          const items: any[] =
            raw?.results?.data ||
            raw?.results?.users ||
            raw?.results ||
            raw?.data?.users ||
            raw?.data ||
            (Array.isArray(raw) ? raw : []);

          if (Array.isArray(items)) {
            const mapped: SearchResultItem[] = items.slice(0, 4).map((u) => ({
              id: `user-${u._id || u.id}`,
              title: u.name || u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User",
              subtitle: u.email || u.mobile || "Registered User",
              category: "Users",
              icon: Users,
              url: `/users`,
              badge: u.subscriptionStatus === "active" ? "Subscribed" : u.role || "User",
              badgeVariant: u.subscriptionStatus === "active" ? "success" : "secondary",
            }));
            setUserResults(mapped);
          } else {
            setUserResults([]);
          }
        }

        // Process Producers
        if (prodRes.status === "fulfilled" && prodRes.value) {
          const raw = prodRes.value;
          const items: any[] =
            raw?.results?.data ||
            raw?.results?.producers ||
            raw?.results ||
            raw?.data?.producers ||
            raw?.data ||
            (Array.isArray(raw) ? raw : []);

          if (Array.isArray(items)) {
            const mapped: SearchResultItem[] = items.slice(0, 3).map((p) => ({
              id: `prod-${p._id || p.id}`,
              title: p.companyName || p.fullName || p.name || "Producer",
              subtitle: p.email || p.mobile || "Content Producer",
              category: "Producers",
              icon: Briefcase,
              url: `/producers`,
              badge: "Partner",
              badgeVariant: "warning",
            }));
            setProducerResults(mapped);
          } else {
            setProducerResults([]);
          }
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Flattened results for keyboard navigation
  const allResults = [
    ...contentResults,
    ...userResults,
    ...producerResults,
    ...pageResults,
  ];

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onOpenChange(false);
      if (item.onClick) {
        item.onClick();
      } else if (item.url) {
        navigate({ to: item.url as any });
      }
    },
    [navigate, onOpenChange]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (allResults.length === 0) return -1;
          return prev < allResults.length - 1 ? prev + 1 : 0;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (allResults.length === 0) return -1;
          return prev > 0 ? prev - 1 : allResults.length - 1;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && allResults[selectedIndex]) {
          handleSelect(allResults[selectedIndex]);
        } else if (allResults.length > 0) {
          handleSelect(allResults[0]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, allResults, selectedIndex, handleSelect]);

  let counter = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl ring-1 ring-border/40 [&>button]:hidden">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-border/70 px-4 py-3 bg-secondary/15">
          <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0 mr-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, series, users, producers, pages..."
            className="h-8 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none font-medium"
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mx-2" />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer mr-2"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Clean ESC close badge */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/70 hover:bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition cursor-pointer shrink-0 shadow-2xs"
            title="Close (Esc)"
          >
            <span>Esc</span>
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 scrollbar-thin">
          {/* MOVIES & SERIES */}
          {contentResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 text-sky-500" /> Movies & Series ({contentResults.length})
                </span>
                <span className="text-[10px] lowercase text-muted-foreground/60">catalog</span>
              </div>
              <div className="space-y-1">
                {contentResults.map((item) => {
                  const itemIndex = counter++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all cursor-pointer group border",
                        isSelected
                          ? "bg-secondary text-foreground border-border/80 shadow-2xs"
                          : "hover:bg-secondary/60 text-foreground border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="h-9 w-9 rounded-lg object-cover border border-border/70 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className={cn(
                            "grid h-9 w-9 place-items-center rounded-lg shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground group-hover:text-foreground border border-border/60"
                          )}>
                            <item.icon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate text-foreground">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {item.badge && (
                          <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-secondary text-muted-foreground border border-border/70">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight className={cn(
                          "h-3.5 w-3.5 transition-all",
                          isSelected ? "translate-x-0.5 text-foreground opacity-100" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* USERS */}
          {userResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-500" /> Users & Subscribers ({userResults.length})
                </span>
                <span className="text-[10px] lowercase text-muted-foreground/60">accounts</span>
              </div>
              <div className="space-y-1">
                {userResults.map((item) => {
                  const itemIndex = counter++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all cursor-pointer group border",
                        isSelected
                          ? "bg-secondary text-foreground border-border/80 shadow-2xs"
                          : "hover:bg-secondary/60 text-foreground border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "grid h-8 w-8 place-items-center rounded-full font-bold text-xs shrink-0 transition-colors",
                          isSelected
                            ? "bg-emerald-500 text-white"
                            : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25"
                        )}>
                          {item.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate text-foreground">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {item.badge && (
                          <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-secondary text-muted-foreground border border-border/70">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight className={cn(
                          "h-3.5 w-3.5 transition-all",
                          isSelected ? "translate-x-0.5 text-foreground opacity-100" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRODUCERS */}
          {producerResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-amber-500" /> Producers & Partners ({producerResults.length})
                </span>
                <span className="text-[10px] lowercase text-muted-foreground/60">studios</span>
              </div>
              <div className="space-y-1">
                {producerResults.map((item) => {
                  const itemIndex = counter++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all cursor-pointer group border",
                        isSelected
                          ? "bg-secondary text-foreground border-border/80 shadow-2xs"
                          : "hover:bg-secondary/60 text-foreground border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "grid h-8 w-8 place-items-center rounded-xl shrink-0 transition-colors",
                          isSelected
                            ? "bg-amber-500 text-white"
                            : "bg-amber-500/15 text-amber-500 border border-amber-500/25"
                        )}>
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate text-foreground">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="rounded-md bg-secondary text-muted-foreground border border-border/70 px-2 py-0.5 text-[10px] font-semibold">
                          Producer
                        </span>
                        <ArrowRight className={cn(
                          "h-3.5 w-3.5 transition-all",
                          isSelected ? "translate-x-0.5 text-foreground opacity-100" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAGES & NAVIGATION */}
          {pageResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                  {query.trim() ? `Matching Pages (${pageResults.length})` : "Portal Navigation"}
                </span>
                <span className="text-[10px] lowercase text-muted-foreground/60">shortcut</span>
              </div>
              <div className="space-y-1">
                {pageResults.map((item) => {
                  const itemIndex = counter++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all cursor-pointer group border",
                        isSelected
                          ? "bg-secondary text-foreground border-border/80 shadow-2xs"
                          : "hover:bg-secondary/60 text-foreground border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "grid h-8 w-8 place-items-center rounded-xl shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "bg-secondary/70 text-muted-foreground group-hover:text-foreground border border-border/60"
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate text-foreground">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {item.badge && (
                          <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-secondary text-muted-foreground border border-border/70">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight className={cn(
                          "h-3.5 w-3.5 transition-all",
                          isSelected ? "translate-x-0.5 text-foreground opacity-100" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {query.trim() && !loading && allResults.length === 0 && (
            <div className="py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground mx-auto mb-3">
                <Search className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                No matching results found
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Could not find any content, users, or pages matching &ldquo;{query}&rdquo;. Try another search term.
              </p>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground bg-secondary/20">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[9px] font-bold">↑</kbd>
              <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[9px] font-bold">↓</kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[9px] font-bold">↵</kbd>
              Open
            </span>
          </div>
          <span>Press ESC to exit</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
