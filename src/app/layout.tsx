import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import "./globals.css";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { VercelAnalytics } from "@/components/VercelAnalytics";

// Brand fonts. Archivo (a neutral grotesque) is the tool's banker-grade DISPLAY
// face for UI and headings. JetBrains Mono is the shared "signal" mono (numbers,
// URLs, code) that both this tool and the community site fintechnorth.ca use, so
// the mono voice reads as one brand across the two worlds (per BRAND.md, which
// names JetBrains Mono as the Fintech North mono). The community site keeps Outfit
// as its display face; this tool keeps Archivo. Shared mono, distinct display: the
// documented two-tier system. The app's CSS expects --font-geist-sans /
// --font-geist-mono (see globals.css); we keep those variable names and back them
// with the brand faces so nothing downstream has to change.
const brandSans = Archivo({
  variable: "--font-geist-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const brandMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

// One locked name everywhere: title tag, OG title, Twitter title.
const TITLE = "Flow of Funds, by Fintech North";
const DESCRIPTION =
  "Ask a payment question and get a sourced brief that separates approval, availability, and institutional settlement. A community project by Fintech North.";

// Canonical public host is flows.fintechnorth.ca (note the plural). Pin it so
// canonical, OG, and Twitter URLs are always the real domain — never the
// VERCEL_PROJECT_PRODUCTION_URL (which is a *.vercel.app host and must not show
// up in any share/OG copy). metadataBase also makes the OpenGraph image resolve
// to an absolute URL so link previews (WhatsApp, iMessage, Slack) render. Dev
// falls back to localhost.
const SITE_URL =
  process.env.NODE_ENV === "production"
    ? "https://flows.fintechnorth.ca"
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Flow of Funds",
  alternates: { canonical: "https://flows.fintechnorth.ca" },
  // Browser-tab + PWA identity: the Fintech North Polaris mark (crimson North
  // Star + charcoal nodes), shipped from the brand kit. The SVG favicon
  // (public/icon.svg) is preferred by modern browsers; the brand favicon.ico
  // (src/app/favicon.ico, Next's file convention) is auto-linked as the legacy
  // fallback, so we only declare the SVG here to avoid a duplicate .ico <link>.
  // apple-touch-icon is the cream Polaris-flow tile in public/ (the tool's daylight
  // world, vs the community site's dark tile). The whole icon set is generated from
  // assets/icons/*.master.svg by scripts/gen-icons.sh. The manifest
  // (public/manifest.webmanifest) carries the maskable PWA icons; it,
  // apple-touch-icon, and these icons are whitelisted past the gate in
  // middleware.ts.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  // Do NOT set metadata.robots here; the robots route is owned separately. ONE
  // canonical share card for every route: the cream Polaris-flow card in
  // public/og-image.png. (Previously studio/legal routes fell back to a
  // second, different file-based opengraph-image.tsx, so a shared homepage link
  // and a shared /studio link looked like two unrelated brands; that file was
  // removed.) page.tsx repeats the same image for `/`.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "https://flows.fintechnorth.ca",
    siteName: "Flow of Funds, by Fintech North",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Flow of Funds, payment flow diagrams built live by Fintech North",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

// Mobile viewport: device-width so the layout fits the screen; viewportFit cover
// activates env(safe-area-inset-*) on notched phones; interactiveWidget
// resizes-content shrinks the layout viewport when the on-screen keyboard opens
// (so a fixed bottom sheet stays above it). NO maximumScale/userScalable — pinch
// zoom is a deliberate accessibility requirement for the wide diagrams.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      className={`${brandSans.variable} ${brandMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        {/* Privacy: lift the handed-off payment query (?q=), the prefill-link
            payload (?d=, e.g. a link shared from the Polaris WhatsApp bot), and
            the post-unlock destination (?next=) OUT of the URL before anything
            else runs — so a sensitive payment scenario never reaches Google
            Analytics, the Referer header, or browser history. Stashed on
            window.__fofHandoff for the app to consume. beforeInteractive
            guarantees this runs ahead of the GA (afterInteractive) script. */}
        <Script id="fof-url-sanitizer" strategy="beforeInteractive">
          {`(function(){try{var u=new URL(window.location.href);var s=u.searchParams;var q=s.get('q'),n=s.get('next'),d=s.get('d');if(q===null&&n===null&&d===null)return;window.__fofHandoff={q:q,next:n,d:d};s.delete('q');s.delete('next');s.delete('d');var qs=s.toString();window.history.replaceState(null,'',u.pathname+(qs?'?'+qs:'')+u.hash);}catch(e){}})();`}
        </Script>
        {/* Privacy: GA4 Consent Mode defaults, set before the GA script loads.
            With analytics_storage and ad_storage denied, GA sets no cookies and
            sends cookieless pings only — matching the privacy page's promise. */}
        {gaMeasurementId ? (
          <Script id="fof-ga-consent" strategy="beforeInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});`}
          </Script>
        ) : null}
        <AnalyticsProvider>{children}</AnalyticsProvider>
        {/* Vercel Web Analytics + Speed Insights: cookieless, no IP stored, no
            cross-site profile (App Router auto-tracks route changes). Free on the
            Hobby plan. No-op off Vercel, so local dev isn't tracked. Wrapped so an
            opted-out browser (?notrack=1) is dropped via beforeSend. */}
        <VercelAnalytics />
      </body>
      {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
    </html>
  );
}
