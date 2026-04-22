import React from "react";

type MeanderProps = {
  width?: number | string;
  height?: number;
  opacity?: number;
  className?: string;
};

/**
 * A horizontal Greek-key (meander) ornament.
 *
 * Drawn as a stroked SVG path inside a mask so the visible color comes
 * from `background-color: var(--stoa-accent)`. Tiles horizontally every
 * 40px so it reads as a continuous spiral band regardless of width.
 */
export default function Meander({
  width = "100%",
  height = 20,
  opacity = 0.7,
  className = "",
}: MeanderProps) {
  // Classic Greek-key spiral, 40x20 tile. Drawn with H/V shorthand for
  // clarity; the last point (40,2) meets (0,2) of the next tile so the
  // pattern is seamlessly continuous when tiled.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 20'>
    <path fill='none' stroke='black' stroke-width='2' stroke-linecap='square' stroke-linejoin='miter' d='M0 2 H8 V14 H4 V6 H16 V18 H24 V6 H36 V14 H32 V2 H40'/>
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
        WebkitMaskSize: "40px 100%",
        maskSize: "40px 100%",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
      }}
    />
  );
}
