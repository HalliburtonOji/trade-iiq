import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import VerdictBadge from "@/components/VerdictBadge";
import Leaderboard from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Send, TrendingUp } from "lucide-react";

interface TradeIdea {
  id: string; symbol: string; verdict: string; thesis: string;
  confidence: number; display_name: string; likes_count: number; created_at: string;
  liked?: boolean;
}

const cream = { background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 } as const;

const verdictColor = (v: string) =>
  v === "BUY" ? "hsl(var(--verdict-buy))" : v === "WAIT" ? "hsl(var(--verdict-wait))" : "hsl(var(--verdict-avoid))";

const Community = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<TradeIdea[]>([]);
  const [form, setForm] = useState({ symbol: "", verdict: "BUY", thesis: "", confidence: "70" });
  const [posting, setPosting] = useState(false);

  useEffect(() => { loadIdeas(); }, []);

  const loadIdeas = async () => {
    const { data } = await supabase.from("trade_ideas").select("*").order("created_at", { ascending: false }).limit(30);
    if (data) {
      let likedIds: string[] = [];
      if (user) {
        const { data: likes } = await supabase.from("idea_likes").select("idea_id").eq("user_id", user.id);
        likedIds = (likes || []).map((l: any) => l.idea_id);
      }
      setIdeas((data as any[]).map(d => ({ ...d, liked: likedIds.includes(d.id) })));
    }
  };

  const postIdea = async () => {
    if (!user || !form.symbol || !form.thesis) return;
    setPosting(true);
    const profile = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
    const { error } = await supabase.from("trade_ideas").insert({
      user_id: user.id, symbol: form.symbol.toUpperCase(), verdict: form.verdict,
      thesis: form.thesis, confidence: parseInt(form.confidence) || 70,
      display_name: profile.data?.display_name || "Anonymous",
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Idea published!" });
      setForm({ symbol: "", verdict: "BUY", thesis: "", confidence: "70" });
      loadIdeas();
    }
    setPosting(false);
  };

  const toggleLike = async (idea: TradeIdea) => {
    if (!user) return;
    if (idea.liked) {
      await supabase.from("idea_likes").delete().eq("user_id", user.id).eq("idea_id", idea.id);
    } else {
      await supabase.from("idea_likes").insert({ user_id: user.id, idea_id: idea.id } as any);
    }
    loadIdeas();
  };

  return (
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Στοά</span> · Community
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">GROW · THE STOA · Στοά</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Community</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Στοά</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>traders under one roof</p>
      </div>
      <div className="flex flex-col gap-4 pt-6 pb-24">
        <Tabs defaultValue="feed">
          <TabsList className="w-full" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2 }}>
            <TabsTrigger value="feed" className="flex-1 stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Trade Ideas</TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Leaderboard</TabsTrigger>
            <TabsTrigger value="post" className="flex-1 stoa-kicker rounded-none data-[state=active]:text-[color:var(--stoa-ink)] data-[state=active]:border-b-[2px] data-[state=active]:border-[color:var(--stoa-accent)] data-[state=active]:bg-transparent">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-3 flex flex-col gap-3">
            {ideas.map((idea) => (
              <div key={idea.id} style={{ ...cream, padding: 14 }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="stoa-mono font-bold" style={{ fontSize: 14 }}>{idea.symbol}</span>
                    <VerdictBadge verdict={idea.verdict as "BUY" | "WAIT" | "AVOID"} size="sm" />
                  </div>
                  <span className="stoa-kicker" style={{ fontSize: 10 }}>{new Date(idea.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs mb-2" style={{ fontFamily: "Georgia, serif", color: "var(--stoa-ink)" }}>{idea.thesis}</p>
                <div className="flex items-center justify-between">
                  <span className="stoa-kicker" style={{ fontSize: 10 }}>{idea.display_name} · {idea.confidence}% confidence</span>
                  <button onClick={() => toggleLike(idea)} className={`flex items-center gap-1 text-xs transition-colors ${idea.liked ? "text-verdict-avoid" : ""}`} style={!idea.liked ? { color: "var(--stoa-muted)" } : undefined}>
                    <Heart className={`h-3.5 w-3.5 ${idea.liked ? "fill-current" : ""}`} />
                    <span>{idea.likes_count}</span>
                  </button>
                </div>
              </div>
            ))}
            {ideas.length === 0 && (
              <div style={{ ...cream, padding: 32 }} className="text-center">
                <p style={{ fontFamily: "Georgia, serif", fontSize: 14, fontStyle: "italic", color: "var(--stoa-muted)" }}>No ideas yet · κενόν — be the first to share</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-3">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="post" className="mt-3 flex flex-col gap-3">
            <div style={{ ...cream, padding: 14 }}>
              <p className="stoa-kicker mb-3">Share a Trade Idea · Γνώμη</p>
              <div className="flex flex-col gap-2">
                <Input placeholder="Symbol (e.g. AAPL)" value={form.symbol} onChange={(e) => setForm(p => ({ ...p, symbol: e.target.value }))} style={cream} />
                <div className="flex gap-2">
                  {["BUY", "WAIT", "AVOID"].map((v) => {
                    const active = form.verdict === v;
                    return (
                      <button
                        key={v}
                        onClick={() => setForm(p => ({ ...p, verdict: v }))}
                        className="flex-1 py-2 text-xs font-semibold transition-all stoa-kicker"
                        style={{
                          background: active ? verdictColor(v) : "var(--stoa-shine)",
                          color: active ? "#fff" : "var(--stoa-muted)",
                          border: `1px solid ${active ? verdictColor(v) : "var(--stoa-rule)"}`,
                          borderRadius: 2,
                        }}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                <Textarea placeholder="Your thesis — why this trade?" value={form.thesis} onChange={(e) => setForm(p => ({ ...p, thesis: e.target.value }))} style={cream} className="min-h-[80px]" />
                <Input type="number" placeholder="Confidence %" value={form.confidence} onChange={(e) => setForm(p => ({ ...p, confidence: e.target.value }))} style={cream} />
                <Button onClick={postIdea} disabled={posting || !form.symbol || !form.thesis} className="gap-1.5 stoa-display" style={{ background: "var(--stoa-accent)", color: "var(--stoa-ink)", border: "none", borderRadius: 2 }}>
                  <Send className="h-3.5 w-3.5" /> {posting ? "Posting..." : "Publish Idea"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StoaShell>
  );
};

export default Community;
