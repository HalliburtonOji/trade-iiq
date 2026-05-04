import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MentorFollowButton = ({ mentorSlug = "sophos" }: { mentorSlug?: string }) => {
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const [{ data: f }, { count: c }] = await Promise.all([
        user ? supabase.from("mentor_followers").select("user_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("mentor_followers").select("user_id", { count: "exact", head: true }),
      ]);
      setFollowing(!!f);
      setCount(c || 0);
      setLoading(false);
    })();
  }, [mentorSlug]);

  const toggle = async () => {
    if (!userId) { toast.error("Sign in to follow Sophos."); return; }
    setLoading(true);
    try {
      if (following) {
        await supabase.from("mentor_followers").delete().eq("user_id", userId);
        setFollowing(false); setCount((n) => Math.max(0, n - 1));
        toast.success("Unfollowed");
      } else {
        const { error } = await supabase.from("mentor_followers")
          .upsert({ user_id: userId, mirror_enabled: false, mirror_risk_pct: 0.5 }, { onConflict: "user_id" });
        if (error) throw error;
        setFollowing(true); setCount((n) => n + 1);
        toast.success("Following Sophos — you'll be pinged when he opens trades.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="rounded-lg px-3 py-2 inline-flex items-center" style={{ border: "1px solid var(--stoa-rule)", color: "var(--stoa-muted)" }}>
      <Loader2 className="h-3 w-3 animate-spin" />
    </div>
  );

  return (
    <button onClick={toggle}
      className="rounded-lg px-4 py-2 inline-flex items-center gap-2 transition-colors"
      style={{
        background: following ? "transparent" : "var(--stoa-accent)",
        border: `1px solid ${following ? "var(--stoa-rule)" : "var(--stoa-accent)"}`,
        color: following ? "var(--stoa-ink)" : "var(--stoa-bg)",
        fontSize: 13, fontWeight: 600,
      }}>
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? "Following" : "Follow"}
      <span className="stoa-mono" style={{ fontSize: 10, opacity: 0.75, marginLeft: 4 }}>· {count}</span>
    </button>
  );
};

export default MentorFollowButton;
