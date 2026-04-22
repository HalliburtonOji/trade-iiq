import { useState, useEffect } from "react";
import { Plus, BookOpen, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoaShell from "@/components/stoa/StoaShell";
import PedimentCap from "@/components/stoa/PedimentCap";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Playbook {
  id: string;
  name: string;
  strategy_type: string;
  checklist: string[];
  conditions: { entry: string; exit: string };
  invalidation_rules: string;
  notes: string;
  created_at: string;
}

const STRATEGY_TYPES = ["breakout", "pullback", "mean-reversion", "trend-follow", "scalp", "swing", "custom"];

const Playbook = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [strategyType, setStrategyType] = useState("breakout");
  const [checklistItems, setChecklistItems] = useState<string[]>([""]);
  const [entryCondition, setEntryCondition] = useState("");
  const [exitCondition, setExitCondition] = useState("");
  const [invalidation, setInvalidation] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPlaybooks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("playbooks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setPlaybooks(data.map((p: any) => ({
        ...p,
        checklist: Array.isArray(p.checklist) ? p.checklist : [],
        conditions: typeof p.conditions === "object" && p.conditions ? p.conditions : { entry: "", exit: "" },
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlaybooks(); }, [user]);

  const resetForm = () => {
    setName(""); setStrategyType("breakout"); setChecklistItems([""]); setEntryCondition(""); setExitCondition(""); setInvalidation(""); setNotes(""); setEditingId(null); setShowForm(false);
  };

  const startEdit = (p: Playbook) => {
    setName(p.name); setStrategyType(p.strategy_type); setChecklistItems(p.checklist.length ? p.checklist : [""]); setEntryCondition(p.conditions.entry || ""); setExitCondition(p.conditions.exit || ""); setInvalidation(p.invalidation_rules || ""); setNotes(p.notes || ""); setEditingId(p.id); setShowForm(true);
  };

  const save = async () => {
    if (!user || !name.trim()) return;
    const checklist = checklistItems.filter(c => c.trim());
    const payload = {
      user_id: user.id,
      name: name.trim(),
      strategy_type: strategyType,
      checklist,
      conditions: { entry: entryCondition, exit: exitCondition },
      invalidation_rules: invalidation,
      notes,
    };

    if (editingId) {
      const { error } = await supabase.from("playbooks").update(payload).eq("id", editingId).eq("user_id", user.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Playbook updated" });
    } else {
      const { error } = await supabase.from("playbooks").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Playbook created" });
    }
    resetForm();
    fetchPlaybooks();
  };

  const deletePlaybook = async (id: string) => {
    await supabase.from("playbooks").delete().eq("id", id).eq("user_id", user!.id);
    toast({ title: "Playbook deleted" });
    fetchPlaybooks();
  };

  return (
    <StoaShell
      palette="delphi"
      crumb={
        <span>
          <span className="stoa-greek">Τακτικά</span> · Playbook
        </span>
      }
    >
      <div className="flex flex-col gap-2 mb-4 min-w-0 max-w-full overflow-hidden">
        <PedimentCap variant="rule" />
        <span className="stoa-kicker">TRAINING · THE TACTICS</span>
        <div className="flex items-baseline gap-3">
          <h1 className="stoa-display text-3xl font-semibold">Playbook</h1>
          <span className="stoa-greek text-lg" style={{ color: "var(--stoa-muted)" }}>Τακτικά</span>
        </div>
        <p className="text-sm" style={{ color: "var(--stoa-muted)" }}>thy canon of setups</p>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Playbook Builder</h1>
            <p className="text-sm text-muted-foreground">Save repeatable setups with checklists & conditions</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Playbook
          </Button>
        </div>

        {showForm && (
          <GlassCard className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{editingId ? "Edit" : "Create"} Playbook</h3>
              <button onClick={resetForm}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bull Flag Breakout" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Strategy Type</label>
                <Select value={strategyType} onValueChange={setStrategyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STRATEGY_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace("-", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Checklist</label>
              {checklistItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} onChange={e => { const n = [...checklistItems]; n[i] = e.target.value; setChecklistItems(n); }} placeholder={`Step ${i + 1}`} />
                  {checklistItems.length > 1 && (
                    <button onClick={() => setChecklistItems(checklistItems.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setChecklistItems([...checklistItems, ""])} className="text-xs">+ Add step</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Entry Conditions</label>
                <Textarea value={entryCondition} onChange={e => setEntryCondition(e.target.value)} placeholder="When to enter..." rows={3} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Exit Conditions</label>
                <Textarea value={exitCondition} onChange={e => setExitCondition(e.target.value)} placeholder="When to exit..." rows={3} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Invalidation Rules</label>
              <Textarea value={invalidation} onChange={e => setInvalidation(e.target.value)} placeholder="When the setup is no longer valid..." rows={2} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button onClick={save} disabled={!name.trim()}>
                <Check className="h-4 w-4 mr-1" /> {editingId ? "Update" : "Save"}
              </Button>
            </div>
          </GlassCard>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : playbooks.length === 0 && !showForm ? (
          <GlassCard className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No playbooks yet. Create your first repeatable setup.</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {playbooks.map(p => (
              <GlassCard key={p.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <BookOpen className="h-4 w-4 text-primary" />
                    <div>
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">{p.strategy_type}</Badge>
                    </div>
                    {expandedId === p.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary/50"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => deletePlaybook(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
                {expandedId === p.id && (
                  <div className="pt-2 border-t border-border/20 space-y-3 text-sm">
                    {p.checklist.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Checklist</p>
                        <ul className="space-y-1">
                          {p.checklist.map((c, i) => <li key={i} className="flex items-center gap-2 text-muted-foreground"><Check className="h-3 w-3 text-primary" />{c}</li>)}
                        </ul>
                      </div>
                    )}
                    {(p.conditions.entry || p.conditions.exit) && (
                      <div className="grid grid-cols-2 gap-3">
                        {p.conditions.entry && <div><p className="text-xs font-medium text-muted-foreground mb-1">Entry</p><p className="text-muted-foreground">{p.conditions.entry}</p></div>}
                        {p.conditions.exit && <div><p className="text-xs font-medium text-muted-foreground mb-1">Exit</p><p className="text-muted-foreground">{p.conditions.exit}</p></div>}
                      </div>
                    )}
                    {p.invalidation_rules && <div><p className="text-xs font-medium text-muted-foreground mb-1">Invalidation</p><p className="text-muted-foreground">{p.invalidation_rules}</p></div>}
                    {p.notes && <div><p className="text-xs font-medium text-muted-foreground mb-1">Notes</p><p className="text-muted-foreground">{p.notes}</p></div>}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </StoaShell>
  );
};

export default Playbook;
