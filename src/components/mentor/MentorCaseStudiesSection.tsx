// MentorCaseStudiesSection — shows latest Sophos case studies on /learn

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MentorCaseStudyCard from "@/components/mentor/MentorCaseStudyCard";

const MentorCaseStudiesSection = () => {
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("mentor_case_studies")
      .select("id,symbol,direction,outcome,r_multiple,title,hook,tags,greek_phrase,created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setStudies(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (studies.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="stoa-kicker" style={{ color: "var(--stoa-accent)" }}>SOPHOS · ΑΥΤΟΨΙΑ</div>
          <h2 className="stoa-display" style={{ fontSize: 22, fontWeight: 600, color: "var(--stoa-ink)" }}>
            Live Case Studies
          </h2>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 13, fontStyle: "italic", color: "var(--stoa-muted)", marginTop: 2 }}>
            Lessons written from Sophos's most recent closed trades.
          </p>
        </div>
        <Link to="/mentor" className="stoa-mono text-xs" style={{ color: "var(--stoa-accent)" }}>
          See the trader →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {studies.map((cs) => <MentorCaseStudyCard key={cs.id} cs={cs} />)}
      </div>
    </section>
  );
};

export default MentorCaseStudiesSection;
