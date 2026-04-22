import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaLayout from "@/layouts/StoaLayout";
import CompressedMasthead from "@/components/stoa/CompressedMasthead";
import PedimentCap from "@/components/stoa/PedimentCap";
import { useNavigate } from "react-router-dom";

interface Symbol {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change_pct: number;
  rvol: number;
  spark: number[];
  alert?: boolean;
}

const SECTORS = ["Tech", "Financials", "Energy", "Consumer", "Healthcare", "Industrial", "Crypto", "FX"];
const FILTER_CHIPS = ["All", "Watchlist", "S&P 500", "NASDAQ", "Crypto", "FX"];

const seed: Symbol[] = [
  { symbol: "AAPL", name: "Apple", sector: "Tech", price: 187.32, change_pct: 1.42, rvol: 1.1, spark: [180,182,181,183,185,184,187] },
  { symbol: "MSFT", name: "Microsoft", sector: "Tech", price: 422.18, change_pct: 0.84, rvol: 0.9, spark: [415,418,420,419,421,420,422] },
  { symbol: "NVDA", name: "Nvidia", sector: "Tech", price: 880.55, change_pct: -2.11, rvol: 2.4, spark: [905,900,895,890,888,885,880] },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer", price: 178.40, change_pct: 0.62, rvol: 1.0, spark: [175,176,177,176,178,177,178] },
  { symbol: "GOOGL", name: "Alphabet", sector: "Tech", price: 162.10, change_pct: 1.05, rvol: 0.8, spark: [158,159,160,161,160,161,162] },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer", price: 168.22, change_pct: -3.45, rvol: 2.2, spark: [178,176,174,172,170,169,168] },
  { symbol: "META", name: "Meta", sector: "Tech", price: 488.75, change_pct: 2.10, rvol: 1.3, spark: [475,478,480,482,485,486,488] },
  { symbol: "JPM", name: "JPMorgan", sector: "Financials", price: 195.20, change_pct: 0.32, rvol: 0.7, spark: [193,194,195,194,195,195,195] },
  { symbol: "BAC", name: "Bank of America", sector: "Financials", price: 37.45, change_pct: -0.21, rvol: 0.9, spark: [37.6,37.5,37.5,37.4,37.5,37.4,37.45] },
  { symbol: "XOM", name: "Exxon", sector: "Energy", price: 113.80, change_pct: 1.78, rvol: 1.1, spark: [110,111,112,112,113,113,113.8] },
  { symbol: "CVX", name: "Chevron", sector: "Energy", price: 158.90, change_pct: 0.95, rvol: 0.8, spark: [156,157,157,158,158,158,158.9] },
  { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare", price: 502.30, change_pct: -0.55, rvol: 0.7, spark: [506,505,504,503,503,502,502] },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare", price: 26.10, change_pct: 0.38, rvol: 1.0, spark: [25.9,26,26,26.1,26,26.1,26.1] },
  { symbol: "CAT", name: "Caterpillar", sector: "Industrial", price: 348.20, change_pct: 1.12, rvol: 0.9, spark: [344,345,346,347,347,348,348.2] },
  { symbol: "BA", name: "Boeing", sector: "Industrial", price: 168.40, change_pct: -1.85, rvol: 1.4, spark: [173,172,171,170,169,168,168.4], alert: true },
  { symbol: "BTC", name: "Bitcoin", sector: "Crypto", price: 67_320, change_pct: 2.40, rvol: 1.1, spark: [65500,65800,66000,66500,67000,67100,67320] },
  { symbol: "ETH", name: "Ethereum", sector: "Crypto", price: 3_245, change_pct: 1.85, rvol: 1.0, spark: [3180,3200,3210,3220,3230,3240,3245] },
  { symbol: "SOL", name: "Solana", sector: "Crypto", price: 158.20, change_pct: 4.20, rvol: 1.6, spark: [150,152,154,155,156,157,158.2] },
  { symbol: "EURUSD", name: "Euro / Dollar", sector: "FX", price: 1.0712, change_pct: -0.18, rvol: 0.8, spark: [1.073,1.072,1.072,1.071,1.071,1.071,1.0712] },
  { symbol: "GBPUSD", name: "Pound / Dollar", sector: "FX", price: 1.2510, change_pct: 0.12, rvol: 0.7, spark: [1.250,1.250,1.251,1.251,1.250,1.251,1.251] },
];

const Sparkline = ({ data, color = "var(--accent)", width = 60, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) => {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
};

const Agora = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [sector, setSector] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"change" | "rvol" | "symbol">("change");
  const [drawerSym, setDrawerSym] = useState<Symbol | null>(null);
  const [accountPnl, setAccountPnl] = useState(0);
  const [accountSpark, setAccountSpark] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [tradesRes, snapsRes] = await Promise.all([
        supabase.from("trades").select("pnl_usd").eq("user_id", user.id).gte("opened_at", `${today}T00:00:00Z`),
        supabase.from("account_snapshots").select("equity_usd, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: true }).limit(30),
      ]);
      const pnl = (tradesRes.data ?? []).reduce((s: number, t) => s + (t.pnl_usd ?? 0), 0);
      setAccountPnl(pnl);
      setAccountSpark((snapsRes.data ?? []).map((s) => Number(s.equity_usd)));
    })();
  }, [user]);

  const filtered = useMemo(() => {
    let list = [...seed];
    if (filter === "Crypto") list = list.filter((s) => s.sector === "Crypto");
    if (filter === "FX") list = list.filter((s) => s.sector === "FX");
    if (sector !== "All") list = list.filter((s) => s.sector === sector);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sort === "change") return b.change_pct - a.change_pct;
      if (sort === "rvol") return b.rvol - a.rvol;
      return a.symbol.localeCompare(b.symbol);
    });
    return list;
  }, [filter, sector, search, sort]);

  const watchlist = seed.slice(0, 10);

  return (
    <StoaLayout>
      <CompressedMasthead />
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 32px 96px" }}>
        <div className="kicker" style={{ marginBottom: 24 }}>ΑΓΟΡΑ · THE AGORA · Marketplace of prices</div>

        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 32 }}>
          {FILTER_CHIPS.map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {c}
            </Chip>
          ))}
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            style={chipStyle(sector !== "All")}
          >
            <option value="All">Sector ▾</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol or sector…"
            style={{
              background: "transparent",
              border: "1px solid var(--rule)",
              color: "var(--ink)",
              padding: "6px 14px",
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              minWidth: 220,
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-rule)")}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={chipStyle(false)}>
            <option value="change">Sort · % change</option>
            <option value="rvol">Sort · RVOL</option>
            <option value="symbol">Sort · Symbol</option>
          </select>
        </div>

        {/* Pythia quote band */}
        <div
          style={{
            borderTop: "1px solid var(--rule)",
            borderBottom: "1px solid var(--rule)",
            padding: "20px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "0 0 24px",
          }}
        >
          <div>
            <div className="kicker">PYTHIA · ORACLE</div>
            <div className="display" style={{ fontStyle: "italic", fontSize: 18, color: "var(--ink)", marginTop: 4 }}>
              Watchlist leaning short — three names broke the 20-EMA this morning.
            </div>
          </div>
          <button
            onClick={() => navigate("/coach")}
            style={{ background: "transparent", border: "none", color: "var(--accent)", fontStyle: "italic", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", fontSize: 16 }}
          >
            Ask her →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 32 }}>
          {/* Main area */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {/* Hero P&L altar — spans 2x2 */}
              <div style={{ gridColumn: "span 2", gridRow: "span 2" }}>
                <PedimentCap variant="rule" className="mb-3" />
                <div style={{ border: "1px solid var(--rule)", padding: "24px 22px", height: "calc(100% - 28px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div className="kicker">TODAY · ACCOUNT P&L</div>
                    <div
                      className="display"
                      style={{
                        fontSize: 56,
                        fontWeight: 500,
                        lineHeight: 1.05,
                        margin: "12px 0 4px",
                        color: accountPnl > 0 ? "var(--secondary)" : accountPnl < 0 ? "var(--signal)" : "var(--ink)",
                      }}
                    >
                      {accountPnl >= 0 ? "+" : "−"}${Math.abs(accountPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div className="kicker">REALIZED</div>
                      <div className="mono" style={{ fontSize: 14, color: "var(--ink)" }}>${accountPnl.toFixed(2)}</div>
                    </div>
                    {accountSpark.length > 1 && <Sparkline data={accountSpark} width={140} height={32} />}
                    <div>
                      <div className="kicker">UNREALIZED</div>
                      <div className="mono" style={{ fontSize: 14, color: "var(--muted)" }}>$0.00</div>
                    </div>
                  </div>
                </div>
              </div>

              {filtered.map((s) => (
                <SymbolAltar key={s.symbol} sym={s} onClick={() => setDrawerSym(s)} />
              ))}
            </div>
          </div>

          {/* Watchlist rail */}
          <aside style={{ borderLeft: "1px solid var(--rule)", paddingLeft: 20 }}>
            <div className="kicker" style={{ marginBottom: 14 }}>ΦΥΛΑΚΗ · WATCH</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {watchlist.map((s) => {
                const isAlert = !!s.alert;
                return (
                  <div
                    key={s.symbol}
                    onClick={() => setDrawerSym(s)}
                    style={{
                      border: `1px solid ${isAlert ? "var(--signal)" : "var(--rule)"}`,
                      padding: "10px 12px",
                      cursor: "pointer",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!isAlert) (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-rule)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isAlert) (e.currentTarget as HTMLElement).style.borderColor = "var(--rule)";
                    }}
                  >
                    {isAlert && (
                      <span style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: "var(--signal)" }} />
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="display" style={{ fontSize: 16 }}>{s.symbol}</span>
                      <span className="mono" style={{ fontSize: 12, color: s.change_pct >= 0 ? "var(--secondary)" : "var(--signal)" }}>
                        {s.change_pct >= 0 ? "+" : ""}{s.change_pct.toFixed(2)}%
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{s.price.toLocaleString()}</span>
                      <Sparkline data={s.spark} width={40} height={14} color={s.change_pct >= 0 ? "var(--secondary)" : "var(--signal)"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      {/* Drawer */}
      {drawerSym && (
        <>
          <div onClick={() => setDrawerSym(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60 }} />
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 480,
              maxWidth: "94vw",
              background: "var(--bg)",
              borderLeft: "1px solid var(--gold-rule)",
              padding: "32px 28px",
              zIndex: 70,
              overflowY: "auto",
            }}
          >
            <div className="kicker">{drawerSym.sector}</div>
            <div className="display" style={{ fontSize: 36, marginBottom: 4 }}>{drawerSym.symbol}</div>
            <div style={{ color: "var(--muted)", marginBottom: 20 }}>{drawerSym.name}</div>
            <div className="mono" style={{ fontSize: 28, marginBottom: 4 }}>{drawerSym.price.toLocaleString()}</div>
            <div className="mono" style={{ color: drawerSym.change_pct >= 0 ? "var(--secondary)" : "var(--signal)" }}>
              {drawerSym.change_pct >= 0 ? "+" : ""}{drawerSym.change_pct.toFixed(2)}% · RVOL {drawerSym.rvol.toFixed(1)}
            </div>
            <div style={{ marginTop: 28, height: 120, border: "1px solid var(--rule)", padding: 12 }}>
              <Sparkline data={drawerSym.spark} width={420} height={96} />
            </div>
            <div style={{ marginTop: 24, color: "var(--muted)", fontStyle: "italic" }}>News and tape stream coming soon.</div>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button style={btnPrimary}>Add to watchlist</button>
              <button onClick={() => navigate("/dashboard")} style={btnGhost}>Log a trade</button>
            </div>
          </aside>
        </>
      )}
    </StoaLayout>
  );
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "rgba(212,169,74,0.08)" : "transparent",
  border: `1px solid ${active ? "var(--accent)" : "var(--rule)"}`,
  color: active ? "var(--accent)" : "var(--ink)",
  padding: "6px 14px",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontFamily: "'IBM Plex Mono', monospace",
  cursor: "pointer",
  outline: "none",
});

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={chipStyle(active)}>{children}</button>
);

const SymbolAltar = ({ sym, onClick }: { sym: Symbol; onClick: () => void }) => (
  <div>
    <PedimentCap variant="rule" className="mb-3" />
    <div
      onClick={onClick}
      style={{ border: "1px solid var(--rule)", padding: "16px 16px", cursor: "pointer", transition: "border-color 0.15s ease" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--gold-rule)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--rule)")}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span className="display" style={{ fontSize: 22 }}>{sym.symbol}</span>
        <span className="kicker">{sym.sector}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
        <span className="mono" style={{ fontSize: 20, color: "var(--ink)" }}>{sym.price.toLocaleString()}</span>
        <span className="mono" style={{ fontSize: 13, color: sym.change_pct >= 0 ? "var(--secondary)" : "var(--signal)" }}>
          {sym.change_pct >= 0 ? "+" : ""}{sym.change_pct.toFixed(2)}%
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <Sparkline data={sym.spark} color={sym.change_pct >= 0 ? "var(--secondary)" : "var(--signal)"} />
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>RVOL {sym.rvol.toFixed(1)}</span>
      </div>
    </div>
  </div>
);

const btnPrimary: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  padding: "10px 18px",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--rule)",
  color: "var(--ink)",
  padding: "10px 18px",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

export default Agora;
