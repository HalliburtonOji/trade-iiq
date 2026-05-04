import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Persona = {
  slug: string;
  display_name: string;
  name: string;
  persona_color: string;
  persona_tagline: string;
  persona_kind: string;
};

type Props = {
  active: string;
  onChange: (slug: string) => void;
};

const MentorPersonaSwitcher = ({ active, onChange }: Props) => {
  const [personas, setPersonas] = useState<Persona[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mentor_profile")
        .select("slug, display_name, name, persona_color, persona_tagline, persona_kind")
        .order("slug", { ascending: true });
      setPersonas((data as Persona[]) || []);
    })();
  }, []);

  if (personas.length <= 1) return null;

  const ordered = [...personas].sort((a, b) => (a.slug === "sophos" ? -1 : b.slug === "sophos" ? 1 : 0));

  return (
    <div
      className="rounded-2xl p-3 mb-4 flex items-center gap-2 overflow-x-auto"
      style={{ background: "var(--stoa-surface)", border: "1px solid var(--stoa-rule)" }}
    >
      <div className="stoa-kicker shrink-0 mr-1" style={{ color: "var(--stoa-muted)" }}>MENTOR</div>
      {ordered.map((p) => {
        const isActive = p.slug === active;
        const isSophos = p.slug === "sophos";
        return (
          <button
            key={p.slug}
            onClick={() => onChange(p.slug)}
            className="rounded-xl px-3 py-2 text-left shrink-0 transition-all"
            style={{
              background: isActive ? p.persona_color : "var(--stoa-bg)",
              border: `1px solid ${isActive ? p.persona_color : "var(--stoa-rule)"}`,
              color: isActive ? "var(--stoa-bg)" : "var(--stoa-ink)",
              opacity: !isSophos && !isActive ? 0.85 : 1,
              minWidth: 140,
            }}
            title={p.persona_tagline}
          >
            <div className="stoa-greek" style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--stoa-bg)" : p.persona_color }}>
              {p.name}
            </div>
            <div className="stoa-kicker" style={{ fontSize: 9, marginTop: 2, color: isActive ? "var(--stoa-bg)" : "var(--stoa-muted)" }}>
              {p.display_name} · {p.persona_kind.toUpperCase()}
              {!isSophos && <span style={{ marginLeft: 6 }}>· SOON</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MentorPersonaSwitcher;
