import { redirect } from "next/navigation";

/**
 * Legacy per-id route. The devotee app now resolves the signed-in devotee from
 * the session, so old bookmarks land on the same dashboard without the id.
 */
export default function LegacyDevoteeRedirect() {
  redirect("/jap");
}
