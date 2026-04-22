interface MeanderProps {
  opacity?: number;
  className?: string;
}

/**
 * Greek-key (meander) ornamental band.
 * Uses CSS mask-image so the ornament inherits `var(--accent)`.
 * Repeats horizontally, 24px tall.
 */
const Meander = ({ opacity = 0.6, className = "" }: MeanderProps) => {
  // Inline SVG as data URL — single repeating tile of a Greek-key
  const tile =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 24' width='48' height='24' fill='none' stroke='black' stroke-width='2'>
        <path d='M2 22 V6 H14 V18 H8 V12 H20 V22 Z' />
        <path d='M26 22 V6 H38 V18 H32 V12 H44 V22 Z' />
      </svg>`
    );

  return (
    <div
      aria-hidden
      className={className}
      style={{
        height: 24,
        width: "100%",
        backgroundColor: "var(--accent)",
        opacity,
        WebkitMaskImage: `url("${tile}")`,
        maskImage: `url("${tile}")`,
        WebkitMaskRepeat: "repeat-x",
        maskRepeat: "repeat-x",
        WebkitMaskSize: "48px 24px",
        maskSize: "48px 24px",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
};

export default Meander;
