import { useState, useRef } from "react";
import { Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import GlassCard from "@/components/GlassCard";

interface ParsedTrade {
  symbol: string;
  asset_type: string;
  decision: string;
  entry_price: number | null;
  notes: string;
  date: string;
}

// Column mapping for known brokers
const BROKER_MAPS: Record<string, Record<string, string>> = {
  trading212: {
    "Ticker": "symbol",
    "Action": "decision",
    "Price / share": "entry_price",
    "Time": "date",
    "Notes": "notes",
  },
  interactive_brokers: {
    "Symbol": "symbol",
    "Buy/Sell": "decision",
    "T. Price": "entry_price",
    "Date/Time": "date",
    "Description": "notes",
  },
  generic: {
    "symbol": "symbol",
    "ticker": "symbol",
    "action": "decision",
    "side": "decision",
    "type": "decision",
    "price": "entry_price",
    "entry_price": "entry_price",
    "date": "date",
    "time": "date",
    "datetime": "date",
    "notes": "notes",
    "description": "notes",
  },
};

function detectBroker(headers: string[]): string {
  const lower = headers.map(h => h.toLowerCase().trim());
  if (lower.includes("ticker") && lower.includes("action") && lower.some(h => h.includes("price / share"))) return "trading212";
  if (lower.includes("symbol") && lower.includes("buy/sell") && lower.some(h => h.includes("t. price"))) return "interactive_brokers";
  return "generic";
}

function mapDecision(raw: string): string {
  const v = raw.toUpperCase().trim();
  if (["BUY", "MARKET_BUY", "LIMIT_BUY", "LONG"].includes(v)) return "BUY";
  if (["SELL", "MARKET_SELL", "LIMIT_SELL", "SHORT"].includes(v)) return "AVOID";
  return "WAIT";
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const rows = lines.slice(1).map(l => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of l) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  });
  return { headers, rows };
}

function mapRow(headers: string[], row: string[], brokerMap: Record<string, string>): ParsedTrade | null {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    const key = brokerMap[h] || brokerMap[h.toLowerCase().trim()];
    if (key && row[i]) obj[key] = row[i];
  });

  if (!obj.symbol) return null;

  return {
    symbol: obj.symbol.replace(/[^A-Za-z0-9/.-]/g, "").toUpperCase(),
    asset_type: obj.symbol.includes("/") ? "forex" : /^[A-Z]{2,5}$/.test(obj.symbol.toUpperCase()) ? "stock" : "crypto",
    decision: mapDecision(obj.decision || "BUY"),
    entry_price: obj.entry_price ? parseFloat(obj.entry_price) || null : null,
    notes: obj.notes || "Imported from CSV",
    date: obj.date || new Date().toISOString(),
  };
}

const CsvImport = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedTrade[] | null>(null);
  const [broker, setBroker] = useState("");
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0) {
        setErrors(["Could not parse CSV headers."]);
        return;
      }

      const detected = detectBroker(headers);
      setBroker(detected);

      const map = { ...BROKER_MAPS.generic, ...BROKER_MAPS[detected] };
      const parsed: ParsedTrade[] = [];
      const errs: string[] = [];

      rows.forEach((row, i) => {
        const trade = mapRow(headers, row, map);
        if (trade) parsed.push(trade);
        else errs.push(`Row ${i + 2}: could not parse (missing symbol)`);
      });

      if (errs.length > 5) {
        setErrors([...errs.slice(0, 5), `... and ${errs.length - 5} more`]);
      } else {
        setErrors(errs);
      }

      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview || !user) return;
    setImporting(true);

    const records = preview.map(t => ({
      user_id: user.id,
      symbol: t.symbol,
      asset_type: t.asset_type,
      decision: t.decision,
      entry_price: t.entry_price,
      notes: t.notes,
      outcome: "PENDING" as const,
      date: t.date,
    }));

    const { error } = await supabase.from("trade_decisions").insert(records);

    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Import complete", description: `${records.length} trades imported.` });
      setPreview(null);
      setBroker("");
      onComplete();
    }
    setImporting(false);
  };

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">Import from CSV</span>
        <span className="text-[10px] text-muted-foreground ml-auto">Trading212, IBKR, or generic</span>
      </div>

      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

      {!preview ? (
        <Button variant="outline" size="sm" className="text-xs gap-2" onClick={() => fileRef.current?.click()}>
          <FileText className="h-3.5 w-3.5" /> Choose CSV File
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-verdict-buy" />
            <span>{preview.length} trades parsed</span>
            {broker !== "generic" && <span className="text-muted-foreground">· Detected: {broker.replace("_", " ")}</span>}
          </div>

          {errors.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-verdict-avoid/5 border border-verdict-avoid/10">
              <AlertTriangle className="h-3.5 w-3.5 text-verdict-avoid shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                {errors.map((e, i) => <span key={i} className="text-[10px] text-verdict-avoid">{e}</span>)}
              </div>
            </div>
          )}

          {/* Preview table */}
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border/50">
            <table className="w-full text-[10px]">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left text-muted-foreground font-medium">Symbol</th>
                  <th className="px-2 py-1 text-left text-muted-foreground font-medium">Decision</th>
                  <th className="px-2 py-1 text-right text-muted-foreground font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((t, i) => (
                  <tr key={i} className="border-t border-border/20">
                    <td className="px-2 py-1 font-mono font-medium">{t.symbol}</td>
                    <td className={`px-2 py-1 font-bold ${t.decision === "BUY" ? "text-verdict-buy" : t.decision === "AVOID" ? "text-verdict-avoid" : "text-verdict-wait"}`}>{t.decision}</td>
                    <td className="px-2 py-1 text-right font-mono">{t.entry_price ? `$${t.entry_price.toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 20 && <p className="text-center text-[10px] text-muted-foreground py-1">... {preview.length - 20} more</p>}
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs" onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${preview.length} Trades`}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => { setPreview(null); setErrors([]); }}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </GlassCard>
  );
};

export default CsvImport;
