import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Activity, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";

const KIND_DOT: Record<string, string> = {
  open: "var(--stoa-secondary)",
  close: "var(--stoa-signal)",
  skip: "var(--stoa-muted)",
  intent_published: "var(--stoa-accent)",
  intent_resolved: "var(--stoa-secondary)",
  manage: "var(--stoa-accent)",
};

const SophosLiveDrawer = () => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [pulse, setPulse] = useState(false);
  const [hidden, setHidden] = useState<boolean>(false);

  useEffect(() => {
    setHidden(localStorage.getItem("sophos_live_hidden") === "1");
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("mentor_journal")
        .select("id,kind,symbol,body_text,created_at,mentor_slug")
        .eq("mentor_slug", "sophos")
        .order("created_at", { ascending: false })
        .limit(6);
      if (active) setEntries(data || []);
    };
    load();
    const ch = supabase.channel("sophos-live-drawer")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mentor_journal" }, (p: any) => {
        if (p?.new?.mentor_slug !== "sophos") return;
        setEntries((e) => [p.new, ...e].slice(0, 6));
        setPulse(true);
        setTimeout(() => setPulse(false), 1500);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  if (hidden || entries.length === 0) return null;

  const latest = entries[0];
  const ago = (() => {
    const m = Math.round((Date.now() - new Date(latest.created_at).getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    return `${h}h ago`;
  })();

  return (
    <div
      className="fixed z-30 bottom-4 right-4 left-auto rounded-2xl backdrop-blur"
      style={{
        background: "color-mix(in oklab, var(--stoa-surface) 92%, transparent)",
        border: "1px solid var(--stoa-rule)",
        width: open ? 340 : 280,
        maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        transition: "width 0.2s",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{
            background: "var(--stoa-accent)",
            animation: pulse ? "stoa-pulse 0.6s ease-in-out 2" : "stoa-pulse 2.4s ease-in-out infinite",
          }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--stoa-accent)" }} />
        </span>
        <Activity size={12} style={{ color: "var(--stoa-accent)" }} />
        <div className="stoa-kicker" style={{ color: "var(--stoa-ink)", fontSize: 10 }}>SOPHOS LIVE</div>
        <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)", marginLeft: "auto" }}>{ago}</span>
        {open ? <ChevronDown size={12} style={{ color: "var(--stoa-muted)" }} /> : <ChevronUp size={12} style={{ color: "var(--stoa-muted)" }} />}
      </div>

      {!open && (
        <div className="px-3 pb-3" style={{ fontSize: 12, color: "var(--stoa-ink)", lineHeight: 1.4 }}>
          <span className="stoa-mono" style={{ fontSize: 10, color: KIND_DOT[latest.kind] || "var(--stoa-muted)", marginRight: 6 }}>
            {latest.kind.replace("_", " ").toUpperCase()}
          </span>
          {latest.symbol && <span className="stoa-mono" style={{ fontSize: 11, color: "var(--stoa-ink)", marginRight: 6 }}>{latest.symbol}</span>}
          <span style={{ color: "var(--stoa-muted)" }}>{(latest.body_text || "").slice(0, 80)}{(latest.body_text || "").length > 80 ? "…" : ""}</span>
        </div>
      )}

      {open && (
        <div className="px-3 pb-3 space-y-2 max-h-80 overflow-y-auto">
          {entries.map((e) => (
            <div key={e.id} className="flex gap-2 items-start">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: KIND_DOT[e.kind] || "var(--stoa-muted)" }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="stoa-mono" style={{ fontSize: 9, color: KIND_DOT[e.kind] || "var(--stoa-muted)", fontWeight: 600 }}>
                    {e.kind.replace("_", " ").toUpperCase()}
                  </span>
                  {e.symbol && <span className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-ink)" }}>{e.symbol}</span>}
                </div>
                <p style={{ fontSize: 12, color: "var(--stoa-muted)", lineHeight: 1.4, marginTop: 2 }}>{e.body_text}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--stoa-rule)" }}>
            <Link to="/mentor" className="inline-flex items-center gap-1 stoa-mono" style={{ fontSize: 10, color: "var(--stoa-accent)", fontWeight: 600 }}>
              Watch live <ExternalLink size={10} />
            </Link>
            <button onClick={() => { localStorage.setItem("sophos_live_hidden", "1"); setHidden(true); }}
              className="stoa-mono" style={{ fontSize: 10, color: "var(--stoa-muted)" }}>
              Hide today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SophosLiveDrawer;
