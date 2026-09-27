"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { isOptedOut } from "@/lib/analytics-optout";

// Vercel Web Analytics + Speed Insights, wrapped in a client component so we can
// give each a `beforeSend` that drops every event from an opted-out browser
// (?notrack=1). A function prop can't cross the server→client boundary, so the
// root layout (a server component) can't pass beforeSend itself — hence this
// wrapper. Both stay no-ops off Vercel, so local dev is never tracked either.
export function VercelAnalytics() {
  return (
    <>
      <Analytics beforeSend={(event) => (isOptedOut() ? null : event)} />
      <SpeedInsights beforeSend={(event) => (isOptedOut() ? null : event)} />
    </>
  );
}
