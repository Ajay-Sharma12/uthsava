import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface } from "@/components/admin/Primitives";
import { FileText, Edit3 } from "lucide-react";

export const Route = createFileRoute("/cms")({
  head: () => ({ meta: [{ title: "CMS Management — Uthsava Admin" }] }),
  component: CmsPage,
});

const PAGES = [
  "About Us",
  "Contact Us",
  "Privacy Policy",
  "Terms & Conditions",
  "FAQ",
  "Refund Policy",
  "Community Guidelines",
];

function CmsPage() {
  return (
    <>
      <PageHeader
        title="CMS Management"
        description="Editable static pages with rich text editor."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Surface className="p-4 lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold">Pages</h3>
          <ul className="space-y-1">
            {PAGES.map((p, i) => (
              <li key={p}>
                <button
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  <FileText className="h-3.5 w-3.5" /> {p}
                </button>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">About Us</h3>
              <p className="text-[11px] text-muted-foreground">
                Last edited 2 days ago by Anand S.
              </p>
            </div>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs text-primary hover:bg-primary/20">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-border bg-secondary/40 p-1.5 text-xs text-muted-foreground">
            {["B", "I", "U", "H1", "H2", "Quote", "List", "Link", "Image"].map((b) => (
              <button key={b} className="rounded px-2 py-1 hover:bg-secondary">
                {b}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-5 text-sm leading-relaxed text-muted-foreground">
            <p className="text-foreground">
              Uthsava Entertainment is India's home-grown OTT destination for premium drama,
              mythology and contemporary cinema — streaming across 60+ countries, 12 languages and
              every screen you own.
            </p>
            <p className="mt-3">
              Founded in 2021, our mission is to back bold storytellers and deliver
              theatrical-quality experiences to every Indian household. From original series to
              celebrated indie films, Uthsava brings stories home in stunning 4K HDR.
            </p>
          </div>
        </Surface>
      </div>
    </>
  );
}
