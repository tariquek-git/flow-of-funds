import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Allows the app's real dependencies only:
//  - GA via @next/third-parties (googletagmanager + google-analytics)
//  - PostHog (us assets + ingestion host)
//  - inline styles/scripts Next emits (no nonce pipeline here)
//  - data:/blob: images so the html-to-image PNG export works
// 'unsafe-eval' is added ONLY in dev (React Fast Refresh needs it); production
// never ships it.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://us-assets.i.posthog.com https://us.i.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.i.posthog.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS directory. A stray package.json/lockfile in a
  // parent dir (e.g. ~/package.json) makes Next infer the wrong monorepo root,
  // which can mislocate output file tracing and break the Turbopack build. This
  // anchors both to the app dir explicitly.
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
