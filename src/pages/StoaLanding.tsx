import { useNavigate } from "react-router-dom";
import PedimentCap from "@/components/stoa/PedimentCap";
import Meander from "@/components/stoa/Meander";

const StoaLanding = () => {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "'IBM Plex Serif', Georgia, serif",
        fontSize: 17,
        lineHeight: 1.55,
      }}
    >
      {/* Top bar */}
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: "1px solid var(--rule)",
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          zIndex: 30,
        }}
      >
        <div className="display" style={{ fontSize: 22, letterSpacing: "0.15em" }}>ΣTOA</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/auth")} style={ghost}>Sign in</button>
          <button onClick={() => navigate("/auth")} style={primary}>Start free</button>
        </div>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "120px 24px 96px", textAlign: "center" }}>
        <PedimentCap variant="triangle" className="mb-8" />
        <h1
          className="display"
          style={{
            fontSize: "clamp(72px, 14vw, 160px)",
            letterSpacing: "0.12em",
            margin: "12px 0 24px",
            lineHeight: 0.95,
          }}
        >
          ΣTOA
        </h1>
        <div style={{ height: 2, background: "var(--accent)", width: 280, margin: "0 auto 32px" }} />
        <p className="display" style={{ fontStyle: "italic", fontSize: 28, color: "var(--ink)", margin: "0 auto 28px", maxWidth: 720 }}>
          The trading journal for people who take this seriously.
        </p>
        <p style={{ maxWidth: 640, margin: "0 auto 40px", color: "var(--muted)" }}>
          TradeIQ is a disciplined journal, a reflective review, and an oracle that remembers every trade you've ever made.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/auth")} style={primary}>Start free</button>
          <button onClick={() => navigate("/dashboard")} style={ghost}>See a demo</button>
        </div>
      </section>

      {/* PROOF BAND */}
      <section style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, textAlign: "center" }}>
          {[
            { k: "TRADES LOGGED", v: "10,000+" },
            { k: "JOURNAL ENTRIES", v: "1,200" },
            { k: "ADS", v: "0" },
          ].map((s) => (
            <div key={s.k}>
              <div className="kicker">{s.k}</div>
              <div className="mono" style={{ fontSize: 28, color: "var(--ink)", marginTop: 6 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PILLARS */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
          {[
            { kicker: "DISCIPLINE WITHOUT NAGGING", title: "The Fates rule the desk.", body: "Klotho sizes the trade. Lachesis measures the reward. Atropos cuts the loss. Three numbers, every trade. Non-negotiable.", greek: "Μοῖραι · THE FATES" },
            { kicker: "A LEDGER THAT REMEMBERS", title: "Every decision, written in stone.", body: "Hermes carries the message. Every entry, every exit, every grade. Recall any trade from any week without scrolling.", greek: "Ἑρμῆς · HERMES" },
            { kicker: "A COACH WHO HAS READ EVERY TRADE", title: "The Oracle answers what matters.", body: "Pythia draws on your tape, your journal, and your rules. Ask once. Stop asking the void.", greek: "Πυθία · PYTHIA" },
          ].map((p) => (
            <div key={p.title}>
              <PedimentCap variant="rule" className="mb-3" />
              <div className="kicker" style={{ marginBottom: 12 }}>{p.kicker}</div>
              <h3 className="display" style={{ fontSize: 32, lineHeight: 1.15, margin: "0 0 12px" }}>{p.title}</h3>
              <p style={{ color: "var(--muted)" }}>{p.body}</p>
              <div className="greek" style={{ marginTop: 16, color: "var(--accent)" }}>{p.greek}</div>
            </div>
          ))}
        </div>
      </section>

      {/* QUOTE BAND */}
      <section style={{ background: "var(--bg)", padding: "160px 24px", textAlign: "center", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <p className="display" style={{ fontStyle: "italic", fontSize: 36, maxWidth: 880, margin: "0 auto 24px", lineHeight: 1.35 }}>
          "It is not what happens to you, but how you react to it that matters."
        </p>
        <div className="kicker">— EPICTETUS</div>
      </section>

      {/* SCREENSHOTS */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
          {[
            { name: "Temple", caption: "The dashboard, carved from stone." },
            { name: "Scroll", caption: "Your day, read like a letter." },
            { name: "Amphitheater", caption: "The weekly reckoning." },
          ].map((s) => (
            <div key={s.name}>
              <div style={{ aspectRatio: "4/3", border: "1px solid var(--gold-rule)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="display" style={{ fontStyle: "italic", color: "var(--muted)", fontSize: 32 }}>{s.name}</span>
              </div>
              <p className="display" style={{ fontStyle: "italic", color: "var(--muted)", marginTop: 12, textAlign: "center" }}>{s.caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "60px 24px 120px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {[
            { name: "Apprentice", price: "Free forever", features: ["Journal · daily", "30-day review", "1 oracle conversation / day"], rec: false },
            { name: "Scholar", price: "$19 / mo", features: ["Everything in Apprentice", "Unlimited oracle", "Drills & spaced repetition", "CSV import / export"], rec: true },
          ].map((t) => (
            <div key={t.name} style={{ border: `1px solid ${t.rec ? "var(--accent)" : "var(--rule)"}`, padding: "32px 28px", position: "relative" }}>
              {t.rec && <span style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
              <div className="kicker">{t.name === "Apprentice" ? "ΜΑΘΗΤΗΣ" : "ΣΧΟΛΑΣΤΙΚΟΣ"}</div>
              <h3 className="display" style={{ fontSize: 28, margin: "8px 0 4px" }}>{t.name}</h3>
              <p className="mono" style={{ color: "var(--ink)", fontSize: 18, marginBottom: 24 }}>{t.price}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "var(--muted)" }}>
                {t.features.map((f) => (
                  <li key={f} style={{ padding: "8px 0", borderBottom: "1px solid var(--rule)" }}>{f}</li>
                ))}
              </ul>
              <button onClick={() => navigate("/auth")} style={{ ...primary, marginTop: 24, width: "100%" }}>
                {t.rec ? "Become a scholar" : "Begin"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ textAlign: "center", padding: "120px 24px" }}>
        <h2 className="display" style={{ fontSize: 48, margin: "0 0 32px" }}>Begin.</h2>
        <button onClick={() => navigate("/auth")} style={{ ...primary, padding: "14px 32px", fontSize: 14 }}>Start free</button>
        <div style={{ width: 400, maxWidth: "90%", margin: "48px auto 0", opacity: 0.3 }}>
          <Meander opacity={0.3} />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--rule)", padding: "40px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, fontSize: 12, color: "var(--muted)" }}>
          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>Product</div>
            <div>Temple</div><div>Scroll</div><div>Codex</div><div>Agora</div>
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>Company</div>
            <div>About</div><div>Manifesto</div><div>Contact</div>
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>Legal</div>
            <div>Terms</div><div>Privacy</div>
          </div>
          <div style={{ textAlign: "right" }}>
            © {year} Stoa. <br />Not financial advice.
          </div>
        </div>
      </footer>
    </div>
  );
};

const primary: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  padding: "10px 20px",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  transition: "all 0.15s ease",
};

const ghost: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--rule)",
  color: "var(--ink)",
  padding: "10px 20px",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

export default StoaLanding;
