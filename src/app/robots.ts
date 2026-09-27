import type { MetadataRoute } from "next";

/**
 * The app now has a PUBLIC front door (the landing at `/`) plus a GATED studio
 * and owner-only surfaces. So crawling is allowed for the public face but the
 * gated/owner paths are disallowed outright:
 *  - `/studio` is behind the passphrase gate (and its own metadata is noindex).
 *  - `/unlock` and `/admin` are gates/owner tools, not content.
 *  - `/api/` is never indexable.
 * The gate itself still fails closed on Vercel; this is the belt-and-suspenders
 * signal for well-behaved crawlers and link unfurlers.
 */
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/unlock", "/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
