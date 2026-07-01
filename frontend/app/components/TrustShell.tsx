import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "../lib/cn";

export const trustName = "श्रीराम राम धाम परमार्थ आश्रम गुलावड़";

type ActiveKey = "home" | "admin" | "devotees" | "sankalp" | "devotee" | "reports";

type TrustShellProps = {
  children: ReactNode;
  active?: ActiveKey;
};

const ADMIN_KEYS: ActiveKey[] = ["admin", "devotees", "sankalp", "reports"];

export function TrustShell({ children, active = "home" }: TrustShellProps) {
  const isAdminArea = ADMIN_KEYS.includes(active);
  const links = isAdminArea
    ? [
        { href: "/admin", label: "Dashboard", key: "admin" },
        { href: "/admin/devotees", label: "Devotees", key: "devotees" },
        { href: "/admin/sankalp", label: "Sankalp", key: "sankalp" },
        { href: "/admin/reports", label: "Reports", key: "reports" },
      ]
    : [
        { href: "/", label: "Devotee Login", key: "home" },
        { href: "/admin/login", label: "Admin", key: "admin" },
      ];

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-ink">
      {/* Saffron → gold accent line */}
      <div className="h-1 bg-gradient-to-r from-saffron-600 via-gold-500 to-saffron-600" />

      <header className="sticky top-0 z-30 border-b border-line bg-surface-muted/90 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/75">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-saffron-700 text-lg font-semibold text-white shadow-sm"
            >
              ॐ
            </span>
            <span className="min-w-0">
              <span className="font-devanagari block truncate text-lg font-semibold leading-tight text-saffron-800 sm:text-xl">
                {trustName}
              </span>
              <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">
                Jap Sankalp Seva
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1.5 text-sm font-semibold">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active === link.key ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 transition",
                  active === link.key
                    ? "bg-saffron-700 text-white shadow-sm"
                    : "text-ink-soft hover:bg-saffron-50 hover:text-saffron-800"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-line bg-surface-muted">
        <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-6 text-sm text-muted sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <p className="font-devanagari font-semibold text-saffron-800">{trustName}</p>
          <p>Announcements, events, and seva updates will appear here.</p>
        </div>
      </footer>
    </main>
  );
}
