import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OptionItem {
  label: string;
  value: string;
}

export interface CustomSelectProps {
  value?: string;
  onChange: (val: string) => void;
  options: (string | OptionItem)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  className,
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const strValue =
    typeof value === "string"
      ? value
      : value !== undefined && value !== null
      ? typeof (value as any)?.name === "string"
        ? (value as any).name
        : typeof (value as any)?._id === "string"
        ? (value as any)._id
        : String(value)
      : "";

  const hasVal = Boolean(strValue && strValue.trim() !== "");

  const normalizedOptions: OptionItem[] = (options || []).map((opt) => {
    if (typeof opt === "string") {
      return { label: opt, value: opt };
    }
    if (opt && typeof opt === "object") {
      const lbl =
        (opt as any).label ??
        (opt as any).name ??
        (opt as any).title ??
        String((opt as any).value ?? "");
      const val =
        (opt as any).value ??
        (opt as any).name ??
        (opt as any)._id ??
        (opt as any).id ??
        lbl;
      return { label: String(lbl), value: String(val) };
    }
    return { label: String(opt), value: String(opt) };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => opt.value === strValue || opt.label === strValue
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button matching Photo 2 */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-2xl border px-3.5 text-xs transition-all duration-200 cursor-pointer shadow-2xs backdrop-blur-md",
          open
            ? "border-primary/50 bg-primary/10 ring-2 ring-primary/20 shadow-xs text-primary font-bold"
            : hasVal
            ? "border-primary/40 bg-primary/10 text-primary font-bold"
            : "border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/50",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : strValue || placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasVal && (
            <Check className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180 text-primary"
            )}
          />
        </div>
      </button>

      {/* Popover Dropdown matching Photo 2 */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[180px] max-h-64 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl p-1.5 shadow-2xl space-y-0.5 animate-in fade-in-0 zoom-in-95 text-foreground ring-1 ring-border/50 scrollbar-thin">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer",
                !hasVal
                  ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                  : "text-muted-foreground/70 hover:bg-secondary/70 hover:text-foreground"
              )}
            >
              <span className="truncate">{placeholder}</span>
              {!hasVal ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary stroke-[2.5]" />
              ) : null}
            </button>
          )}

          {normalizedOptions.map((option) => {
            const isSelected = strValue === option.value || strValue === option.label;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer",
                  isSelected
                    ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary stroke-[2.5]" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface MultiSelectProps {
  values?: string[];
  onChange: (vals: string[]) => void;
  options: (string | OptionItem)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  values = [],
  onChange,
  options,
  placeholder = "Filter & select genres",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: OptionItem[] = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const toggleOption = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button with Filter styling */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between rounded-xl border px-3.5 py-1.5 text-xs transition-all duration-200 cursor-pointer shadow-2xs backdrop-blur-md text-left",
          open
            ? "border-primary/50 bg-secondary/50 ring-2 ring-primary/15 shadow-xs"
            : values.length > 0
            ? "border-primary/40 bg-primary/[0.04]"
            : "border-border/70 bg-secondary/30 hover:bg-secondary/50",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 mr-2">
          <Filter className={cn("h-3.5 w-3.5 shrink-0 mr-0.5", values.length > 0 ? "text-primary" : "text-muted-foreground")} />
          {values.length === 0 ? (
            <span className="text-muted-foreground/70">{placeholder}</span>
          ) : (
            values.map((v) => {
              const opt = normalizedOptions.find((o) => o.value === v);
              return (
                <span
                  key={v}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-[11px] font-semibold text-primary"
                >
                  {opt ? opt.label : v}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(v);
                    }}
                    className="hover:text-foreground hover:bg-primary/20 rounded-full px-1 cursor-pointer text-xs leading-none"
                  >
                    ×
                  </span>
                </span>
              );
            })
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Popover Dropdown matching Filter styling */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[220px] max-h-64 overflow-y-auto rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl p-1.5 shadow-2xl space-y-1 animate-in fade-in-0 zoom-in-95 text-foreground ring-1 ring-border/50 scrollbar-thin">
          <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/50 pb-1.5">
            <span>Filter Genres ({values.length} selected)</span>
            {values.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-primary hover:underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {normalizedOptions.length > 6 && (
            <div className="px-1 py-0.5">
              <input
                type="text"
                placeholder="Search genre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-full rounded-lg border border-border/70 bg-secondary/40 px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching genres
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = values.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer",
                      isSelected
                        ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    <div
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-md border transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/80 bg-secondary/40"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
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
