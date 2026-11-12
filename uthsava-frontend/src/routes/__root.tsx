import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  Link,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { canAccessDashboard, isAuthenticated, isDevAutoAuthEnabled } from "@/lib/session";
import { ensureAdminToken } from "@/lib/api";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

const isPublicRoute = (path: string): boolean => {
  return (
    path === "/login" ||
    path === "/reset-password" ||
    path.startsWith("/reset-password") ||
    path === "/auth/reset-password" ||
    path.startsWith("/auth/reset-password")
  );
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    // Browser storage is unavailable during SSR; the same guard runs during client navigation.
    if (typeof window === "undefined") return;

    const publicRoute = isPublicRoute(location.pathname);

    if (!publicRoute && !canAccessDashboard()) {
      throw redirect({ to: "/login" });
    }

    if (location.pathname === "/login" && isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Uthsava Entertainment — Admin" },
      { name: "description", content: "Premium OTT admin dashboard for Uthsava Entertainment." },
      { property: "og:title", content: "Uthsava Entertainment — Admin" },
      { name: "twitter:title", content: "Uthsava Entertainment — Admin" },
      {
        property: "og:description",
        content: "Premium OTT admin dashboard for Uthsava Entertainment.",
      },
      {
        name: "twitter:description",
        content: "Premium OTT admin dashboard for Uthsava Entertainment.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8341e8b3-ee3d-441a-84cb-6aa066a7f738/id-preview-890bed0f--16863abb-2faa-4e0c-b0c3-a36ae131905a.lovable.app-1778833203072.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8341e8b3-ee3d-441a-84cb-6aa066a7f738/id-preview-890bed0f--16863abb-2faa-4e0c-b0c3-a36ae131905a.lovable.app-1778833203072.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("uthsava_theme")||localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isPublic = isPublicRoute(pathname);

  // Check auth state immediately on browser mount and warm the dev session in the background
  useEffect(() => {
    setMounted(true);
    const allowed = canAccessDashboard();
    setIsSignedIn(allowed);
    if (!allowed && !isPublicRoute(window.location.pathname)) {
      window.location.replace("/login");
      return;
    }
    if (allowed && !isAuthenticated() && isDevAutoAuthEnabled()) {
      void ensureAdminToken();
    }
  }, [pathname]);

  if (isPublic) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="flex min-h-screen w-full bg-background text-foreground transition-colors">
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Keep server and client HTML identical until authentication is checked in the browser.
  if (!mounted || !isSignedIn) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground transition-colors">
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
