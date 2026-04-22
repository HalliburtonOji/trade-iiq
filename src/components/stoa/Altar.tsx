import React from "react";
import PedimentCap from "./PedimentCap";

type AltarProps = {
  kicker?: string;
  greek?: string;
  title?: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  alert?: boolean;
  capped?: boolean;
  children?: React.ReactNode;
  className?: string;
};

/**
 * A reusable Stoa "altar" card: optional pediment cap, kicker + greek subtitle,
 * title, prominent value, sub line, and free-form children.
 *
 * All colors come from the surrounding Stoa palette via var(--stoa-*).
 */
export default function Altar({
  kicker,
  greek,
  title,
  value,
  sub,
  alert = false,
  capped = false,
  children,
  className = "",
}: AltarProps) {
  const borderColor = alert ? "var(--stoa-signal)" : "var(--stoa-rule)";
  return (
    <section
      className={className}
      style={{
        position: "relative",
        border: `1px solid ${borderColor}`,
        background: "var(--stoa-shine)",
        padding: "20px 22px",
        borderRadius: 2,
      }}
    >
      {capped && (
        <div style={{ position: "absolute", top: -6, left: 0, right: 0 }}>
          <PedimentCap variant="triangle" width="100%" />
        </div>
      )}

      <div style={{ position: "relative" }}>
        {alert && (
          <span
            aria-hidden="true"
            className="stoa-pulse"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: "var(--stoa-signal)",
            }}
          />
        )}

        {(kicker || greek) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10, minWidth: 0 }}>
            {kicker && (
              <span
                className="stoa-kicker"
                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {kicker}
              </span>
            )}
            {greek && (
              <span
                className="stoa-greek"
                style={{
                  color: "var(--stoa-accent)",
                  opacity: 0.7,
                  fontSize: 12,
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {greek}
              </span>
            )}
          </div>
        )}

        {title && (
          <h3
            className="stoa-display"
            style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--stoa-ink)" }}
          >
            {title}
          </h3>
        )}

        {value !== undefined && (
          <div
            className="stoa-mono"
            style={{
              fontSize: 34,
              lineHeight: 1.1,
              marginTop: title ? 12 : 4,
              color: "var(--stoa-ink)",
            }}
          >
            {value}
          </div>
        )}

        {sub && (
          <div style={{ marginTop: 8, color: "var(--stoa-muted)", fontSize: 13 }}>
            {sub}
          </div>
        )}

        {children && <div style={{ marginTop: 14 }}>{children}</div>}
      </div>
    </section>
  );
}
