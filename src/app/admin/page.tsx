import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { AdminUnlock } from "./AdminUnlock";
import { AdminReview } from "./AdminReview";

export const metadata: Metadata = {
  title: "Admin · Flow of Funds",
  description: "Owner-only conversation review for Flow of Funds.",
  robots: { index: false, follow: false },
};

// Always evaluate the admin cookie at request time — never cache the gated view.
export const dynamic = "force-dynamic";

/**
 * Owner-only review surface. Gated by its OWN admin cookie (separate from the
 * tester gate). Server component: it reads the cookie server-side and renders
 * either the unlock form or the review UI — the unauthed branch never ships the
 * review markup to the client.
 */
export default async function AdminPage() {
  const authed = await isAdmin();
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <SiteHeader />
      {authed ? <AdminReview /> : <AdminUnlock disabled={!adminConfigured()} />}
      <SiteFooter />
    </div>
  );
}
