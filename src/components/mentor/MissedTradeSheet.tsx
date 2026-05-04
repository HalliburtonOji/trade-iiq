import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  symbol: string;
  context: string; // e.g. "Sophos opened AAPL long at 192.40"
};

const REASONS = [
  { id: "scared", label: "I was scared / hesitant" },
  { id: "missed", label: "I missed it / wasn't watching" },
  { id: "disagreed", label: "I disagreed with the setup" },
  { id: "rules", label: "It violated my rules" },
  { id: "size", label: "Couldn't size it properly" },
];

export default function MissedTradeSheet({ open, onClose, symbol, context }: Props) {
  const { user } = useAuth();
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !picked) return;
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    // Append to today's evening_reflections (or create stub)
    const { data: existing } = await supabase
      .from("evening_reflections")
      .select("id, lesson, trade_summary")
      .eq("user_id", user.id)
      .eq("reflection_date", today)
      .maybeSingle();

    const newEntry = `Missed Sophos on ${symbol}: ${REASONS.find(r => r.id === picked)?.label}${note ? ` — ${note}` : ""}.`;
    if (existing) {
      const merged = (existing.lesson ? existing.lesson + "\n\n" : "") + newEntry;
      const summary = (existing.trade_summary as any) || {};
      await supabase.from("evening_reflections").update({
        lesson: merged,
        trade_summary: { ...summary, missed_mentor: [ ...((summary.missed_mentor as any[]) || []), { symbol, reason: picked, note, context, at: new Date().toISOString() }] },
      }).eq("id", existing.id);
    } else {
      await supabase.from("evening_reflections").insert({
        user_id: user.id,
        reflection_date: today,
        lesson: newEntry,
        rules_honoured: [],
        intent_tomorrow: "",
        trade_summary: { missed_mentor: [{ symbol, reason: picked, note, context, at: new Date().toISOString() }] },
      });
    }
    await supabase.rpc("award_xp", {
      p_amount: 5,
      p_source: "missed_mentor_reflection",
      p_ref_id: `${symbol}_${today}`,
      p_ref_table: "evening_reflections",
    });
    toast.success("+5 XP — reflection saved", { description: "Honest answers compound." });
    setBusy(false);
    onClose();
    setPicked(null);
    setNote("");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Why didn't you take this?</SheetTitle>
          <SheetDescription>{context}</SheetDescription>
        </SheetHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setPicked(r.id)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                background: picked === r.id ? "var(--stoa-accent)" : "var(--stoa-bg)",
                color: picked === r.id ? "var(--stoa-ink)" : "var(--stoa-ink)",
                border: "1px solid var(--stoa-rule)",
                borderRadius: 2,
                cursor: "pointer",
                fontFamily: "Georgia, serif",
                fontSize: 14,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="One honest sentence (optional)"
          style={{
            width: "100%", marginTop: 12,
            background: "var(--stoa-bg)", border: "1px solid var(--stoa-rule)",
            borderRadius: 2, padding: 10, color: "var(--stoa-ink)",
            fontFamily: "inherit", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 18px", background: "transparent", color: "var(--stoa-muted)", border: "1px solid var(--stoa-rule)", borderRadius: 2, cursor: "pointer", fontFamily: "inherit" }}
          >
            Skip
          </button>
          <button
            onClick={submit}
            disabled={!picked || busy}
            style={{ padding: "10px 22px", background: "var(--stoa-accent)", color: "var(--stoa-ink)", border: "none", borderRadius: 2, cursor: picked ? "pointer" : "not-allowed", opacity: picked ? 1 : 0.5, fontFamily: "inherit" }}
          >
            {busy ? "Saving…" : "Save reflection · +5 XP"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
