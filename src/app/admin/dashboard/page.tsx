import { redirect } from "next/navigation";

/**
 * The previous dashboard relied on a client-created localStorage role.
 * All administration now enters through Supabase Auth and database role
 * assignments in the new Leader Registry.
 */
export default function AdminDashboardRedirect() {
  redirect("/admin/ibiro");
}
