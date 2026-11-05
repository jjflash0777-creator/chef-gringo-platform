import { redirect } from "next/navigation";

/**
 * Retired in the 2026-11-05 blog redesign (approved blueprint): this
 * route was part of the old platform architecture. Redirect to the
 * nearest surviving equivalent so tracked links, scheduled posts, and
 * pins keep working.
 */
export default function RetiredRoute() {
  redirect("/learn");
}
