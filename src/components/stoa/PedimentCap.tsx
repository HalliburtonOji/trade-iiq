import React from "react";

type PedimentCapProps = {
  variant?: "triangle" | "rule";
  width?: number | string;
  className?: string;
};

/**
 * Two variants:
 *  - "triangle": a small triangular pediment cap (clip-path) in Stoa gold.
 *  - "rule":     a 2px gold rule with a small rotated-square (diamond) tick
 *                centered beneath it.
 * Both inherit color from var(--stoa-accent).
 */
export default function PedimentCap({
  variant = "triangle",
  width = 120,
  className = "",
}: PedimentCapProps) {
  if (variant === "triangle") {
    return (
      <div
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

  // rule variant
  return (
    <div
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
}
