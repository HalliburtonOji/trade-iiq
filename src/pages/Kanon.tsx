import StoaLayout from "@/layouts/StoaLayout";
import CompressedMasthead from "@/components/stoa/CompressedMasthead";
import PedimentCap from "@/components/stoa/PedimentCap";
import Meander from "@/components/stoa/Meander";
import Altar from "@/components/stoa/Altar";

const DELPHI_TOKENS = [
  { name: "--bg", hex: "#0E1116" },
  { name: "--ink", hex: "#F2EAD7" },
  { name: "--muted", hex: "#9AA0A6" },
  { name: "--accent", hex: "#D4A94A" },
  { name: "--secondary", hex: "#6F7B3F" },
  { name: "--signal", hex: "#C1440E" },
];

const POMPEII_TOKENS = [
  { name: "--bg", hex: "#EFE6D2" },
  { name: "--ink", hex: "#2B1D13" },
  { name: "--muted", hex: "#6B5A43" },
  { name: "--accent", hex: "#C19A3A" },
  { name: "--secondary", hex: "#7A7A3A" },
  { name: "--signal", hex: "#9A2A1E" },
];

const TYPE_ROLES = [
  { role: "Display", className: "display", sample: "Marcus Aurelius", stack: "Cormorant Garamond", size: "32px", spacing: "0.01em", weight: "500" },
  { role: "Body", className: "", sample: "The disciplined trader does not flinch.", stack: "IBM Plex Serif", size: "15px", spacing: "0", weight: "400" },
  { role: "Kicker", className: "kicker", sample: "ENTABLATURE · KICKER", stack: "Inter", size: "11px", spacing: "0.14em", weight: "600" },
  { role: "Greek", className: "greek", sample: "Νίκη", stack: "Cormorant Garamond italic", size: "18px", spacing: "0.02em", weight: "400" },
  { role: "Data", className: "mono", sample: "$24,318.44 · 1.4R", stack: "IBM Plex Mono", size: "14px", spacing: "0", weight: "400" },
];

const MOTION = [
  { name: "fast", duration: "120ms", easing: "ease-out" },
  { name: "normal", duration: "180ms", easing: "ease-out" },
  { name: "slow", duration: "320ms", easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  { name: "pulse", duration: "1800ms", easing: "ease-in-out infinite" },
];

const Kanon = () => {
  return (
    <StoaLayout>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes shine { 0% { transform: translateX(-100%) } 100% { transform: translateX(200%) } }
          .kanon-skeleton { position: relative; overflow: hidden; }
          .kanon-skeleton::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(212,169,74,0.1), transparent); animation: shine 1.6s linear infinite; }
        }
      `}</style>
      <CompressedMasthead />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px 96px" }}>
        <div className="kicker" style={{ marginBottom: 8 }}>ΚΑΝΩΝ · KANON · Style guide</div>
        <p style={{ color: "var(--muted)", fontStyle: "italic", marginBottom: 56 }}>The rule, the ruler, the standard.</p>

        <SectionTitle title="Palette" />
        <div style={{ marginBottom: 24 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>Delphi Night</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {DELPHI_TOKENS.map((t) => <Swatch key={t.name} {...t} />)}
          </div>
        </div>
        <div style={{ marginBottom: 56 }} className="p-pompeii">
          <div className="kicker" style={{ marginBottom: 8 }}>Pompeii</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {POMPEII_TOKENS.map((t) => <Swatch key={t.name} {...t} />)}
          </div>
        </div>

        <SectionTitle title="Typography" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 56 }}>
          {TYPE_ROLES.map((t) => (
            <div key={t.role} style={{ border: "1px solid var(--rule)", padding: 20 }}>
              <div className="kicker" style={{ marginBottom: 8 }}>{t.role}</div>
              <div className={t.className} style={{ marginBottom: 12, fontSize: t.size, color: "var(--ink)" }}>{t.sample}</div>
              <div className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>{t.stack} · {t.size} · {t.spacing} · {t.weight}</div>
            </div>
          ))}
        </div>

        <SectionTitle title="Buttons" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }}>
          {["Primary", "Ghost", "Signal"].map((kind) => (
            <div key={kind}>
              <div className="kicker" style={{ marginBottom: 12 }}>{kind}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Default", "Hover", "Pressed", "Focused", "Disabled"].map((state) => (
                  <button key={state} style={btnStyle(kind, state)} disabled={state === "Disabled"}>
                    {state}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SectionTitle title="Altar cards" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 56 }}>
          <Altar kicker="RISK" greek="Κλωθώ" title="Position size" value="$412" sub="2.0% of account" />
          <Altar kicker="RISK" greek="Κλωθώ" title="Position size" value="$412" sub="2.0% of account" capped />
          <Altar kicker="LIMIT" greek="Ἄτροπος" title="Max loss today" value="$480" sub="3 trades left" alert />
          <Altar kicker="NOTE" greek="Λόγος" title="With children">
            <div style={{ marginTop: 12, color: "var(--muted)" }}>Arbitrary content can be slotted inside.</div>
          </Altar>
        </div>

        <SectionTitle title="Inputs" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }}>
          <div style={{ border: "1px solid var(--rule)", padding: 20 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>Toggle</div>
            <div style={{ display: "flex", gap: 16 }}>
              <ToggleDemo on={false} />
              <ToggleDemo on={true} />
            </div>
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: 20 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>Segmented</div>
            <div style={{ display: "flex", border: "1px solid var(--rule)", width: "fit-content" }}>
              {["A", "B", "C"].map((o, i) => (
                <span key={o} style={{ padding: "8px 14px", color: i === 1 ? "var(--ink)" : "var(--muted)", borderBottom: i === 1 ? "1px solid var(--accent)" : "none" }}>{o}</span>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: 20 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>Text input</div>
            <input placeholder="Default" style={{ width: "100%", marginBottom: 8, background: "transparent", border: "1px solid var(--rule)", color: "var(--ink)", padding: 8 }} />
            <input placeholder="Focused" style={{ width: "100%", marginBottom: 8, background: "transparent", border: "1px solid var(--gold-rule)", color: "var(--ink)", padding: 8 }} />
            <input placeholder="Error" style={{ width: "100%", marginBottom: 8, background: "transparent", border: "1px solid var(--signal)", color: "var(--ink)", padding: 8 }} />
            <input placeholder="Disabled" disabled style={{ width: "100%", background: "transparent", border: "1px solid var(--rule)", color: "var(--muted)", padding: 8, opacity: 0.5 }} />
          </div>
        </div>

        <SectionTitle title="States" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }}>
          <div style={{ border: "1px solid var(--rule)", padding: 32, textAlign: "center" }}>
            <div className="kicker" style={{ marginBottom: 12 }}>EMPTY</div>
            <p className="display" style={{ fontStyle: "italic", color: "var(--muted)" }}>Nothing yet. Begin.</p>
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: 24 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>LOADING</div>
            <div className="kanon-skeleton" style={{ height: 14, background: "var(--rule)", marginBottom: 8 }} />
            <div className="kanon-skeleton" style={{ height: 14, background: "var(--rule)", marginBottom: 8, width: "80%" }} />
            <div className="kanon-skeleton" style={{ height: 14, background: "var(--rule)", width: "60%" }} />
          </div>
          <div style={{ border: "1px solid var(--signal)", padding: 24 }}>
            <div className="kicker" style={{ marginBottom: 12, color: "var(--signal)" }}>ERROR</div>
            <p className="display" style={{ fontStyle: "italic", color: "var(--ink)" }}>Something went wrong. The fault is mine.</p>
            <button style={{ marginTop: 12, background: "transparent", border: "1px solid var(--signal)", color: "var(--signal)", padding: "6px 14px", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}>Retry</button>
          </div>
        </div>

        <SectionTitle title="Meander" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 56 }}>
          <Meander opacity={1} />
          <Meander opacity={0.6} />
          <Meander opacity={0.3} />
        </div>

        <SectionTitle title="Motion" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--rule)" }}>
              {["TOKEN", "DURATION", "EASING"].map((h) => <th key={h} style={{ textAlign: "left", padding: 10, color: "var(--muted)", fontWeight: 500, fontSize: 11, letterSpacing: "0.12em" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {MOTION.map((m) => (
              <tr key={m.name} style={{ borderBottom: "1px solid var(--rule)" }}>
                <td style={{ padding: 10 }}>{m.name}</td>
                <td style={{ padding: 10 }}>{m.duration}</td>
                <td style={{ padding: 10 }}>{m.easing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StoaLayout>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
  <>
    <PedimentCap variant="rule" className="mb-3" />
    <h2 className="display" style={{ fontSize: 32, color: "var(--ink)", margin: "0 0 24px" }}>{title}</h2>
  </>
);

const Swatch = ({ name, hex }: { name: string; hex: string }) => (
  <div>
    <div style={{ width: 120, height: 80, background: hex, border: "1px solid var(--rule)" }} />
    <div className="mono" style={{ marginTop: 6, fontSize: 11, color: "var(--ink)" }}>{name}</div>
    <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{hex}</div>
  </div>
);

const ToggleDemo = ({ on }: { on: boolean }) => (
  <div style={{ width: 40, height: 20, borderRadius: 10, border: `1px solid ${on ? "var(--accent)" : "var(--rule)"}`, background: on ? "var(--accent)" : "transparent", position: "relative" }}>
    <span style={{ position: "absolute", top: 1, left: on ? 21 : 1, width: 16, height: 16, borderRadius: "50%", background: on ? "var(--bg)" : "var(--ink)" }} />
  </div>
);

const btnStyle = (kind: string, state: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: "8px 16px",
    fontSize: 12,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    cursor: state === "Disabled" ? "default" : "pointer",
    fontFamily: "'Inter', sans-serif",
    opacity: state === "Disabled" ? 0.4 : 1,
    outline: state === "Focused" ? "2px solid var(--accent)" : "none",
    outlineOffset: 2,
    transition: "all 0.15s ease",
  };
  if (kind === "Primary") {
    return {
      ...base,
      background: state === "Hover" || state === "Pressed" ? "var(--accent)" : "transparent",
      color: state === "Hover" || state === "Pressed" ? "var(--bg)" : "var(--accent)",
      border: "1px solid var(--accent)",
    };
  }
  if (kind === "Ghost") {
    return {
      ...base,
      background: state === "Hover" || state === "Pressed" ? "rgba(212,169,74,0.06)" : "transparent",
      color: "var(--ink)",
      border: "1px solid var(--rule)",
    };
  }
  return {
    ...base,
    background: state === "Hover" || state === "Pressed" ? "var(--signal)" : "transparent",
    color: state === "Hover" || state === "Pressed" ? "var(--ink)" : "var(--signal)",
    border: "1px solid var(--signal)",
  };
};

export default Kanon;
