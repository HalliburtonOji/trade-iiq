import { useState, useEffect, useRef } from "react";
import { Image, Upload, Trash2, Tag, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Screenshot {
  id: string;
  symbol: string;
  image_url: string;
  annotation: string;
  phase: string;
  tags: string[];
  created_at: string;
}

const PHASES = ["pre_trade", "post_trade", "general"];

const ScreenshotVault = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterSymbol, setFilterSymbol] = useState("");
  const [viewItem, setViewItem] = useState<Screenshot | null>(null);

  // Upload form
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [phase, setPhase] = useState("pre_trade");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const fetchScreenshots = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("screenshot_vault")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setScreenshots(data.map((s: any) => ({ ...s, tags: Array.isArray(s.tags) ? s.tags : [] })));
    setLoading(false);
  };

  useEffect(() => { fetchScreenshots(); }, [user]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const upload = async () => {
    if (!user || !file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("chart_screenshots").upload(path, file);
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("chart_screenshots").getPublicUrl(path);

    const { error } = await supabase.from("screenshot_vault").insert({
      user_id: user.id,
      symbol: symbol.toUpperCase() || "UNKNOWN",
      image_url: urlData.publicUrl,
      annotation,
      phase,
      tags,
    });

    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); } else {
      toast({ title: "Screenshot saved" });
      setShowUpload(false); setFile(null); setSymbol(""); setAnnotation(""); setPhase("pre_trade"); setTags([]);
      fetchScreenshots();
    }
    setUploading(false);
  };

  const deleteScreenshot = async (id: string) => {
    await supabase.from("screenshot_vault").delete().eq("id", id).eq("user_id", user!.id);
    toast({ title: "Deleted" });
    fetchScreenshots();
  };

  const filtered = screenshots.filter(s => {
    if (filterPhase !== "all" && s.phase !== filterPhase) return false;
    if (filterSymbol && !s.symbol.toLowerCase().includes(filterSymbol.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Screenshot Vault</h1>
            <p className="text-sm text-muted-foreground">Pre/post-trade chart screenshots with annotations</p>
          </div>
          <Button onClick={() => setShowUpload(true)} size="sm" className="gap-1.5"><Upload className="h-4 w-4" /> Upload</Button>
        </div>

        {showUpload && (
          <GlassCard className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Upload Screenshot</h3>
              <button onClick={() => setShowUpload(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border/40 rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 transition-all">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? <p className="text-sm text-foreground">{file.name}</p> : <p className="text-sm text-muted-foreground">Click to select image</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Symbol (e.g. AAPL)" />
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_trade">Pre-Trade</SelectItem>
                  <SelectItem value="post_trade">Post-Trade</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} placeholder="Add tag..." />
              </div>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] gap-1">{t}<button onClick={() => setTags(tags.filter(x => x !== t))}><X className="h-2.5 w-2.5" /></button></Badge>)}
              </div>
            )}
            <Textarea value={annotation} onChange={e => setAnnotation(e.target.value)} placeholder="What do you see? Annotation..." rows={3} />
            <Button onClick={upload} disabled={!file || uploading} className="w-full">{uploading ? "Uploading..." : "Save Screenshot"}</Button>
          </GlassCard>
        )}

        <div className="flex gap-2 items-center">
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pre_trade">Pre-Trade</SelectItem>
              <SelectItem value="post_trade">Post-Trade</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Input value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)} placeholder="Filter symbol..." className="w-32" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Image className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No screenshots yet.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(s => (
              <div key={s.id} className="group relative rounded-xl overflow-hidden border border-border/20 bg-card/50 cursor-pointer" onClick={() => setViewItem(s)}>
                <img src={s.image_url} alt={s.symbol} className="w-full aspect-video object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-2">
                  <p className="text-xs font-semibold">{s.symbol}</p>
                  <Badge variant="outline" className="text-[9px] w-fit">{s.phase.replace("_", " ")}</Badge>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteScreenshot(s.id); }} className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogContent className="max-w-2xl">
            {viewItem && (
              <>
                <DialogHeader><DialogTitle>{viewItem.symbol} — {viewItem.phase.replace("_", " ")}</DialogTitle></DialogHeader>
                <img src={viewItem.image_url} alt={viewItem.symbol} className="w-full rounded-lg" />
                {viewItem.annotation && <p className="text-sm text-muted-foreground">{viewItem.annotation}</p>}
                {viewItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">{viewItem.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
};

export default ScreenshotVault;
