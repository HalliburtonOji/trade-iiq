import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Camera, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Compact Trader OS surface for the Demo Trading page.
 * Three small cards linking to Playbook / Screenshot Vault / Review Workspace,
 * each showing a live count from the user's data so the surface feels alive.
 */
const TraderOSStrip = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ playbooks: 0, screenshots: 0, reviewsPending: 0 });

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [pb, sv, rev] = await Promise.all([
        supabase.from("playbooks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("screenshot_vault").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        // Closed paper trades that have no post_notes yet = pending review
        supabase
          .from("paper_trades")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "closed")
          .is("post_notes", null),
      ]);
      if (!active) return;
      setCounts({
        playbooks: pb.count ?? 0,
        screenshots: sv.count ?? 0,
        reviewsPending: rev.count ?? 0,
      });
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const tile =
    "flex-1 flex flex-col items-start gap-1 p-3 border border-border/40 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors";

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Trader OS
      </p>
      <div className="flex gap-2">
        <Link to="/playbook" className={tile}>
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-base font-semibold">{counts.playbooks}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Playbooks</span>
        </Link>
        <Link to="/screenshot-vault" className={tile}>
          <Camera className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-base font-semibold">{counts.screenshots}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Screenshots</span>
        </Link>
        <Link to="/review-workspace" className={tile}>
          <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-base font-semibold">{counts.reviewsPending}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">To review</span>
        </Link>
      </div>
    </div>
  );
};

export default TraderOSStrip;
