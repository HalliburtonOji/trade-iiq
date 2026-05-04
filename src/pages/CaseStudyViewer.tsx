// CaseStudyViewer — full-page reader for a Sophos case study at /learn/case/:id

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

type CaseStudy = {
  id: string;
  trade_id: string;
  symbol: string;
  asset_type: string;
  direction: string;
  outcome: "win" | "loss" | "breakeven";
  r_multiple: number | null;
  pnl_pct: number | null;
  title: string;
  hook: string;
  setup: string;
  entry_rationale: string;
  what_happened: string;
  lesson: string;
  key_takeaway: string;
  tags: string[];
  greek_phrase: string | null;
  created_at: string;
};

const CaseStudyViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cs, setCs] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("mentor_case_studies").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => {
        setCs(data as CaseStudy | null);
        setLoading(false);
        if (data) {
          document.title = `${(data as CaseStudy).title} · Sophos Case Study`;
        }
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--stoa-bg)", color: "var(--stoa-muted)" }}>
        Reading the scroll…
      </div>
    );
  }

  if (!cs) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--stoa-bg)", color: "var(--stoa-ink)" }}>
        <div className="stoa-display text-2xl">Case study not found</div>
        <button onClick={() => navigate("/learn")} className="stoa-mono text-sm underline" style={{ color: "var(--stoa-accent)" }}>
          ← Back to the Codex
        </button>
      </div>
    );
  }

  const isWin = cs.outcome === "win";
  const isLoss = cs.outcome === "loss";
  const Icon = isWin ? TrendingUp : isLoss ? TrendingDown : Minus;
  const color = isWin ? "var(--stoa-secondary)" : isLoss ? "var(--stoa-signal)" : "var(--stoa-muted)";
  const r = cs.r_multiple !== null ? `${cs.r_multiple >= 0 ? "+" : ""}${cs.r_multiple.toFixed(2)}R` : "—";

  return (
    <div className="min-h-screen" style={{ background: "var(--stoa-bg)", color: "var(--stoa-ink)" }}>
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--stoa-rule)" }}>
        <Link to="/learn" className="flex items-center gap-2 stoa-mono text-xs" style={{ color: "var(--stoa-muted)" }}>
          <ArrowLeft size={14} /> THE CODEX
        </Link>
        <span className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>SOPHOS · CASE STUDY</span>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        {/* Header band */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="stoa-mono text-xs px-2 py-1 rounded"
            style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)" }}
          >
            {cs.symbol}
          </span>
          <span className="stoa-kicker" style={{ color: "var(--stoa-muted)" }}>{cs.direction.toUpperCase()}</span>
          <div className="flex items-center gap-1" style={{ color }}>
            <Icon size={14} /><span className="stoa-mono text-xs">{r}</span>
          </div>
          {cs.pnl_pct !== null && (
            <span className="stoa-mono text-xs" style={{ color }}>
              {cs.pnl_pct >= 0 ? "+" : ""}{cs.pnl_pct.toFixed(2)}%
            </span>
          )}
        </div>

        <div>
          <h1 className="stoa-display" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1 }}>
            {cs.title}
          </h1>
          {cs.greek_phrase && (
            <div className="stoa-greek mt-3" style={{ color: "var(--stoa-accent)", fontSize: 18 }}>
              {cs.greek_phrase}
            </div>
          )}
          {cs.hook && (
            <p
              style={{ fontFamily: "Georgia, serif", fontSize: 18, fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 14 }}
            >
              {cs.hook}
            </p>
          )}
        </div>

        <Section kicker="Ι · THE SETUP" title="The Setup" body={cs.setup} />
        <Section kicker="ΙΙ · WHY ENTER" title="Entry Rationale" body={cs.entry_rationale} />
        <Section kicker="ΙΙΙ · WHAT HAPPENED" title="What Happened" body={cs.what_happened} />
        <Section kicker="ΙV · THE LESSON" title="The Lesson" body={cs.lesson} accent />

        {cs.key_takeaway && (
          <div
            className="rounded-2xl p-6"
            style={{
              border: "1px solid var(--stoa-gold-rule)",
              background: "linear-gradient(135deg, color-mix(in oklab, var(--stoa-accent) 8%, transparent), transparent)",
            }}
          >
            <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>KEY TAKEAWAY · ΓΝΩΘΙ</div>
            <div
              className="stoa-display mt-2"
              style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: "var(--stoa-ink)" }}
            >
              "{cs.key_takeaway}"
            </div>
          </div>
        )}

        {cs.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
            {cs.tags.map((t) => (
              <span
                key={t}
                className="stoa-mono text-xs px-3 py-1 rounded-full"
                style={{ color: "var(--stoa-accent)", border: "1px solid var(--stoa-gold-rule)" }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="pt-4 flex gap-3 flex-wrap">
          <Link
            to="/mentor"
            className="stoa-mono text-xs px-4 py-2 rounded-full"
            style={{ background: "var(--stoa-accent)", color: "var(--stoa-bg)" }}
          >
            See Sophos's live activity →
          </Link>
          <Link
            to="/learn"
            className="stoa-mono text-xs px-4 py-2 rounded-full"
            style={{ border: "1px solid var(--stoa-rule)", color: "var(--stoa-ink)" }}
          >
            Back to the Codex
          </Link>
        </div>
      </article>
    </div>
  );
};

const Section = ({ kicker, title, body, accent }: { kicker: string; title: string; body: string; accent?: boolean }) => {
  if (!body) return null;
  return (
    <section>
      <div className="stoa-kicker" style={{ color: accent ? "var(--stoa-accent)" : "var(--stoa-muted)" }}>
        {kicker}
      </div>
      <h2 className="stoa-display mt-1" style={{ fontSize: 22, fontWeight: 600, color: "var(--stoa-ink)" }}>
        {title}
      </h2>
      <p style={{ fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.65, color: "var(--stoa-ink)", marginTop: 10 }}>
        {body}
      </p>
    </section>
  );
};

export default CaseStudyViewer;
