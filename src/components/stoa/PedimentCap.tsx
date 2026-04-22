interface PedimentCapProps {
  variant?: "triangle" | "rule";
  className?: string;
}

/**
 * A small ornamental cap that sits above a section header.
 * - "triangle": a 14px tall triangle outlined in gold-rule.
 * - "rule": a 2px gold horizontal line with a centered diamond tick beneath.
 */
const PedimentCap = ({ variant = "triangle", className = "" }: PedimentCapProps) => {
  if (variant === "rule") {
    return (
      <div className={`flex flex-col items-center w-full ${className}`} aria-hidden>
        <div
          style={{
            height: 2,
            width: "100%",
            backgroundColor: "var(--accent)",
            opacity: 0.55,
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            marginTop: 6,
            transform: "rotate(45deg)",
            border: "1px solid var(--gold-rule)",
            backgroundColor: "var(--accent)",
            opacity: 0.85,
          }}
        />
      </div>
    );
  }

  // triangle
  return (
    <div className={`flex justify-center ${className}`} aria-hidden>
      <div
        style={{
          width: 28,
          height: 14,
          clipPath: "polygon(50% 0, 0 100%, 100% 100%)",
          border: "1px solid var(--gold-rule)",
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
};

export default PedimentCap;
