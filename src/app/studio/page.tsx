import type { Metadata } from "next";
import { Studio } from "@/components/Studio";

// The public landing now owns `/` and this route carries the studio. Access may
// still be guarded by middleware in preview deployments, but the user-facing
// posture is a community preview — keep metadata aligned with the front door.
export const metadata: Metadata = {
  title: "Studio · Flow of Funds (community preview)",
  description:
    "Flow of Funds studio, a community preview of a conversational tool for payments flow-of-funds diagrams.",
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  return <Studio />;
}
