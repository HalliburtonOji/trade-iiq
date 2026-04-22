import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StoaLayout from "@/layouts/StoaLayout";
import PedimentCap from "@/components/stoa/PedimentCap";
import Altar from "@/components/stoa/Altar";

interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entry_price: number | null;
  exit_price: number | null;
  r_multiple: number | null;
  pnl_usd: number | null;
  setup_grade: string | null;
  note: string | null;
  opened_at: string;
  closed_at: string | null;
}

interface Snapshot {
  equity_usd: number;
  recorded_at: string;
}

const fmtUsd = (n: number, signed = false) => {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const body = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${signed ? sign : n < 0 ? "−" : ""}$${body}`;
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

const isNyseOpen = (now: Date) => {
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = et.getHours() * 60 + et.getMinutes();
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
};

const Temple = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Load + seed
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [tradesRes, snapsRes] = await Promise.all([
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .order("opened_at", { ascending: false })
          .limit(200),
        supabase
          .from("account_snapshots")
          .select("equity_usd, recorded_at")
          .eq("user_id", user.id)
          .gte("recorded_at", since.toISOString())
          .order("recorded_at", { ascending: true }),
      ]);

      let tradeRows = (tradesRes.data ?? []) as Trade[];
      let snapRows = (snapsRes.data ?? []) as Snapshot[];

      // Seed three example trades the FIRST time so the page isn't empty
      if (tradeRows.length === 0) {
        const today = new Date();
        const t = (h: number, m: number) => {
          const d = new Date(today);
          d.setHours(h, m, 0, 0);
          return d.toISOString();
        };
        const seeds = [
          {
            user_id: user.id,
            symbol: "AAPL",
            side: "long",
            entry_price: 192.4,
            exit_price: 195.8,
            r_multiple: 1.7,
            pnl_usd: 340,
            setup_grade: "A-",
            note: "Breakout retest, clean.",
            opened_at: t(9, 45),
            closed_at: t(11, 10),
          },
          {
            user_id: user.id,
            symbol: "TSLA",
            side: "short",
            entry_price: 248.1,
            exit_price: 246.6,
            r_multiple: 0.9,
            pnl_usd: 150,
            setup_grade: "B",
            note: "Lower-high fade.",
            opened_at: t(10, 20),
            closed_at: t(10, 55),
          },
          {
            user_id: user.id,
            symbol: "MSFT",
            side: "long",
            entry_price: 412.0,
            exit_price: 410.2,
            r_multiple: -1.0,
            pnl_usd: -180,
            setup_grade: "C",
            note: "Stopped, fine. Trend was weak.",
            opened_at: t(13, 30),
            closed_at: t(13, 50),
          },
        ];
        const ins = await supabase.from("trades").insert(seeds).select("*");
        if (ins.data) tradeRows = ins.data as Trade[];
      }

      // Seed equity if empty
      if (snapRows.length === 0) {
        const seedSnaps: { user_id: string; equity_usd: number; recorded_at: string }[] = [];
        let eq = 23800;
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(16, 0, 0, 0);
          eq += (Math.random() - 0.42) * 220;
          seedSnaps.push({
            user_id: user.id,
            equity_usd: Math.round(eq * 100) / 100,
            recorded_at: d.toISOString(),
          });
        }
        const insSnap = await supabase.from("account_snapshots").insert(seedSnaps).select("equity_usd, recorded_at");
        if (insSnap.data) snapRows = insSnap.data as Snapshot[];
      }

      if (!cancelled) {
        setTrades(tradeRows);
        setSnapshots(snapRows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Today's trades
  const todaysTrades = useMemo(() => {
    const today = new Date();
    return trades
      .filter((t) => {
        const d = new Date(t.opened_at);
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      })
      .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  }, [trades]);

  const dayPnl = useMemo(
    () => todaysTrades.reduce((acc, t) => acc + (t.pnl_usd ?? 0), 0),
    [todaysTrades]
  );

  const accountEquity = snapshots.length > 0 ? snapshots[snapshots.length - 1].equity_usd : 0;

  // Sparkline
  const sparkline = useMemo(() => {
    const points = snapshots.length > 0 ? snapshots : [];
    if (points.length === 0) return null;
    const values = points.map((p) => p.equity_usd);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 1000;
    const h = 84;
    const pad = 4;
    const stepX = (w - pad * 2) / Math.max(1, points.length - 1);
    const coords = values.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return [x, y] as const;
    });
    const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const areaPath =
      `M${coords[0][0].toFixed(2)},${h} ` +
      coords.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ") +
      ` L${coords[coords.length - 1][0].toFixed(2)},${h} Z`;
    const last = coords[coords.length - 1];
    return { linePath, areaPath, last, w, h };
  }, [snapshots]);

  // Stats for colonnade
  const winRate = useMemo(() => {
    const recent = trades.slice(0, 20).filter((t) => t.pnl_usd !== null);
    if (recent.length === 0) return null;
    const wins = recent.filter((t) => (t.pnl_usd ?? 0) > 0).length;
    return Math.round((wins / recent.length) * 100);
  }, [trades]);

  const avgRR = useMemo(() => {
    const rs = trades.slice(0, 20).map((t) => t.r_multiple).filter((r): r is number => r !== null);
    if (rs.length === 0) return null;
    return rs.reduce((a, b) => a + b, 0) / rs.length;
  }, [trades]);

  const lastClosedGrade = useMemo(() => {
    const closed = trades.filter((t) => t.closed_at && t.setup_grade);
    return closed[0]?.setup_grade ?? "—";
  }, [trades]);

  // Keyboard "L" → open drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setDrawerOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = isNyseOpen(now);
  const sessionDayNum = useMemo(() => {
    if (snapshots.length === 0) return 1;
    return snapshots.length; // placeholder — number of days since first snapshot
  }, [snapshots]);

  const pnlColor =
    dayPnl > 0 ? "var(--secondary)" : dayPnl < 0 ? "var(--signal)" : "var(--ink)";

  return (
    <StoaLayout pompeii={false}>
      {/* Pediment cap */}
      <div style={{ padding: "28px 32px 0" }}>
        <PedimentCap variant="triangle" />
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div className="kicker">ΝΑΟΣ · TEMPLE</div>
          <div style={{ height: 1, width: 40, background: "var(--accent)", opacity: 0.7, margin: "10px auto 0" }} />
        </div>
      </div>

      {/* Entablature bar */}
      <div
        style={{
          margin: "24px 0 0",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          boxShadow: "0 1px 0 rgba(212,169,74,0.12)",
          height: 64,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
        }}
      >
        <EntablatureCell
          kicker="ACCOUNT"
          value={<span className="mono" style={{ fontSize: 18 }}>{fmtUsd(accountEquity)}</span>}
        />
        <EntablatureCell
          kicker="SESSION"
          divider
          value={<span className="greek" style={{ fontSize: 16 }}>{`Day ${sessionDayNum} · Trading`}</span>}
        />
        <EntablatureCell
          kicker="CLOCK"
          divider
          value={
            <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="mono" style={{ fontSize: 16 }}>
                {now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/New_York" })} ET
              </span>
              <span className="kicker" style={{ fontSize: 10 }}>{open ? "NYSE OPEN" : "NYSE CLOSED"}</span>
            </span>
          }
        />
      </div>

      {/* Hero band */}
      <section style={{ padding: "48px 32px 32px", textAlign: "center" }}>
        <div className="kicker">TODAY'S P&amp;L · <span className="greek" style={{ textTransform: "none", letterSpacing: "0.02em" }}>Κέρδη</span></div>
        <div
          className="display"
          style={{
            fontSize: "clamp(56px, 12vw, 132px)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            color: pnlColor,
            margin: "16px 0 28px",
          }}
        >
          {dayPnl > 0 ? "+" : dayPnl < 0 ? "−" : ""}${Math.abs(dayPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* Equity sparkline */}
        <div style={{ width: "100%", height: 84 }}>
          {sparkline ? (
            <svg width="100%" height="84" viewBox={`0 0 ${sparkline.w} ${sparkline.h}`} preserveAspectRatio="none" aria-label="30-day equity">
              <defs>
                <linearGradient id="stoa-spark-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={sparkline.areaPath} fill="url(#stoa-spark-fill)" />
              <path d={sparkline.linePath} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
              <circle cx={sparkline.last[0]} cy={sparkline.last[1]} r="4" fill="var(--accent)" />
            </svg>
          ) : (
            <div>
              <svg width="100%" height="84" viewBox="0 0 1000 84" preserveAspectRatio="none">
                <line x1="4" x2="996" y1="42" y2="42" stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="1.5" />
                <circle cx="996" cy="42" r="4" fill="var(--accent)" />
              </svg>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>awaiting your first trade</div>
            </div>
          )}
        </div>
      </section>

      {/* Colonnade */}
      <section style={{ padding: "8px 32px 24px" }}>
        <div
          className="stoa-colonnade"
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          }}
        >
          <Column kicker="RISK · KLOTHO" title="Position size" value={<span className="mono">$412</span>} sub="2.0% of account" />
          <Column kicker="REWARD · LACHESIS" title="Target R" value={<span className="mono">2.5R</span>} sub="$1,030 if hit" />
          <Column kicker="LIMIT · ATROPOS" title="Max loss today" value={<span className="mono">$480</span>} sub="3 trades left before halt" />
          <Column
            kicker="WIN RATE · ΝΙΚΗ"
            title="Last 20 trades"
            value={<span className="mono">{winRate !== null ? `${winRate}%` : "—"}</span>}
            sub={avgRR !== null ? `Avg RR ${avgRR.toFixed(1)}` : "Awaiting data"}
          />
          <Column kicker="DISCIPLINE · ΛΟΓΟΣ" title="Rules followed" value={<span className="mono">94%</span>} sub="3 violations this week" />
          <Column kicker="CONVICTION · ΕΛΠΙΣ" title="Setup grade" value={<span className="display" style={{ fontSize: 32 }}>{lastClosedGrade}</span>} sub="From last closed trade" />
        </div>

        <style>{`
          @media (max-width: 1440px) { .stoa-colonnade { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
          @media (max-width: 720px)  { .stoa-colonnade { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
        `}</style>
      </section>

      {/* Stylobate — Hermes Ledger */}
      <section style={{ padding: "16px 32px 64px" }}>
        <PedimentCap variant="rule" className="mb-4" />
        <div className="kicker" style={{ marginBottom: 14 }}>DECISIONS · HERMES LEDGER</div>

        <div style={{ border: "1px solid var(--rule)", borderRadius: 2 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "var(--ink)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--rule)", color: "var(--muted)" }}>
                {["TIME", "SYMBOL", "SIDE", "ENTRY", "EXIT", "R", "RESULT"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontWeight: 500, letterSpacing: "0.08em", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 14px", textAlign: "center", color: "var(--muted)" }}>
                    Loading the ledger…
                  </td>
                </tr>
              ) : todaysTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 14px", textAlign: "center", color: "var(--muted)" }}>
                    No trades logged today. Press <span className="mono" style={{ color: "var(--ink)" }}>L</span> to log one.
                  </td>
                </tr>
              ) : (
                todaysTrades.map((t) => {
                  const sideColor = t.side === "short" ? "var(--signal)" : "var(--secondary)";
                  const pnl = t.pnl_usd ?? 0;
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                      <td style={{ padding: "12px 14px" }}>{fmtTime(t.opened_at)}</td>
                      <td style={{ padding: "12px 14px", color: "var(--ink)" }}>{t.symbol}</td>
                      <td style={{ padding: "12px 14px", color: sideColor }}>{t.side.toUpperCase()}</td>
                      <td style={{ padding: "12px 14px" }}>{t.entry_price !== null ? t.entry_price.toFixed(2) : "—"}</td>
                      <td style={{ padding: "12px 14px" }}>{t.exit_price !== null ? t.exit_price.toFixed(2) : "—"}</td>
                      <td style={{ padding: "12px 14px" }}>{t.r_multiple !== null ? `${t.r_multiple.toFixed(1)}R` : "—"}</td>
                      <td style={{ padding: "12px 14px", color: pnl >= 0 ? "var(--secondary)" : "var(--signal)" }}>
                        {fmtUsd(pnl, true)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trade drawer */}
      {drawerOpen && (
        <TradeDrawer
          onClose={() => setDrawerOpen(false)}
          onSaved={(t) => {
            setTrades((prev) => [t, ...prev]);
            setDrawerOpen(false);
            toast.success("Trade logged.");
          }}
        />
      )}
    </StoaLayout>
  );
};

const EntablatureCell = ({
  kicker,
  value,
  divider,
}: {
  kicker: string;
  value: React.ReactNode;
  divider?: boolean;
}) => (
  <div
    style={{
      borderLeft: divider ? "1px solid var(--rule)" : "none",
      padding: "10px 22px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: 4,
    }}
  >
    <span className="kicker">{kicker}</span>
    {value}
  </div>
);

const Column = ({
  kicker,
  title,
  value,
  sub,
  alert,
}: {
  kicker: string;
  title: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  alert?: boolean;
}) => (
  <div style={{ position: "relative" }}>
    {/* fluting */}
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "linear-gradient(90deg, transparent calc(50% - 22px), rgba(242,234,215,0.05) calc(50% - 22px), rgba(242,234,215,0.05) calc(50% - 21px), transparent calc(50% - 21px), transparent calc(50% - 20px), rgba(242,234,215,0.05) calc(50% - 20px), rgba(242,234,215,0.05) calc(50% - 19px), transparent calc(50% - 19px), transparent calc(50% + 19px), rgba(242,234,215,0.05) calc(50% + 19px), rgba(242,234,215,0.05) calc(50% + 20px), transparent calc(50% + 20px), transparent calc(50% + 21px), rgba(242,234,215,0.05) calc(50% + 21px), rgba(242,234,215,0.05) calc(50% + 22px), transparent calc(50% + 22px))",
      }}
    />
    <Altar kicker={kicker} title={title} value={value} sub={sub} alert={alert} capped />
  </div>
);

interface TradeDrawerProps {
  onClose: () => void;
  onSaved: (t: Trade) => void;
}

const TradeDrawer = ({ onClose, onSaved }: TradeDrawerProps) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    symbol: "",
    side: "long" as "long" | "short",
    entry: "",
    exit: "",
    r: "",
    grade: "B",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.symbol.trim()) {
      toast.error("Symbol required.");
      return;
    }
    setSaving(true);
    const entry = form.entry ? Number(form.entry) : null;
    const exit = form.exit ? Number(form.exit) : null;
    const r = form.r ? Number(form.r) : null;
    let pnl: number | null = null;
    if (entry !== null && exit !== null) {
      pnl = (form.side === "long" ? exit - entry : entry - exit) * 100;
    }
    const payload = {
      user_id: user.id,
      symbol: form.symbol.toUpperCase().trim(),
      side: form.side,
      entry_price: entry,
      exit_price: exit,
      r_multiple: r,
      pnl_usd: pnl,
      setup_grade: form.grade,
      note: form.note,
      opened_at: new Date().toISOString(),
      closed_at: exit !== null ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase.from("trades").insert(payload).select("*").single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSaved(data as Trade);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}
    >
      <div
        onClick={onClose}
        style={{ flex: 1, background: "rgba(14,17,22,0.55)" }}
      />
      <aside
        style={{
          width: 420,
          maxWidth: "92vw",
          height: "100vh",
          background: "var(--bg)",
          borderLeft: "1px solid var(--gold-rule)",
          padding: "28px 24px",
          overflowY: "auto",
        }}
      >
        <div className="kicker" style={{ marginBottom: 4 }}>NEW DECISION · <span className="greek" style={{ textTransform: "none", letterSpacing: "0.02em" }}>Λόγος</span></div>
        <h2 className="display" style={{ fontSize: 28, fontWeight: 500, marginBottom: 18 }}>Log a trade</h2>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Symbol"><input value={form.symbol} onChange={set("symbol")} className="stoa-input" autoFocus /></Field>
          <Field label="Side">
            <select value={form.side} onChange={set("side")} className="stoa-input">
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Entry"><input type="number" step="0.01" value={form.entry} onChange={set("entry")} className="stoa-input" /></Field>
            <Field label="Exit"><input type="number" step="0.01" value={form.exit} onChange={set("exit")} className="stoa-input" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="R multiple"><input type="number" step="0.1" value={form.r} onChange={set("r")} className="stoa-input" /></Field>
            <Field label="Setup grade">
              <select value={form.grade} onChange={set("grade")} className="stoa-input">
                {["A+", "A", "A-", "B+", "B", "B-", "C", "D", "F"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Note"><textarea value={form.note} onChange={set("note")} rows={3} className="stoa-input" /></Field>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="stoa-btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="stoa-btn-primary">{saving ? "Saving…" : "Inscribe"}</button>
          </div>
        </form>

        <style>{`
          .stoa-input {
            width: 100%;
            background: transparent;
            border: 1px solid var(--rule);
            border-radius: 2px;
            color: var(--ink);
            font-family: 'IBM Plex Serif', Georgia, serif;
            font-size: 14px;
            padding: 10px 12px;
            outline: none;
          }
          .stoa-input:focus { border-color: var(--gold-rule); }
          .stoa-btn-primary {
            flex: 1;
            background: var(--accent);
            color: #0E1116;
            border: none;
            padding: 10px 14px;
            border-radius: 2px;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            cursor: pointer;
          }
          .stoa-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
          .stoa-btn-secondary {
            background: transparent;
            color: var(--ink);
            border: 1px solid var(--rule);
            padding: 10px 14px;
            border-radius: 2px;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            cursor: pointer;
          }
        `}</style>
      </aside>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span className="kicker">{label}</span>
    {children}
  </label>
);

export default Temple;
