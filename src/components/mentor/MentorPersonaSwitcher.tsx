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
  const activePersona = ordered.find((p) => p.slug === active);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontSize: 9 }}>
          MENTOR · CHOOSE YOUR VOICE
        </div>
        {activePersona && (
          <div
            className="stoa-greek"
            style={{ fontSize: 10, color: activePersona.persona_color, opacity: 0.9 }}
          >
            {activePersona.persona_tagline}
          </div>
        )}
      </div>
      <div
        className="rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto"
        style={{ background: "var(--stoa-surface)", border: "1px solid var(--stoa-rule)" }}
      >
        {ordered.map((p) => {
          const isActive = p.slug === active;
          const isSophos = p.slug === "sophos";
          return (
            <button
              key={p.slug}
              onClick={() => onChange(p.slug)}
              className="rounded-xl px-3 py-2 text-left shrink-0 transition-all flex items-center gap-2.5"
              style={{
                background: isActive
                  ? `color-mix(in oklab, ${p.persona_color} 14%, var(--stoa-bg))`
                  : "transparent",
                border: `1px solid ${isActive ? p.persona_color : "transparent"}`,
                color: "var(--stoa-ink)",
                opacity: !isSophos && !isActive ? 0.7 : 1,
                flex: "1 1 0",
                minWidth: 130,
              }}
              title={p.persona_tagline}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  background: p.persona_color,
                  boxShadow: isActive ? `0 0 8px ${p.persona_color}` : "none",
                }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="stoa-greek"
                  style={{ fontSize: 13, fontWeight: 600, color: isActive ? p.persona_color : "var(--stoa-ink)", lineHeight: 1.1 }}
                >
                  {p.name}
                </div>
                <div
                  className="stoa-kicker truncate"
                  style={{ fontSize: 9, marginTop: 2, color: "var(--stoa-muted)" }}
                >
                  {p.display_name}
                  {!isSophos && <span style={{ marginLeft: 6, color: p.persona_color, opacity: 0.8 }}>· SOON</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MentorPersonaSwitcher;
