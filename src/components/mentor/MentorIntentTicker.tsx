import { useEffect, useMemo, useState } from "react";
import { Sparkles, CheckCircle2, TrendingUp, TrendingDown, Hourglass, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { focusMentor } from "@/hooks/useMentorFocus";

type JournalRow = {
  id: string;
  kind: string;
  symbol: string | null;
  body_text: string;
  created_at: string;
  intent_id: string | null;
  trade_id: string | null;
  payload: any;
};

type IntentRow = {
  id: string;
  symbol: string;
  asset_type: string;
  direction: string;
  status: string;
  trigger_kind: string;
  trigger_value: number | null;
  trigger_condition_text: string;
  valid_until: string;
};

const INTENT_KINDS = new Set(["intent_published", "intent_resolved", "open", "close"]);

function ageLabel(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function tabFor(kind: string): "now" | "next" | "past" | "journal" {
  if (kind === "intent_published") return "next";
  if (kind === "open") return "now";
  if (kind === "close" || kind === "intent_resolved") return "past";
  return "journal";
}

function chipMeta(row: JournalRow, intentMap: Map<string, IntentRow>) {
  const intent = row.intent_id ? intentMap.get(row.intent_id) : null;
  const dir = (intent?.direction || row.payload?.direction || "").toLowerCase();
  const isLong = dir === "long";

  if (row.kind === "intent_published") {
    return {
      Icon: Sparkles,
      tone: "var(--stoa-accent)",
      label: "PUBLISHED",
      detail: intent?.trigger_condition_text || row.body_text,
    };
  }
  if (row.kind === "open") {
    return {
      Icon: isLong ? TrendingUp : TrendingDown,
      tone: "var(--stoa-secondary)",
      label: "TRIGGERED",
      detail: row.payload?.entry ? `Filled at ${Number(row.payload.entry).toFixed(2)}` : row.body_text,
    };
  }
  if (row.kind === "intent_resolved") {
    const res = row.payload?.resolution;
    return {
      Icon: res === "expired" ? Hourglass : CheckCircle2,
      tone: res === "expired" ? "var(--stoa-muted)" : "var(--stoa-accent)",
      label: res === "expired" ? "EXPIRED" : "RESOLVED",
      detail: row.body_text.replace(/^Intent on \S+\s*/i, ""),
    };
  }
  if (row.kind === "close") {
    const pnl = Number(row.payload?.pnl ?? 0);
    return {
      Icon: pnl >= 0 ? TrendingUp : TrendingDown,
      tone: pnl >= 0 ? "var(--stoa-secondary)" : "var(--stoa-signal)",
      label: "CLOSED",
      detail: `${pnl >= 0 ? "+" : ""}£${pnl.toFixed(0)} · ${row.payload?.hit || ""}`.trim(),
    };
  }
  return { Icon: Sparkles, tone: "var(--stoa-muted)", label: row.kind.toUpperCase(), detail: row.body_text };
}

const PendingDistance = ({ intent }: { intent: IntentRow }) => {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("quote_cache")
      .select("price, cached_at")
      .eq("symbol", intent.symbol)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.price) return;
        setPrice(Number(data.price));
      });
    return () => { cancelled = true; };
  }, [intent.symbol]);

  if (price == null || intent.trigger_value == null) return null;
  const tv = Number(intent.trigger_value);
  const above = intent.trigger_kind === "price_above";
  const fired = above ? price >= tv : price <= tv;
  const pct = ((tv - price) / price) * 100;
  return (
    <span className="stoa-mono" style={{ fontSize: 10, color: fired ? "var(--stoa-secondary)" : "var(--stoa-muted)" }}>
      {price.toFixed(2)} → {fired ? "ARMED" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
    </span>
  );
};

const MentorIntentTicker = () => {
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [intents, setIntents] = useState<Map<string, IntentRow>>(new Map());
  const [flashId, setFlashId] = useState<string | null>(null);

  const load = async () => {
    const { data: j } = await supabase
      .from("mentor_journal")
      .select("*")
      .in("kind", ["intent_published", "intent_resolved", "open", "close"])
      .order("created_at", { ascending: false })
      .limit(8);
    const list = (j || []) as JournalRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.intent_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: ix } = await supabase.from("mentor_intents").select("*").in("id", ids);
      setIntents(new Map((ix || []).map((i: any) => [i.id, i])));
    } else {
      setIntents(new Map());
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("mentor-ticker")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_journal" }, (p: any) => {
        if (p?.new?.kind && INTENT_KINDS.has(p.new.kind)) {
          setFlashId(p.new.id);
          setTimeout(() => setFlashId(null), 2400);
          load();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_intents" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const display = useMemo(() => rows.slice(0, 6), [rows]);

  if (!display.length) {
    return (
      <div className="stoa-mono px-3 py-2 rounded-lg" style={{ fontSize: 11, color: "var(--stoa-muted)", border: "1px solid var(--stoa-rule)", background: "var(--stoa-bg)" }}>
        Awaiting Sophos's first plan…
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="stoa-kicker flex items-center gap-2" style={{ color: "var(--stoa-muted)" }}>
        <Sparkles size={10} /> LATEST INTENT ACTIVITY
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {display.map((r) => {
          const intent = r.intent_id ? intents.get(r.intent_id) : null;
          const meta = chipMeta(r, intents);
          const tab = tabFor(r.kind);
          const itemId = intent?.id || r.trade_id || r.id;
          const isFlashing = flashId === r.id;
          return (
            <button
              key={r.id}
              onClick={() => focusMentor(tab, itemId)}
              className="shrink-0 text-left rounded-xl px-3 py-2 transition-all hover:translate-y-[-1px]"
              style={{
                minWidth: 220,
                maxWidth: 280,
                border: `1px solid ${isFlashing ? meta.tone : "var(--stoa-rule)"}`,
                background: isFlashing
                  ? `color-mix(in oklab, ${meta.tone} 14%, var(--stoa-shine))`
                  : "var(--stoa-shine)",
                boxShadow: isFlashing ? `0 0 0 4px color-mix(in oklab, ${meta.tone} 22%, transparent)` : "none",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <meta.Icon size={11} style={{ color: meta.tone }} />
                  <span className="stoa-kicker" style={{ color: meta.tone, fontSize: 10 }}>{meta.label}</span>
                  <span className="stoa-mono truncate" style={{ fontSize: 12, color: "var(--stoa-ink)", fontWeight: 600 }}>
                    {r.symbol || "—"}
                  </span>
                </div>
                <ChevronRight size={11} style={{ color: "var(--stoa-muted)" }} />
              </div>
              <div className="truncate mt-1" style={{ fontSize: 11, color: "var(--stoa-ink)", lineHeight: 1.35 }}>
                {meta.detail}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>{ageLabel(r.created_at)}</span>
                {r.kind === "intent_published" && intent && intent.status === "pending" && <PendingDistance intent={intent} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MentorIntentTicker;
