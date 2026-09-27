import type { MetadataRoute } from "next";
import { GLOSSARY } from "@/content/glossary";
import { GUIDES } from "@/content/guides";
import { COMPARE_PAIRS } from "@/content/compare";

/**
 * Sitemap for the public face: the landing at `/` plus the public knowledge
 * layer (`/learn` and every glossary term + guide). The studio is gated, the
 * legal pages are noindex, and the admin surface is owner-only, so none of those
 * appear here.
 *
 * Canonical host is the real domain in production (flows.fintechnorth.ca) — never
 * the *.vercel.app preview host — matching the canonical pin in app/layout.tsx.
 */
const SITE_URL =
  process.env.NODE_ENV === "production"
    ? "https://flows.fintechnorth.ca"
    : "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const learn: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/learn`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/learn/glossary`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/learn/guides`, changeFrequency: "monthly", priority: 0.7 },
    ...GLOSSARY.map((t) => ({
      url: `${SITE_URL}/learn/glossary/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/learn/guides/${g.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
  const compare: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/compare`, changeFrequency: "monthly", priority: 0.7 },
    ...COMPARE_PAIRS.map((p) => ({
      url: `${SITE_URL}/compare/${p.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
  return [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }, ...learn, ...compare];
}
