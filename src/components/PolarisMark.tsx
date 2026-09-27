/**
 * Polaris — the guide. A restrained, geometric raccoon *face* mark (not the full
 * walking mascot, which is a touch cheesy at UI scale), drawn in the tool's own
 * palette per the Fintech North "Wired Mascot" guidelines: charcoal ink, muted
 * facets, paper face, and the single Maple Red "Polaris point" (the North Star)
 * on its head. The two eye-nodes and the star read as a tiny constellation, tying
 * it back to the Fintech North mark. The red uses the page's --fl-red so it
 * tracks the one crimson accent.
 *
 * Pass `label` where the avatar stands alone (e.g. inside the prompt field) so
 * screen readers announce "Polaris"; leave it off where visible "Polaris" text
 * sits right beside it (the avatar is then decorative).
 */
export function PolarisMark({
  size = 24,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        flex: "0 0 auto",
        lineHeight: 0,
      }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* Polaris point (the North Star on its head), a faceted diamond to
            match the geometric body rather than a soft circle, + spine wire
            down to the head. */}
        <path d="M50 4 L58 12 L50 20 L42 12 Z" style={{ fill: "var(--fl-red, #C41E3A)" }} opacity="0.14" />
        <line x1="50" y1="16" x2="50" y2="32" stroke="#6b6b66" strokeWidth="1.4" opacity="0.5" />
        <path d="M50 6 L56 12 L50 18 L44 12 Z" style={{ fill: "var(--fl-red, #C41E3A)" }} />

        {/* Ears (outer + inner) */}
        <path d="M32 42 L24 15 L48 35 Z" fill="#6b6b66" stroke="#1c1c1c" strokeWidth="3" strokeLinejoin="round" />
        <path d="M68 42 L76 15 L52 35 Z" fill="#6b6b66" stroke="#1c1c1c" strokeWidth="3" strokeLinejoin="round" />
        <path d="M34 38 L29 23 L45 34 Z" fill="#1c1c1c" />
        <path d="M66 38 L71 23 L55 34 Z" fill="#1c1c1c" />

        {/* Head */}
        <path
          d="M50 30 L72 41 L76 61 L61 83 L50 88 L39 83 L24 61 L28 41 Z"
          fill="#fbf9f3"
          stroke="#1c1c1c"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Bandit mask as a squared-off visor (straight edges, no curves) so it
            reads as a wired face-plate rather than a soft bandit band. */}
        <path
          d="M26 53 L40 47 L50 54 L60 47 L74 53 L72 66 L60 65 L50 61 L40 65 L28 66 Z"
          fill="#1c1c1c"
        />

        {/* Eyes as squared visor cutouts (not circles): rectangles hold their
            shape at the mark's real 24-26px usage size where a small circle
            collapses into the mask, and the flat geometry reads as a robotic
            display rather than a soft, organic eye. */}
        <rect x="33" y="52" width="12" height="9" rx="1.5" fill="#fbf9f3" />
        <rect x="55" y="52" width="12" height="9" rx="1.5" fill="#fbf9f3" />

        {/* Snout + nose, nose squared off to match the visor language */}
        <path
          d="M44 71 L56 71 L53 80 L50 82 L47 80 Z"
          fill="#ede7da"
          stroke="#1c1c1c"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="47" y="71" width="6" height="4" rx="1" fill="#1c1c1c" />
      </svg>
    </span>
  );
}
