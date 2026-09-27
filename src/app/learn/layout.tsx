import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

/**
 * The public knowledge layer wears the same light, banker-grade site chrome as
 * the legal pages so /learn reads as one Fintech North family. Ungated and
 * indexable (see middleware.ts + sitemap.ts); each page sets its own metadata.
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter currentPage="learn" />
    </>
  );
}
