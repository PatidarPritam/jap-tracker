import { redirect } from "next/navigation";

/** Legacy route — devotees and admins now share /login. */
export default function AdminLoginRedirect() {
  redirect("/login");
}
