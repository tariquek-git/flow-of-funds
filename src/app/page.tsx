import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import "./landing.css";

// `/` is now the PUBLIC, ungated front door (FinTechNorth consolidation Stage 2).
// It is reachable without the passphrase (see middleware PUBLIC list), so its
// metadata is the honest public face of the product — and unlike the gated
// studio/legal pages, it SHOULD be indexable. This overrides the root layout's
// metadata for the `/` route only.
// One locked name everywhere (title tag + OG + Twitter). The on-page H1 stays
// lowercase "flow of funds" by design; that's a visual choice, not the name.
const TITLE = "Flow of Funds, by Fintech North";
const DESCRIPTION =
  "Ask a payment question and get a sourced brief that separates approval, availability, and institutional settlement. A community project by Fintech North.";
const SHARE_DESCRIPTION =
  "Ask a payment question. Understand what the user sees, where principal moves, and when institutions settle.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://flows.fintechnorth.ca" },
  openGraph: {
    title: TITLE,
    description: SHARE_DESCRIPTION,
    type: "website",
    url: "https://flows.fintechnorth.ca",
    siteName: "Flow of Funds, by Fintech North",
    // The canonical Flow of Funds identity card (public/og-image.png) is
    // now the single share card for the whole site (set as the default in the
    // root layout); we repeat it here for the front door.
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SHARE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  // This page sets its own metadata, which replaces (not merges with) the root
  // layout's — so repeat the full brand icon set + manifest here, or the public
  // front door would lose the SVG favicon and PWA manifest. Mirrors layout.tsx:
  // brand Polaris SVG favicon (favicon.ico file-convention is the auto-linked
  // .ico fallback) + dark Polaris apple-touch tile.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return <Landing />;
}
