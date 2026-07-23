"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "../lib/auth";
import { useT } from "./LanguageProvider";
import { cn } from "../lib/cn";

type Session = "admin" | "devotee" | "none";

/**
 * Public-page header nav. Login buttons only make sense when nobody is logged
 * in — once a token exists we point to that role's dashboard instead. Session
 * lives in localStorage, so this must run on the client after mount.
 */
export function HeaderNav({ activeKey }: { activeKey: string }) {
  const t = useT();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getToken("admin") ? "admin" : getToken("devotee") ? "devotee" : "none");
  }, []);

  // Unknown until mount — render nothing rather than flashing login buttons.
  if (session === null) return null;

  const links =
    session === "admin"
      ? [{ href: "/admin", label: t("headerNav.adminDashboard"), key: "admin" }]
      : session === "devotee"
        ? [{ href: "/jap", label: t("headerNav.myJap"), key: "devotee" }]
        : [
            { href: "/login", label: t("headerNav.devoteeLogin"), key: "home" },
            { href: "/login", label: t("headerNav.admin"), key: "admin" },
          ];

  return (
    <nav className="flex flex-wrap gap-1.5 text-sm font-semibold">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          aria-current={activeKey === link.key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-2 transition",
            activeKey === link.key
              ? "bg-saffron-700 text-white shadow-sm"
              : "text-ink-soft hover:bg-saffron-50 hover:text-saffron-800"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
