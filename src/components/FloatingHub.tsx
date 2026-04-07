import { useState, useRef, useEffect } from "react";
import { Menu, X, Send, Bot, User, Loader2, Home, TrendingUp, BarChart3, Filter, Sparkles, ClipboardList, PieChart, Lightbulb, GraduationCap, Gamepad2, Users, User as UserIcon, LogOut, BookOpen, Image, BarChart, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const quickPrompts = [
  "What does RSI above 70 mean?",
  "Explain support & resistance",
  "How to manage risk?",
  "What is FOMO in trading?",
];

const navItems = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "Analysis", icon: TrendingUp, path: "/analysis" },
  { label: "Demo Trading", icon: Gamepad2, path: "/demo-trading" },
  { label: "Learn", icon: GraduationCap, path: "/learn" },
  { label: "Charts", icon: BarChart3, path: "/charts" },
  { label: "Screener", icon: Filter, path: "/screener" },
  { label: "Daily Picks", icon: Sparkles, path: "/daily-picks" },
  { label: "Tracker", icon: ClipboardList, path: "/tracker" },
  { label: "Portfolio", icon: PieChart, path: "/portfolio" },
  { label: "Insights", icon: Lightbulb, path: "/insights" },
  { label: "Playbook", icon: BookOpen, path: "/playbook" },
  { label: "Screenshots", icon: Image, path: "/screenshots" },
  { label: "Review", icon: BarChart, path: "/review" },
  { label: "Community", icon: Users, path: "/community" },
  { label: "Profile", icon: UserIcon, path: "/profile" },
];

const FloatingHub = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("navigate");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    const userMsg: Msg = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    try {
      const allMessages = [...messages, userMsg];
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: allMessages }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        upsertAssistant(err.error || "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      upsertAssistant("Connection error. Please check your network and try again.");
    }
    setIsLoading(false);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-4 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform md:right-6"
          >
            <Menu className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] h-[85vh] flex flex-col p-0"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/20">
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="navigate" className="text-xs">Navigate</TabsTrigger>
                <TabsTrigger value="chat" className="text-xs">AI Coach</TabsTrigger>
              </TabsList>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-all">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <TabsContent value="navigate" className="flex-1 overflow-y-auto px-4 py-4 m-0">
              <div className="grid grid-cols-3 gap-3">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { setOpen(false); navigate(item.path); }}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl py-4 px-2 text-[11px] font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-border/30">
                <button
                  onClick={() => { setOpen(false); signOut(); }}
                  className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Hey! I'm your trading coach.</p>
                      <p className="text-xs text-muted-foreground mt-1">Ask me anything about markets, setups, or strategy.</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {quickPrompts.map((q) => (
                        <button key={q} onClick={() => send(q)} className="rounded-full px-3 py-1.5 text-[11px] font-medium bg-secondary/50 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary/50 border border-border/20 text-foreground rounded-bl-md"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="bg-secondary/50 border border-border/20 rounded-2xl rounded-bl-md px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
              <div className="px-3 py-3 border-t border-border/20 bg-card/30">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Ask anything..."
                    className="flex-1 bg-secondary/50 border border-border/30 rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <Button onClick={() => send()} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 rounded-xl h-9 w-9">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FloatingHub;
