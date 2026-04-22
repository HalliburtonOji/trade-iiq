import StoaLayout from "@/layouts/StoaLayout";
import PedimentCap from "@/components/stoa/PedimentCap";

interface PlaceholderProps {
  english: string;
  greek: string;
  pompeii?: boolean;
}

const StoaPlaceholder = ({ english, greek, pompeii }: PlaceholderProps) => (
  <StoaLayout pompeii={pompeii}>
    <div style={{ padding: "48px 32px" }}>
      <PedimentCap variant="triangle" />
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <div className="kicker">{greek.toUpperCase()} · {english.toUpperCase()}</div>
        <h1
          className="display"
          style={{ fontSize: 64, fontWeight: 500, marginTop: 18, color: "var(--ink)" }}
        >
          <span className="greek">{greek}</span>
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 14 }}>
          This sanctuary is being raised. Return shortly.
        </p>
      </div>
    </div>
  </StoaLayout>
);

export default StoaPlaceholder;
