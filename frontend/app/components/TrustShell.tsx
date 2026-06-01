import Link from "next/link";
import { ReactNode } from "react";

export const trustName = "श्रीराम राम धाम परमार्थ आश्रम गुलावाड़";

type TrustShellProps = {
  children: ReactNode;
  active?: "home" | "admin" | "devotees" | "sankalp" | "devotee" | "reports";
};

export function TrustShell({ children, active = "home" }: TrustShellProps) {
  const isAdminArea =
    active === "admin" || active === "devotees" || active === "sankalp" || active === "reports";
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
    <main className="min-h-screen bg-[#faf6ed] text-[#211f1a]">
      <header className="sticky top-0 z-20 border-b border-[#eadcc2] bg-[#fffaf1]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="min-w-0">
            <p className="text-lg font-semibold leading-7 text-[#8a3d16] sm:text-xl">
              {trustName}
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f5b35]">
              Jap Sankalp Seva
            </p>
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 transition ${
                  active === link.key
                    ? "bg-[#8a3d16] text-white"
                    : "text-[#5f4c2b] hover:bg-[#f0e3cc]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-[#eadcc2] bg-[#fffaf1]">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 text-sm text-[#6b6255] sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <p className="font-semibold text-[#8a3d16]">{trustName}</p>
          <p>Announcements, events, and seva updates will appear here.</p>
        </div>
      </footer>
    </main>
  );
}
