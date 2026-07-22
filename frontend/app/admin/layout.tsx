import { ReactNode } from "react";
import { AdminShell } from "../components/AdminShell";

/**
 * Wraps every admin route in the shared sidebar shell, so the nav persists
 * across navigations instead of each page rendering its own chrome.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
