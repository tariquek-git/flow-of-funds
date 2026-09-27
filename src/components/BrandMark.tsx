"use client";

import { railBrand } from "@/lib/diagram/brands";

/** Official mark (when simple-icons has it) rendered from its 24x24 path. */
export function BrandGlyph({ text, size = 14 }: { text: string; size?: number }) {
  const brand = railBrand(text);
  if (!brand?.iconPath) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label={brand.label}
      className="shrink-0"
    >
      <path d={brand.iconPath} fill={brand.iconHex ?? brand.bg} />
    </svg>
  );
}

/** Rail chip: neutral pill with the official mark inline when one exists. */
export function RailChip({ rail, className }: { rail: string; className?: string }) {
  const brand = railBrand(rail);
  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1 rounded bg-[#ede7da] px-1.5 py-0.5 text-[10px] font-semibold text-[#1c1c1c]"
      }
    >
      {brand?.iconPath && <BrandGlyph text={rail} size={12} />}
      {rail}
    </span>
  );
}

/** Node badge: the real mark on a white chip, or a colored wordmark chip. */
export function NodeBrandBadge({ text }: { text: string }) {
  const brand = railBrand(text);
  if (!brand) return null;
  if (brand.iconPath) {
    return (
      <span
        title={brand.label}
        className="inline-flex items-center rounded bg-white px-1 py-0.5 ring-1 ring-[#e4dfd2]"
      >
        <BrandGlyph text={text} size={16} />
      </span>
    );
  }
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide"
      style={{
        background: brand.bg,
        color: brand.fg,
        fontStyle: brand.italic ? "italic" : undefined,
      }}
    >
      {brand.label}
    </span>
  );
}
