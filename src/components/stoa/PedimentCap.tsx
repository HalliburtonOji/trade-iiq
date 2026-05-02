import React from "react";

type PedimentCapProps = {
  variant?: "triangle" | "rule";
  width?: number | string;
  className?: string;
};

/**
 * Two variants:
 *  - "triangle": a small triangular pediment cap (clip-path) in Stoa gold.
 *  - "rule":     a 2px gold rule with a small rotated-square (diamond) tick.
 */
const PedimentCap = React.forwardRef<HTMLDivElement, PedimentCapProps>(function PedimentCap(
  { variant = "triangle", width = 120, className = "" },
  ref,
) {
  if (variant === "triangle") {
    return (
      <div
        ref={ref}
        role="presentation"
        aria-hidden="true"
        className={className}
        style={{ width, display: "flex", justifyContent: "center" }}
      >
        <div
          style={{
            width: 18,
            height: 10,
            backgroundColor: "var(--stoa-accent)",
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={className}
      style={{ width, display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div
        style={{
          width: "100%",
          height: 2,
          backgroundColor: "var(--stoa-accent)",
          opacity: 0.9,
        }}
      />
      <div
        style={{
          width: 10,
          height: 10,
          marginTop: 6,
          backgroundColor: "var(--stoa-accent)",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
});

export default PedimentCap;
