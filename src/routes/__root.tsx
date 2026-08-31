import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import fastCashCss from "../fastcash.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { FastCashProvider, useFastCash } from "@/lib/fastcash/FastCashContext";
import { Header, PwaInstallBanner, WhatsAppModal } from "@/components/fastcash/pages.jsx";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const appUrl = import.meta.env["VITE_APP_URL"] || "https://inclusive-eyes.lovable.app";
const ogImage = `${appUrl}/og-image.png`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#08131d" },
      { name: "author", content: "Fast Cash" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: fastCashCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const {
    t,
    lang,
    setLang,
    theme,
    toggleTheme,
    user,
    logout,
    drawer,
    setDrawer,
    page,
    move,
    toast,
    waModalTx,
    closeWaModal,
    notifications,
    unreadNotifications,
    markNotificationsRead,
  } = useFastCash();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {user && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 40 }}>
          <details>
            <summary
              style={{
                cursor: "pointer",
                listStyle: "none",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "9px 13px",
                boxShadow: "0 8px 24px rgba(0,0,0,.18)",
              }}
              aria-label="Notifications"
            >
              🔔{" "}
              {unreadNotifications > 0 && (
                <b style={{ color: "var(--green)" }}>{unreadNotifications}</b>
              )}
            </summary>
            <div
              style={{
                marginTop: 8,
                width: 310,
                maxWidth: "calc(100vw - 32px)",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: 12,
                boxShadow: "0 14px 40px rgba(0,0,0,.28)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <strong>Notifications</strong>
                {unreadNotifications > 0 && (
                  <button type="button" onClick={() => markNotificationsRead()}>
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {notifications.length === 0 ? (
                  <small style={{ color: "var(--muted)" }}>No notifications yet.</small>
                ) : (
                  notifications.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => markNotificationsRead(item.id)}
                      style={{
                        textAlign: "left",
                        padding: 9,
                        borderRadius: 9,
                        background: item.read_at ? "transparent" : "rgba(182,255,53,.08)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <b style={{ display: "block" }}>{item.title}</b>
                      <small>{item.message}</small>
                    </button>
                  ))
                )}
              </div>
            </div>
          </details>
        </div>
      )}
      <Header
        page={page}
        move={move}
        user={user}
        logout={logout}
        drawer={drawer}
        setDrawer={setDrawer}
        theme={theme}
        toggleTheme={toggleTheme}
        lang={lang}
        setLang={setLang}
        t={t}
      />
      <main id="main-content">
        <PwaInstallBanner t={t} />
        <Outlet />
      </main>
      <footer>
        <b>FAST CASH</b>
        <span>{t.footer.text}</span>
        <nav aria-label="Footer">
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" onClick={() => move("PrivacyPolicy")}>
              {t?.nav?.["PrivacyPolicy"] || "Privacy Policy"}
            </button>
            <button type="button" onClick={() => move("Admin")}>
              {t?.nav?.["Admin"] || "Admin"}
            </button>
            <button type="button" onClick={() => move("Support")}>
              {t.footer.support}
            </button>
          </div>
        </nav>
      </footer>
      <nav className="bottom-nav" aria-label="Primary">
        {(
          [
            ["🏠", "Home"],
            ["⚡", "Deposit"],
            ["💳", "Withdraw"],
            ["📋", "Transactions"],
            ["☰", "Menu"],
          ] as const
        ).map(([icon, p]) => (
          <button
            type="button"
            onClick={() => (p === "Menu" ? setDrawer(true) : move(p))}
            aria-current={page === p ? "page" : undefined}
            aria-expanded={p === "Menu" ? drawer : undefined}
            aria-label={t.nav[p] || p}
            key={p}
          >
            <b aria-hidden="true">{icon}</b>
            {t.nav[p] || p}
          </button>
        ))}
      </nav>

      {waModalTx && (
        <WhatsAppModal tx={waModalTx} onClose={closeWaModal} lang={lang} user={user} t={t} />
      )}
      {/* Status messages are announced to screen readers as they appear. */}
      <div aria-live="polite" aria-atomic="true">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Fast Cash service worker registration failed:", error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FastCashProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <AppShell />
      </FastCashProvider>
    </QueryClientProvider>
  );
}
