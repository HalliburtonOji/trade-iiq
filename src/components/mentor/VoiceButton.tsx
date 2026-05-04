import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";

type Props = { text: string; label?: string; rate?: number };

const VoiceButton = ({ text, label = "Listen", rate = 0.95 }: Props) => {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported || !text || text.trim().length < 5) return null;

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = () => {
    if (speaking) { stop(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 0.95;
    // Prefer a calm male English voice if available
    const voices = window.speechSynthesis.getVoices();
    const pref = voices.find((v) => /en[-_]?GB/i.test(v.lang) && /male|daniel|oliver/i.test(v.name))
      || voices.find((v) => /en[-_]?GB/i.test(v.lang))
      || voices.find((v) => /en/i.test(v.lang));
    if (pref) u.voice = pref;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  return (
    <button onClick={speak}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors"
      style={{
        background: speaking ? "var(--stoa-accent)" : "transparent",
        color: speaking ? "var(--stoa-bg)" : "var(--stoa-muted)",
        border: `1px solid ${speaking ? "var(--stoa-accent)" : "var(--stoa-rule)"}`,
        fontSize: 11, fontWeight: 600,
      }}
      aria-label={speaking ? "Stop voice" : "Play voice"}>
      {speaking ? <Square size={10} /> : <Volume2 size={10} />}
      {speaking ? "Stop" : label}
    </button>
  );
};

export default VoiceButton;
