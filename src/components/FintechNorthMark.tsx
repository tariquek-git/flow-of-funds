/**
 * The plain Fintech North Polaris mark (no payment labels, no money tokens) —
 * the clean brand glyph, reused in the studio chrome and the landing footer.
 * The red North Star is fixed; every other line and node uses `currentColor`, so
 * the mark adapts to its surface (charcoal on the light studio, cream on dark).
 * Upright by default; pass a tilt if a surface wants the leaning hero variant.
 */
export function FintechNorthMark({
  size = 28,
  tiltDeg = -12,
  className,
}: {
  size?: number;
  tiltDeg?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="Fintech North"
    >
      <g transform={tiltDeg ? `rotate(${tiltDeg} 100 100)` : undefined}>
        <line x1="100" y1="22" x2="100" y2="110" stroke="#C41E3A" strokeWidth="3" opacity="0.6" />
        <line x1="100" y1="22" x2="38" y2="80" stroke="currentColor" strokeWidth="2" opacity="0.34" />
        <line x1="100" y1="22" x2="162" y2="72" stroke="currentColor" strokeWidth="2" opacity="0.34" />
        <line x1="38" y1="80" x2="100" y2="110" stroke="currentColor" strokeWidth="1.6" opacity="0.24" />
        <line x1="162" y1="72" x2="100" y2="110" stroke="currentColor" strokeWidth="1.6" opacity="0.24" />
        <line x1="38" y1="80" x2="58" y2="160" stroke="currentColor" strokeWidth="1.4" opacity="0.18" />
        <line x1="162" y1="72" x2="148" y2="160" stroke="currentColor" strokeWidth="1.4" opacity="0.18" />
        <line x1="100" y1="110" x2="58" y2="160" stroke="currentColor" strokeWidth="1.4" opacity="0.18" />
        <line x1="100" y1="110" x2="148" y2="160" stroke="currentColor" strokeWidth="1.4" opacity="0.18" />
        <line x1="58" y1="160" x2="148" y2="160" stroke="currentColor" strokeWidth="1.2" opacity="0.12" />
        <circle cx="100" cy="22" r="9" fill="#C41E3A" />
        <circle cx="38" cy="80" r="6" fill="currentColor" opacity="0.55" />
        <circle cx="162" cy="72" r="6" fill="currentColor" opacity="0.55" />
        <circle cx="100" cy="110" r="5" fill="currentColor" opacity="0.45" />
        <circle cx="58" cy="160" r="4.5" fill="currentColor" opacity="0.35" />
        <circle cx="148" cy="160" r="4.5" fill="currentColor" opacity="0.35" />
      </g>
    </svg>
  );
}
