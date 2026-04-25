import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReactNode } from "react";
import { StoaDiagram, type DiagramSpec } from "./StoaDiagram";

const ALERT_RE = /^\s*\[!(TAKEAWAY|EXAMPLE|REMEMBER|WARNING)\]\s*/i;
const DIAGRAM_RE = /\[!DIAGRAM:([a-zA-Z0-9_-]+)\]/;
type AlertKind = "takeaway" | "example" | "remember" | "warning";

const ALERT_META: Record<AlertKind, { label: string; greek: string; accent: string }> = {
  takeaway: { label: "KEY TAKEAWAY", greek: "ΓΝΩΜΗ", accent: "var(--stoa-accent)" },
  example:  { label: "EXAMPLE",      greek: "ΠΑΡΑΔΕΙΓΜΑ", accent: "var(--stoa-muted)" },
  remember: { label: "REMEMBER",     greek: "ΜΝΗΜΗ", accent: "var(--stoa-accent)" },
  warning:  { label: "WARNING",      greek: "ΦΥΛΑΞΟΥ", accent: "hsl(var(--verdict-avoid))" },
};

function extractFirstText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return extractFirstText(node[0]);
  if (node.props?.children) return extractFirstText(node.props.children);
  return "";
}

function stripAlertPrefix(arr: any): ReactNode {
  const list = Array.isArray(arr) ? [...arr] : [arr];
  const walk = (n: any): any => {
    if (typeof n === "string") return n.replace(ALERT_RE, "");
    if (Array.isArray(n)) {
      const copy = [...n];
      for (let i = 0; i < copy.length; i++) {
        const before = extractFirstText(copy[i]);
        copy[i] = walk(copy[i]);
        if (before && ALERT_RE.test(before)) break;
      }
      return copy;
    }
    if (n?.props?.children !== undefined) {
      return { ...n, props: { ...n.props, children: walk(n.props.children) } };
    }
    return n;
  };
  return walk(list);
}

function detectAlert(children: ReactNode): { kind: AlertKind | null; rest: ReactNode } {
  const text = extractFirstText(children);
  const m = text.match(ALERT_RE);
  if (!m) return { kind: null, rest: children };
  return { kind: m[1].toLowerCase() as AlertKind, rest: stripAlertPrefix(children) };
}

export default function StoaMarkdown({
  source,
  diagrams = [],
}: {
  source: string | null | undefined;
  diagrams?: DiagramSpec[];
}) {
  if (!source) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h2 className="stoa-display" style={{ fontSize: 26, fontWeight: 600, color: "var(--stoa-ink)", marginTop: 28, marginBottom: 12 }}>
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h3 className="stoa-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--stoa-ink)", marginTop: 24, marginBottom: 10, borderBottom: "1px solid var(--stoa-rule)", paddingBottom: 6 }}>
            {children}
          </h3>
        ),
        h3: ({ children }) => (
          <h4 className="stoa-display" style={{ fontSize: 16, fontWeight: 600, color: "var(--stoa-accent)", marginTop: 20, marginBottom: 8, letterSpacing: "0.02em" }}>
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p style={{ fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.7, color: "var(--stoa-ink)", margin: "12px 0" }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong style={{ color: "var(--stoa-ink)", fontWeight: 700 }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ fontStyle: "italic", color: "var(--stoa-ink)" }}>{children}</em>
        ),
        ul: ({ children }) => (
          <ul style={{ fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.7, color: "var(--stoa-ink)", paddingLeft: 22, margin: "10px 0", listStyle: "disc" }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.7, color: "var(--stoa-ink)", paddingLeft: 22, margin: "10px 0", listStyle: "decimal" }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: 4 }}>{children}</li>
        ),
        code: ({ children }) => (
          <code className="stoa-mono" style={{ background: "var(--stoa-shine)", border: "1px solid var(--stoa-rule)", borderRadius: 2, padding: "1px 6px", fontSize: 13, color: "var(--stoa-ink)" }}>
            {children}
          </code>
        ),
        hr: () => (
          <hr style={{ border: "none", borderTop: "1px solid var(--stoa-rule)", margin: "20px 0" }} />
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--stoa-accent)", textDecoration: "underline" }}>
            {children}
          </a>
        ),
        blockquote: ({ children }) => {
          // Diagram embed: > [!DIAGRAM:d1]
          const fullText = extractFirstText(children as ReactNode);
          const dm = fullText.match(DIAGRAM_RE);
          if (dm) {
            const spec = diagrams.find((d) => d.id === dm[1]);
            if (spec) return <StoaDiagram spec={spec} />;
            return (
              <div className="stoa-kicker" style={{ color: "var(--stoa-muted)", fontStyle: "italic", margin: "12px 0" }}>
                [diagram {dm[1]} missing]
              </div>
            );
          }
          const { kind, rest } = detectAlert(children as ReactNode);
          if (kind) {
            const meta = ALERT_META[kind];
            return (
              <aside
                style={{
                  background: "var(--stoa-shine)",
                  border: "1px solid var(--stoa-rule)",
                  borderLeft: `3px solid ${meta.accent}`,
                  borderRadius: 2,
                  padding: "12px 16px",
                  margin: "16px 0",
                }}
              >
                <div className="stoa-kicker" style={{ color: meta.accent, marginBottom: 6 }}>
                  {meta.label} · {meta.greek}
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 15, lineHeight: 1.6, color: "var(--stoa-ink)" }}>
                  {rest}
                </div>
              </aside>
            );
          }
          return (
            <blockquote style={{ borderLeft: "3px solid var(--stoa-rule)", paddingLeft: 14, margin: "14px 0", fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--stoa-muted)" }}>
              {children}
            </blockquote>
          );
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
