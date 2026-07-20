import { redirect } from "next/navigation";

/**
 * The app has no marketing landing page: opening it goes to sign-in, which
 * immediately forwards to the dashboard when a session already exists.
 */
export default function Home() {
  redirect("/login");
}
