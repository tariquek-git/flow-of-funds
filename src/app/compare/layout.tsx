import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

/**
 * The rail-compare surface wears the same light, banker-grade site chrome as
 * /learn and the legal pages so it reads as one Fintech North family. Ungated and
 * indexable (see middleware.ts + sitemap.ts); each page sets its own metadata.
 */
export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
