import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StoaLayout from "@/layouts/StoaLayout";
import CompressedMasthead from "@/components/stoa/CompressedMasthead";

interface Prefs {
  identity: { display_name?: string; timezone?: string; starting_capital?: number; currency?: string };
  oracle: { read_journal: boolean; read_trades: boolean; read_rules: boolean; tone: string; max_tokens: number };
  alerts: { push: boolean; email: string; violations: boolean };
  markets: { active: string[]; default_size_pct: number; max_daily_loss_pct: number; hard_halt: boolean };
}

const DEFAULT_PREFS: Prefs = {
  identity: { display_name: "", timezone: "America/New_York", starting_capital: 25000, currency: "USD" },
  oracle: { read_journal: true, read_trades: true, read_rules: true, tone: "Stoic", max_tokens: 600 },
  alerts: { push: false, email: "off", violations: true },
  markets: { active: ["us_equities"], default_size_pct: 1, max_daily_loss_pct: 3, hard_halt: true },
};

const SECTIONS = [
  { id: "identity", english: "Identity", greek: "Ταυτότης" },
  { id: "oracle", english: "Oracle", greek: "Πυθία" },
  { id: "alerts", english: "Alerts", greek: "Ἀγγελίαι" },
  { id: "markets", english: "Markets", greek: "Ἀγορά" },
  { id: "data", english: "Data", greek: "Μνήμη" },
  { id: "danger", english: "Danger", greek: "Ζώνη κινδύνου" },
];

const Ergon = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [active, setActive] = useState("identity");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const d = data as unknown as Partial<Prefs>;
        setPrefs({
          identity: { ...DEFAULT_PREFS.identity, ...(d.identity ?? {}) },
          oracle: { ...DEFAULT_PREFS.oracle, ...(d.oracle ?? {}) },
          alerts: { ...DEFAULT_PREFS.alerts, ...(d.alerts ?? {}) },
          markets: { ...DEFAULT_PREFS.markets, ...(d.markets ?? {}) },
        });
      } else {
        // Seed
        await supabase.from("user_preferences").insert({ user_id: user.id, ...DEFAULT_PREFS });
      }
    })();
  }, [user]);

  const save = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    await supabase.from("user_preferences").upsert({ user_id: user.id, ...next });
  };

  return (
    <StoaLayout>
      <CompressedMasthead />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 96px" }}>
        <div className="kicker" style={{ marginBottom: 32 }}>ΕΡΓΟΝ · ERGON · The workshop</div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 48 }}>
          {/* Sub-nav */}
          <nav>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderLeft: active === s.id ? "2px solid var(--accent)" : "2px solid transparent",
                  padding: "10px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  color: s.id === "danger" ? "var(--signal)" : "var(--ink)",
                }}
              >
                <span className="kicker" style={s.id === "danger" ? { color: "var(--signal)" } : undefined}>{s.english}</span>
                <span className="greek" style={{ fontSize: 14, color: "var(--muted)" }}>{s.greek}</span>
              </button>
            ))}
          </nav>

          {/* Sections */}
          <div style={{ maxWidth: 640 }}>
            {active === "identity" && (
              <Section title="Identity">
                <Field label="Display name" helper="How the Oracle should address you.">
                  <Input value={prefs.identity.display_name ?? ""} onChange={(v) => save({ ...prefs, identity: { ...prefs.identity, display_name: v } })} />
                </Field>
                <Field label="Timezone" helper="Used for sessions and the clock.">
                  <Input value={prefs.identity.timezone ?? ""} onChange={(v) => save({ ...prefs, identity: { ...prefs.identity, timezone: v } })} />
                </Field>
                <Field label="Starting capital" helper="Anchors all percentage calculations.">
                  <Input value={String(prefs.identity.starting_capital ?? "")} onChange={(v) => save({ ...prefs, identity: { ...prefs.identity, starting_capital: Number(v) || 0 } })} />
                </Field>
                <Field label="Display currency" helper="Cosmetic only — does not convert prices.">
                  <Segmented options={["USD", "EUR", "GBP"]} value={prefs.identity.currency ?? "USD"} onChange={(v) => save({ ...prefs, identity: { ...prefs.identity, currency: v } })} />
                </Field>
              </Section>
            )}

            {active === "oracle" && (
              <Section title="Oracle">
                <Field label="Read my journal" helper="The Oracle quotes back what you wrote.">
                  <Toggle value={prefs.oracle.read_journal} onChange={(v) => save({ ...prefs, oracle: { ...prefs.oracle, read_journal: v } })} />
                </Field>
                <Field label="Read my trades" helper="The Oracle sees your tape, not just opinions.">
                  <Toggle value={prefs.oracle.read_trades} onChange={(v) => save({ ...prefs, oracle: { ...prefs.oracle, read_trades: v } })} />
                </Field>
                <Field label="Read my rules adherence" helper="Truth requires that you let the Oracle measure you.">
                  <Toggle value={prefs.oracle.read_rules} onChange={(v) => save({ ...prefs, oracle: { ...prefs.oracle, read_rules: v } })} />
                </Field>
                <Field label="Tone" helper="Choose the voice you respond best to.">
                  <Segmented options={["Spartan", "Stoic", "Encouraging", "Brutally honest"]} value={prefs.oracle.tone} onChange={(v) => save({ ...prefs, oracle: { ...prefs.oracle, tone: v } })} />
                </Field>
                <Field label={`Response length · ${prefs.oracle.max_tokens} tokens`} helper="Short for sharper answers.">
                  <input type="range" min={120} max={2000} step={20} value={prefs.oracle.max_tokens} onChange={(e) => save({ ...prefs, oracle: { ...prefs.oracle, max_tokens: Number(e.target.value) } })} style={{ width: "100%", accentColor: "#D4A94A" }} />
                </Field>
              </Section>
            )}

            {active === "alerts" && (
              <Section title="Alerts">
                <Field label="Browser push" helper="Native notifications when a rule trips.">
                  <Toggle value={prefs.alerts.push} onChange={(v) => save({ ...prefs, alerts: { ...prefs.alerts, push: v } })} />
                </Field>
                <Field label="Email digest" helper="A summary that arrives only when useful.">
                  <Segmented options={["Off", "Daily 5pm ET", "Weekly Sunday"]} value={prefs.alerts.email === "off" ? "Off" : prefs.alerts.email} onChange={(v) => save({ ...prefs, alerts: { ...prefs.alerts, email: v === "Off" ? "off" : v } })} />
                </Field>
                <Field label="Rule-violation alert" helper="The discipline cannot enforce itself silently.">
                  <Toggle value={prefs.alerts.violations} onChange={(v) => save({ ...prefs, alerts: { ...prefs.alerts, violations: v } })} />
                </Field>
              </Section>
            )}

            {active === "markets" && (
              <Section title="Markets">
                <Field label="Active markets" helper="What you actually trade — be honest.">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { id: "us_equities", label: "US Equities" },
                      { id: "us_options", label: "US Options" },
                      { id: "fx", label: "FX" },
                      { id: "crypto", label: "Crypto" },
                      { id: "futures", label: "Futures" },
                    ].map((m) => {
                      const on = prefs.markets.active.includes(m.id);
                      return (
                        <label key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--ink)" }}>
                          <span>{m.label}</span>
                          <Toggle value={on} onChange={() => save({ ...prefs, markets: { ...prefs.markets, active: on ? prefs.markets.active.filter((x) => x !== m.id) : [...prefs.markets.active, m.id] } })} />
                        </label>
                      );
                    })}
                  </div>
                </Field>
                <Field label={`Default position size · ${prefs.markets.default_size_pct}%`} helper="Klotho's default thread.">
                  <input type="range" min={0.1} max={5} step={0.1} value={prefs.markets.default_size_pct} onChange={(e) => save({ ...prefs, markets: { ...prefs.markets, default_size_pct: Number(e.target.value) } })} style={{ width: "100%", accentColor: "#D4A94A" }} />
                </Field>
                <Field label={`Max daily loss · ${prefs.markets.max_daily_loss_pct}%`} helper="Atropos's limit. Past this, she cuts.">
                  <input type="range" min={0.5} max={10} step={0.5} value={prefs.markets.max_daily_loss_pct} onChange={(e) => save({ ...prefs, markets: { ...prefs.markets, max_daily_loss_pct: Number(e.target.value) } })} style={{ width: "100%", accentColor: "#D4A94A" }} />
                </Field>
                <Field label="Hard-halt trading after max loss" helper="Disables Log Trade for the rest of the day. Recommended.">
                  <Toggle value={prefs.markets.hard_halt} onChange={(v) => save({ ...prefs, markets: { ...prefs.markets, hard_halt: v } })} />
                </Field>
              </Section>
            )}

            {active === "data" && (
              <Section title="Data">
                <p style={{ color: "var(--muted)", fontStyle: "italic", marginBottom: 16 }}>Your tape is yours. Take it with you.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button style={btn}>Export trades (CSV)</button>
                  <button style={btn}>Export journal (Markdown)</button>
                  <button style={btn}>Import trades from CSV</button>
                </div>
              </Section>
            )}

            {active === "danger" && (
              <Section title="Danger zone" danger>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button onClick={() => confirm("Erase all trades? This cannot be undone.") && toast.error("Reset stub — not wired")} style={dangerBtn}>Reset Ledger of Hermes</button>
                  <button onClick={() => confirm("Erase all journal entries? This cannot be undone.") && toast.error("Reset stub — not wired")} style={dangerBtn}>Clear Journal</button>
                  <button onClick={() => toast.error("Account deletion stub — not wired")} style={dangerBtn}>Delete account</button>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </StoaLayout>
  );
};

const Section = ({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) => (
  <section style={{ borderTop: danger ? "1px solid var(--signal)" : "none", paddingTop: danger ? 24 : 0 }}>
    <h2 className="display" style={{ fontSize: 28, color: danger ? "var(--signal)" : "var(--ink)", marginBottom: 24 }}>
      {title}
    </h2>
    {children}
  </section>
);

const Field = ({ label, helper, children }: { label: string; helper: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <label className="kicker" style={{ color: "var(--ink)", letterSpacing: "0.08em" }}>{label}</label>
    </div>
    {children}
    <div className="display" style={{ fontStyle: "italic", color: "var(--muted)", fontSize: 13, marginTop: 6 }}>{helper}</div>
  </div>
);

const Input = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={(e) => onChange(e.target.value)}
    style={{
      width: "100%",
      background: "transparent",
      border: "1px solid var(--rule)",
      color: "var(--ink)",
      padding: 12,
      fontFamily: "'IBM Plex Serif', Georgia, serif",
      fontSize: 15,
      outline: "none",
    }}
    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-rule)")}
  />
);

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    aria-pressed={value}
    style={{
      width: 40,
      height: 20,
      borderRadius: 10,
      border: `1px solid ${value ? "var(--accent)" : "var(--rule)"}`,
      background: value ? "var(--accent)" : "transparent",
      position: "relative",
      cursor: "pointer",
      padding: 0,
      transition: "all 0.15s ease",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 1,
        left: value ? 21 : 1,
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: value ? "var(--bg)" : "var(--ink)",
        transition: "left 0.15s ease",
      }}
    />
  </button>
);

const Segmented = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <div style={{ display: "flex", border: "1px solid var(--rule)", width: "fit-content", flexWrap: "wrap" }}>
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onChange(o)}
        style={{
          background: "transparent",
          border: "none",
          color: value === o ? "var(--ink)" : "var(--muted)",
          padding: "8px 14px",
          fontSize: 13,
          cursor: "pointer",
          borderBottom: value === o ? "1px solid var(--accent)" : "1px solid transparent",
        }}
      >
        {o}
      </button>
    ))}
  </div>
);

const btn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  padding: "10px 18px",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  textAlign: "left",
};

const dangerBtn: React.CSSProperties = {
  ...btn,
  border: "1px solid var(--signal)",
  color: "var(--signal)",
};

export default Ergon;
