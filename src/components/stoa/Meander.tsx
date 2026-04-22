import React from "react";

type MeanderProps = {
  width?: number | string;
  height?: number;
  opacity?: number;
  className?: string;
};

/**
 * A horizontal Greek-key (meander) ornament rendered as an SVG mask
 * so it inherits var(--stoa-accent) via background-color.
 */
export default function Meander({
  width = "100%",
  height = 18,
  opacity = 0.6,
  className = "",
}: MeanderProps) {
  // A repeating Greek-key tile, drawn as a filled SVG path. Used as a CSS mask
  // so the visible color comes from background-color = var(--stoa-accent).
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 18' width='40' height='18'>
    <path fill='black' d='M0 16h40v2H0zM2 0h6v12H2V0zm2 2v8h2V2H4zm6-2h6v8h-2V2h-2v10H10V0zm10 0h6v12h-6V0zm2 2v8h2V2h-2zm6-2h6v8h-2V2h-2v10h-2V0z'/>
  </svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={className}
      style={{
        width,
        height,
        opacity,
        backgroundColor: "var(--stoa-accent)",
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: "repeat-x",
        maskRepeat: "repeat-x",
        WebkitMaskSize: "auto 100%",
        maskSize: "auto 100%",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
      }}
    />
  );
}
