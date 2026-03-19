import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NormalizedQuote } from "@/types/quote";

interface QuoteCacheEntry {
  quote: NormalizedQuote;
  fetchedAt: number;
}

// L3: Client-side in-memory cache shared across hook instances
const clientCache = new Map<string, QuoteCacheEntry>();
const CLIENT_CACHE_TTL_MS = 60_000; // 1 min for client cache

function getCachedQuote(symbol: string): NormalizedQuote | null {
  const entry = clientCache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CLIENT_CACHE_TTL_MS) {
    clientCache.delete(symbol);
    return null;
  }
  return entry.quote;
}

function setCachedQuotes(quotes: NormalizedQuote[]) {
  const now = Date.now();
  for (const q of quotes) {
    clientCache.set(q.symbol, { quote: q, fetchedAt: now });
  }
}

export function useQuotes(
  symbols: string[],
  assetType: "stock" | "crypto" | "forex" = "stock",
  refreshIntervalMs = 5 * 60 * 1000
) {
  const [quotes, setQuotes] = useState<Record<string, NormalizedQuote>>({});
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) return;

    // Check client cache first
    const cached: Record<string, NormalizedQuote> = {};
    const stale: string[] = [];
    for (const s of symbols) {
      const c = getCachedQuote(s.toUpperCase());
      if (c) cached[s.toUpperCase()] = c;
      else stale.push(s);
    }

    if (stale.length === 0) {
      setQuotes(prev => ({ ...prev, ...cached }));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("live-quote", {
        body: { symbols: stale, asset_type: assetType },
      });

      if (error) throw error;

      const normalized = data?.quotes as Record<string, NormalizedQuote> | undefined;
      if (normalized) {
        setCachedQuotes(Object.values(normalized));
        if (mountedRef.current) {
          setQuotes(prev => ({ ...prev, ...cached, ...normalized }));
        }
      }
    } catch (e) {
      console.error("Quote fetch error:", e);
      // Serve whatever cache we had
      if (Object.keys(cached).length > 0 && mountedRef.current) {
        setQuotes(prev => ({ ...prev, ...cached }));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [symbols.join(","), assetType]);

  useEffect(() => {
    mountedRef.current = true;
    fetchQuotes();
    const interval = setInterval(fetchQuotes, refreshIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchQuotes, refreshIntervalMs]);

  return { quotes, loading, refetch: fetchQuotes };
}
