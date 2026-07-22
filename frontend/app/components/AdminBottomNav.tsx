"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./ui";
import { useT } from "./LanguageProvider";
import type { TranslationKey } from "../lib/i18n";
import { cn } from "../lib/cn";

const TABS: { href: string; labelKey: TranslationKey; icon: IconName }[] = [
  { href: "/admin", labelKey: "admin.navHome", icon: "chart" },
  { href: "/admin/devotees", labelKey: "admin.navDevotees", icon: "users" },
  { href: "/admin/sankalp", labelKey: "admin.navSankalp", icon: "target" },
  { href: "/admin/reports", labelKey: "admin.navReports", icon: "search" },
  { href: "/admin/announcements", labelKey: "admin.navAnnouncements", icon: "sparkles" },
];

/**
 * Mobile-only tab bar for the admin area. On a laptop the header nav in
 * TrustShell is the better fit — admins do the heavy work (registering
 * devotees, reading reports) at a desk — so this is hidden from `lg` up.
 */
export function AdminBottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      aria-label="Admin sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-muted/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-surface-muted/85 lg:hidden"
    >
      <ul className="mx-auto flex w-full max-w-lg">
        {TABS.map((tab) => {
          // /admin must not light up for every nested admin route.
          const isActive =
            tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-[0.7rem] font-semibold transition",
                  isActive ? "text-saffron-700" : "text-muted hover:text-saffron-700"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition",
                    isActive && "bg-saffron-100"
                  )}
                >
                  <Icon name={tab.icon} className="h-5 w-5" />
                </span>
                {t(tab.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
