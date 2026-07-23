import Link from "next/link";
import { AdminBottomNav } from "./AdminBottomNav";
import { HeaderNav } from "./HeaderNav";
import { LanguageToggle } from "./LanguageToggle";
import { ReactNode } from "react";
import { cn } from "../lib/cn";
import { SITE } from "../lib/site";

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
    : [];

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
          {/* On mobile the admin area uses AdminBottomNav instead. */}
          {isAdminArea ? (
            <nav className="hidden flex-wrap gap-1.5 text-sm font-semibold lg:flex">
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
          ) : (
            <HeaderNav activeKey={active} />
          )}
          <LanguageToggle className="self-start lg:self-auto" />
        </div>
      </header>

      {/* Bottom padding clears the fixed admin tab bar on mobile. */}
      <div className={cn("flex-1", isAdminArea && "pb-24 lg:pb-0")}>{children}</div>

      {isAdminArea && <AdminBottomNav />}

      <footer className={cn("border-t border-line bg-surface-muted", isAdminArea && "hidden lg:block")}>
        <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-6 text-sm text-muted sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <p className="font-devanagari font-semibold text-saffron-800">{trustName}</p>
          <Link href="/about" className="font-semibold text-saffron-700 hover:text-saffron-800">
            About Us
          </Link>
        </div>
        <div className="border-t border-line-soft">
          <p className="font-devanagari mx-auto w-full max-w-7xl px-4 py-3 text-center text-xs text-muted sm:px-6 lg:px-8">
            © {SITE.year} {trustName} · All rights reserved
          </p>
        </div>
      </footer>
    </main>
  );
}
