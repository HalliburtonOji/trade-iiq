import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GlassCard from "@/components/GlassCard";
import VerdictBadge from "@/components/VerdictBadge";
import SetupScoreMeter from "@/components/SetupScoreMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AnalysisResult } from "@/data/analysisData";

const SymbolCompare = () => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const addSymbol = async () => {
    const s = input.trim().toUpperCase();
    if (!s || symbols.includes(s) || symbols.length >= 3) return;
    setInput("");
    setSymbols(prev => [...prev, s]);
    setLoading(s);
    try {
      const { data } = await supabase.functions.invoke("analyze-symbol", { body: { symbol: s, asset_type: "stock" } });
      if (data?.verdict) setResults(prev => ({ ...prev, [s]: data }));
    } catch {}
    setLoading(null);
  };

  const remove = (s: string) => {
    setSymbols(prev => prev.filter(x => x !== s));
    setResults(prev => { const n = { ...prev }; delete n[s]; return n; });
  };

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Compare Symbols (up to 3)</h3>
      <div className="flex gap-2 mb-3">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSymbol()}
          placeholder="Enter symbol..." className="bg-secondary/50 flex-1" disabled={symbols.length >= 3} />
        <Button size="sm" onClick={addSymbol} disabled={symbols.length >= 3 || !input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {symbols.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${symbols.length}, 1fr)` }}>
          {symbols.map((s) => {
            const r = results[s];
            const isLoading = loading === s;
            return (
              <div key={s} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono">{s}</span>
                  <button onClick={() => remove(s)}><X className="h-3 w-3 text-muted-foreground" /></button>
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : r ? (
                  <>
                    <VerdictBadge verdict={r.verdict} size="sm" />
                    <div className="flex items-center justify-center"><SetupScoreMeter score={r.setupScore} size="sm" /></div>
                    <div className="text-center">
                      <p className="text-lg font-bold font-mono">${r.price?.toLocaleString()}</p>
                      <p className={`text-xs font-mono ${(r.change || 0) >= 0 ? "text-verdict-buy" : "text-verdict-avoid"}`}>
                        {(r.change || 0) >= 0 ? "+" : ""}{(r.change || 0).toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-xs text-center space-y-1">
                      <p className="text-muted-foreground">Risk: <span className="text-foreground font-mono">{r.riskScore}/10</span></p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No data</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {symbols.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Add symbols to compare side-by-side</p>}
    </GlassCard>
  );
};

export default SymbolCompare;
