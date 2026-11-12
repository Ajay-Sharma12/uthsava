// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isCiOrCloudSandbox = Boolean(
  process.env.CI || process.env.LOVABLE_SANDBOX || process.env.DEV_SERVER__PROJECT_PATH,
);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    // Store Vite's pre-bundled dependency cache outside OneDrive to avoid sync locks and slow cold starts.
    cacheDir: path.join(os.tmpdir(), "uthsava-frontend-vite-cache"),
    server: {
      open: isCiOrCloudSandbox ? false : "/",
      warmup: {
        clientFiles: [
          "./src/routes/__root.tsx",
          "./src/routes/index.tsx",
          "./src/components/admin/Sidebar.tsx",
          "./src/components/admin/Header.tsx",
          "./src/lib/api.ts",
          "./src/lib/session.ts",
        ],
      },
      watch: {
        ignored: ["**/node_modules/**", "**/.git/**", "**/.tanstack/**", "**/dist/**"],
      },
    },
    optimizeDeps: {
      holdUntilCrawlEnd: false,
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-router",
        "@tanstack/react-query",
        "lucide-react",
        "recharts",
        "sonner",
        "clsx",
        "tailwind-merge",
        "class-variance-authority",
        "date-fns",
        "lodash.debounce",
      ],
    },
  },
});
