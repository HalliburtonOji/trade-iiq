import { supabase } from "@/integrations/supabase/client";

export async function seedCodexInitiates() {
  const specs = [
    { track: "markets", level: 1, slug: "markets-01-order-types",   title_en: "Order Types & Execution", title_gr: "Τάξις τῆς Ἀγορᾶς", summary: "Market, limit, stop — when each costs you and when each saves you.", ordinal: 1, learn_minutes: 7 },
    { track: "chart",   level: 1, slug: "chart-01-candle-anatomy",  title_en: "Candle Anatomy",          title_gr: "Ἀνατομία τοῦ Κηροῦ", summary: "Body, wick, and the story they tell.",                              ordinal: 1, learn_minutes: 6 },
    { track: "risk",    level: 1, slug: "risk-01-position-sizing",  title_en: "Position Sizing 101",     title_gr: "Μέτρον τῆς Θέσεως",  summary: "The math that lets you lose and live.",                            ordinal: 1, learn_minutes: 8, xp_reward: 60 },
    { track: "mind",    level: 1, slug: "mind-01-bias-basics",      title_en: "The Four Biases",         title_gr: "Τέσσερες Πλάνες",    summary: "Confirmation, recency, loss-aversion, overconfidence.",            ordinal: 1, learn_minutes: 7 },
    { track: "craft",   level: 1, slug: "craft-01-playbook-intro",  title_en: "What is a Playbook?",     title_gr: "Τί ἔστι Τακτικόν;",  summary: "Why every serious trader writes one and how to start.",            ordinal: 1, learn_minutes: 7, xp_reward: 60 },
  ];
  const { data, error } = await supabase.functions.invoke("generate-codex-module", {
    body: { specs, auto_publish: true },
  });
  console.log("seedCodexInitiates:", { data, error });
  return { data, error };
}
