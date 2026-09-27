/**
 * A clean folded-towel glyph — the one indispensable item for any galactic
 * hitchhiker, and the quiet wink behind the Guide framing. Deliberately minimal
 * line work (not a sketchy illustration): a folded towel with a hanging fold,
 * rendered in charcoal ink so it sits in the warm Fintech North palette without
 * shouting. Decorative, hence aria-hidden by default.
 */
export function TowelMark({
  size = 16,
  className,
  color = "#1c1c1c",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={className}
    >
      {/* rail the towel hangs from */}
      <path d="M3 5h18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* the folded towel body */}
      <path
        d="M6 5v12.5a1.5 1.5 0 0 0 1.5 1.5H10V5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 5v14h2.5a1.5 1.5 0 0 0 1.5-1.5V5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* the gap between the two hanging halves + a hint of terry stitching */}
      <path d="M10 8.5h4M10 11h4" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
