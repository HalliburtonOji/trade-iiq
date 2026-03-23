import { useState, useMemo } from "react";
import { Star, ExternalLink, Copy, Search, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BrokerLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  decision?: string;
  price?: number;
  assetType?: string;
}

const brokers = [
  { id: "trading212", name: "Trading 212", url: "https://app.trading212.com/", color: "#00C805" },
  { id: "ibkr", name: "Interactive Brokers", url: "https://www.interactivebrokers.com/", color: "#D41F22" },
  { id: "etoro", name: "eToro", url: "https://www.etoro.com/", color: "#6FCF97" },
  { id: "robinhood", name: "Robinhood", url: "https://robinhood.com/", color: "#00C805" },
  { id: "webull", name: "Webull", url: "https://www.webull.com/", color: "#F5A623" },
  { id: "freetrade", name: "Freetrade", url: "https://freetrade.io/", color: "#6C5CE7" },
  { id: "plus500", name: "Plus500", url: "https://www.plus500.com/", color: "#00A0E3" },
  { id: "ig", name: "IG", url: "https://www.ig.com/", color: "#E4003A" },
  { id: "saxo", name: "Saxo", url: "https://www.home.saxo/", color: "#0064A7" },
  { id: "charles_schwab", name: "Charles Schwab", url: "https://www.schwab.com/", color: "#00A3E0" },
  { id: "fidelity", name: "Fidelity", url: "https://www.fidelity.com/", color: "#4AA564" },
  { id: "td_ameritrade", name: "TD Ameritrade", url: "https://www.tdameritrade.com/", color: "#4CAF50" },
  { id: "binance", name: "Binance", url: "https://www.binance.com/", color: "#F0B90B" },
  { id: "coinbase", name: "Coinbase", url: "https://www.coinbase.com/", color: "#0052FF" },
  { id: "kraken", name: "Kraken", url: "https://www.kraken.com/", color: "#5741D9" },
];

const BrokerLauncher = ({ open, onOpenChange, symbol, decision, price, assetType }: BrokerLauncherProps) => {
  const [search, setSearch] = useState("");
  const [favBroker, setFavBroker] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load favorite
  useState(() => {
    if (!user) return;
    supabase.from("profiles").select("preferred_broker").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.preferred_broker) setFavBroker(data.preferred_broker);
    });
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const sorted = [...brokers].sort((a, b) => {
      if (a.id === favBroker) return -1;
      if (b.id === favBroker) return 1;
      return 0;
    });
    return q ? sorted.filter(b => b.name.toLowerCase().includes(q)) : sorted;
  }, [search, favBroker]);

  const setFavorite = async (brokerId: string) => {
    if (!user) return;
    const newFav = favBroker === brokerId ? null : brokerId;
    setFavBroker(newFav);
    await supabase.from("profiles").update({ preferred_broker: newFav } as any).eq("user_id", user.id);
    toast({ title: newFav ? "Favorite broker saved" : "Favorite removed" });
  };

  const summary = `${decision || "TRADE"} ${symbol}${price ? ` @ $${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}${assetType ? ` (${assetType})` : ""}`;

  const copyDetails = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">Execute Trade</SheetTitle>
          <SheetDescription>Copy details and open your broker</SheetDescription>
        </SheetHeader>

        {/* Trade summary */}
        <div className="mt-4 rounded-xl bg-secondary/50 border border-border/30 p-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold font-mono">{symbol}</p>
            <p className="text-xs text-muted-foreground">{summary}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={copyDetails} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brokers..."
            className="pl-9 bg-secondary/50 border-border/50"
          />
        </div>

        {/* Broker list */}
        <div className="mt-4 space-y-1.5 pb-4">
          {filtered.map((broker) => (
            <div
              key={broker.id}
              className="flex items-center gap-3 rounded-xl p-3 border border-border/20 bg-card/50 hover:bg-secondary/30 transition-all"
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: broker.color }}
              >
                {broker.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{broker.name}</p>
                {broker.id === favBroker && (
                  <span className="text-[10px] text-primary font-medium">⭐ Favorite</span>
                )}
              </div>
              <button
                onClick={() => setFavorite(broker.id)}
                className="p-1.5 rounded-lg hover:bg-secondary/50 transition-all"
              >
                <Star className={`h-3.5 w-3.5 ${favBroker === broker.id ? "text-primary fill-primary" : "text-muted-foreground"}`} />
              </button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={() => window.open(broker.url, "_blank")}
              >
                Open <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BrokerLauncher;
