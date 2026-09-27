"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { initAnalytics, capturePageview, GA_MEASUREMENT_ID } from "@/lib/analytics";
import { syncOptOutFromUrl, isOptedOut } from "@/lib/analytics-optout";

// Initializes PostHog once on the client and records a pageview on every route
// change. Google Analytics pageviews are handled by the <GoogleAnalytics />
// component in the root layout. No-ops unless analytics env vars are set — and a
// browser that opted out via ?notrack=1 is excluded from every sink.
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const optedOut = syncOptOutFromUrl();
    // GA pageviews come from the <GoogleAnalytics /> component, not track(), so
    // flip GA's documented kill switch for an opted-out browser.
    if (optedOut && GA_MEASUREMENT_ID) {
      (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    }
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname || isOptedOut()) return;
    capturePageview(window.location.href);
  }, [pathname]);

  return <>{children}</>;
}
