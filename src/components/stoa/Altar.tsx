import { type ReactNode } from "react";
import PedimentCap from "./PedimentCap";

interface AltarProps {
  kicker?: string;
  greek?: string;
  title: string;
  value?: ReactNode;
  sub?: ReactNode;
  alert?: boolean;
  capped?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Stoa "Altar" card — the universal section/stat container.
 * Transparent background, hairline border, generous air.
 */
const Altar = ({
  kicker,
  greek,
  title,
  value,
  sub,
  alert = false,
  capped = false,
  children,
  className = "",
}: AltarProps) => {
  return (
    <div className={className}>
      {capped && <PedimentCap variant="rule" className="mb-3" />}
      <div
        tabIndex={0}
        className="relative transition-colors"
        style={{
          border: `1px solid ${alert ? "var(--signal)" : "var(--rule)"}`,
          background: "transparent",
          padding: "20px 22px",
          borderRadius: 2,
        }}
        onMouseEnter={(e) => {
          if (!alert) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--gold-rule)";
        }}
        onMouseLeave={(e) => {
          if (!alert) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--rule)";
        }}
      >
        {alert && (
          <span
            aria-hidden
            className="absolute"
            style={{
              top: 10,
              right: 10,
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--signal)",
            }}
          />
        )}

        {(kicker || greek) && (
          <div className="flex items-center gap-2 mb-3">
            {kicker && <span className="kicker">{kicker}</span>}
            {kicker && greek && (
              <span style={{ color: "var(--muted)" }} aria-hidden>·</span>
            )}
            {greek && <span className="greek text-[14px]">{greek}</span>}
          </div>
        )}

        <div className="display text-[15px]" style={{ color: "var(--muted)" }}>
          {title}
        </div>

        {value !== undefined && (
          <div
            className="display mt-2"
            style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.1, color: "var(--ink)" }}
          >
            {value}
          </div>
        )}

        {sub && (
          <div className="mt-2" style={{ color: "var(--muted)", fontSize: 13 }}>
            {sub}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default Altar;
