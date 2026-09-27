"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

export function SharedFlowView({ valid }: { valid: boolean }) {
  useEffect(() => {
    track("shared_flow_viewed", { valid });
  }, [valid]);
  return null;
}

export function OpenSharedFlowLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      onClick={() => track("shared_flow_opened")}
      className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#C41E3A] px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#a11930] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1c1c]/40"
    >
      Open the interactive flow →
    </Link>
  );
}
