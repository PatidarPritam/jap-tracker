"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { AdminBottomNav } from "./AdminBottomNav";
import { LanguageToggle } from "./LanguageToggle";
import { trustName } from "./TrustShell";
import { Icon, type IconName } from "./ui";
import { useT } from "./LanguageProvider";
import type { TranslationKey } from "../lib/i18n";
import { clearSession } from "../lib/auth";
import { cn } from "../lib/cn";

const NAV: { href: string; labelKey: TranslationKey; icon: IconName }[] = [
  { href: "/admin", labelKey: "admin.navHome", icon: "chart" },
  { href: "/admin/devotees", labelKey: "admin.navDevotees", icon: "users" },
  { href: "/admin/sankalp", labelKey: "admin.navSankalp", icon: "target" },
  { href: "/admin/reports", labelKey: "admin.navReports", icon: "search" },
  { href: "/admin/announcements", labelKey: "admin.navAnnouncements", icon: "sparkles" },
];

const COLLAPSE_KEY = "admin.sidebarCollapsed";

/** /admin must not light up for every nested admin route. */
function isActiveHref(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * Persistent shell for the admin area: a sidebar on desktop, the existing tab
 * bar on mobile. Lives in `app/admin/layout.tsx` so the nav survives route
 * changes instead of being re-mounted by every page.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Read after mount — localStorage during render would mismatch on hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    clearSession("admin");
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface-muted transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Saffron → gold accent line, matching TrustShell. */}
        <div className="h-1 flex-none bg-gradient-to-r from-saffron-600 via-gold-500 to-saffron-600" />

        <Link
          href="/admin"
          className={cn(
            "flex min-w-0 items-center gap-3 px-4 py-5",
            isCollapsed && "justify-center px-0"
          )}
        >
          <span
            aria-hidden
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-saffron-700 text-lg font-semibold text-white shadow-sm"
          >
            ॐ
          </span>
          {!isCollapsed && (
            <span className="min-w-0">
              <span className="font-devanagari block truncate text-sm font-semibold leading-tight text-saffron-800">
                {trustName}
              </span>
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">
                Admin
              </span>
            </span>
          )}
        </Link>

        <nav aria-label="Admin sections" className="flex-1 px-3">
          <ul className="grid gap-1">
            {NAV.map((item) => {
              const isActive = isActiveHref(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    title={isCollapsed ? t(item.labelKey) : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                      isCollapsed && "justify-center px-0",
                      isActive
                        ? "bg-saffron-700 text-white shadow-sm"
                        : "text-ink-soft hover:bg-saffron-50 hover:text-saffron-800"
                    )}
                  >
                    <Icon name={item.icon} className="h-5 w-5 flex-none" />
                    {!isCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn("grid gap-2 border-t border-line p-3", isCollapsed && "justify-items-center")}>
          {!isCollapsed && <LanguageToggle />}
          <button
            type="button"
            onClick={logout}
            title={isCollapsed ? t("admin.logout") : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-saffron-50 hover:text-saffron-800",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Icon name="logout" className="h-5 w-5 flex-none" />
            {!isCollapsed && t("admin.logout")}
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-semibold text-muted transition hover:bg-saffron-50 hover:text-saffron-800",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Icon
              name="arrowRight"
              className={cn("h-4 w-4 flex-none transition-transform", !isCollapsed && "rotate-180")}
            />
            {!isCollapsed && t("admin.collapse")}
          </button>
        </div>
      </aside>

      {/* Mobile header — the sidebar is desktop-only, so the brand lives here. */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface-muted/90 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/75 lg:hidden">
        <div className="h-1 -mx-4 bg-gradient-to-r from-saffron-600 via-gold-500 to-saffron-600" />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-saffron-700 font-semibold text-white shadow-sm"
            >
              ॐ
            </span>
            <span className="font-devanagari min-w-0 truncate text-base font-semibold text-saffron-800">
              {trustName}
            </span>
          </Link>
          <div className="flex flex-none items-center gap-1">
            <LanguageToggle />
            <button
              type="button"
              onClick={logout}
              aria-label={t("admin.logout")}
              className="rounded-md p-2 text-ink-soft transition hover:bg-saffron-50 hover:text-saffron-800"
            >
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom padding clears the fixed tab bar on mobile. */}
      <div className={cn("pb-24 lg:pb-0", isCollapsed ? "lg:pl-20" : "lg:pl-64")}>{children}</div>

      <AdminBottomNav />
    </div>
  );
}
