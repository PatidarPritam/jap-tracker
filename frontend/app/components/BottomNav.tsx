"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./ui";
import { cn } from "../lib/cn";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/jap", label: "Jap", icon: "beads" },
  { href: "/progress", label: "Progress", icon: "chart" },
  { href: "/sankalp", label: "Sankalp", icon: "target" },
  { href: "/me", label: "Me", icon: "user" },
];

/**
 * Thumb-reachable tab bar for the devotee app. Fixed to the bottom and padded
 * for the iOS home indicator so it never sits under the system gesture area.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-muted/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-surface-muted/85"
    >
      <ul className="mx-auto flex w-full max-w-lg">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
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
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
