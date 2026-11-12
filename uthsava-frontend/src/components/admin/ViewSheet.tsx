import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusPill } from "./Primitives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ViewSection = {
  title: string;
  rows: { label: string; value: React.ReactNode }[];
};

export function ViewSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  status,
  hero,
  sections,
  actions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  status?: string;
  hero?: React.ReactNode;
  sections: ViewSection[];
  actions?: {
    label: string;
    onClick?: () => void;
    variant?: "primary" | "default" | "destructive";
  }[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {title}
            {status && <StatusPill status={status} />}
          </SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        {hero && <div className="mt-4">{hero}</div>}

        <div className="mt-6 space-y-6">
          {sections.map((s) => (
            <section key={s.title}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.title}
              </h4>
              <dl className="overflow-hidden rounded-lg border border-border bg-card">
                {s.rows.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      "grid grid-cols-3 gap-3 px-3 py-2.5 text-sm",
                      i > 0 && "border-t border-border",
                    )}
                  >
                    <dt className="text-muted-foreground">{r.label}</dt>
                    <dd className="col-span-2 text-foreground/90">{r.value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        {actions && actions.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => (a.onClick ? a.onClick() : toast.success(`${a.label}`))}
                className={cn(
                  "h-9 rounded-md px-3 text-xs font-medium transition",
                  a.variant === "primary" &&
                    "bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110",
                  a.variant === "destructive" &&
                    "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
                  (!a.variant || a.variant === "default") &&
                    "border border-border bg-card hover:bg-secondary",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
