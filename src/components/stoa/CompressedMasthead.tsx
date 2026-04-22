import Meander from "./Meander";

interface Props {
  meanderWidth?: number;
}

/** 64px tall centered ΣTOA wordmark + meander, with 1px gold-rule bottom. */
const CompressedMasthead = ({ meanderWidth = 200 }: Props) => (
  <div
    style={{
      height: 64,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      borderBottom: "1px solid var(--gold-rule)",
      gap: 6,
    }}
  >
    <div className="display" style={{ fontSize: 24, letterSpacing: "0.15em", color: "var(--ink)" }}>
      ΣTOA
    </div>
    <div style={{ width: meanderWidth, opacity: 0.7 }}>
      <Meander opacity={0.6} />
    </div>
  </div>
);

export default CompressedMasthead;
