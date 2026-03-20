import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, TrendingUp, AlertTriangle, Brain, Target, Zap } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { type CoachingCard } from "@/hooks/use-coaching-engine";

interface Props {
  cards: CoachingCard[];
  onSelectLesson?: (id: string) => void;
  onNavigate?: (route: string) => void;
  compact?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  strength: <TrendingUp className="h-4 w-4" />,
  weakness: <AlertTriangle className="h-4 w-4" />,
  pattern: <Target className="h-4 w-4" />,
  risk: <Shield className="h-4 w-4" />,
  process: <Brain className="h-4 w-4" />,
  confidence: <Sparkles className="h-4 w-4" />,
  strategy_fit: <Zap className="h-4 w-4" />,
  screenshot: <Target className="h-4 w-4" />,
  rule_break: <AlertTriangle className="h-4 w-4" />,
  improvement: <TrendingUp className="h-4 w-4" />,
  milestone: <Sparkles className="h-4 w-4" />,
};

const typeBorderColors: Record<string, string> = {
  strength: "border-verdict-buy/20",
  weakness: "border-verdict-avoid/20",
  pattern: "border-amber-500/20",
  risk: "border-verdict-avoid/15",
  process: "border-amber-500/15",
  confidence: "border-amber-400/20",
  strategy_fit: "border-primary/20",
  screenshot: "border-accent/15",
  rule_break: "border-verdict-avoid/25",
  improvement: "border-primary/15",
  milestone: "border-primary/10",
};

const CoachingCardsComponent = ({ cards, onSelectLesson, onNavigate, compact }: Props) => {
  if (cards.length === 0) return null;

  const handleCardClick = (card: CoachingCard) => {
    if (card.cta?.lessonId && onSelectLesson) onSelectLesson(card.cta.lessonId);
    else if (card.cta?.route && onNavigate) onNavigate(card.cta.route);
  };

  return (
    <div className="flex flex-col gap-2">
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <GlassCard
            hoverable={!!card.cta}
            onClick={() => handleCardClick(card)}
            className={typeBorderColors[card.type] || ""}
          >
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-xl bg-muted/20 ${card.color} shrink-0`}>
                {typeIcons[card.type] || <Sparkles className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-lg">{card.icon}</span>
                  <p className={`text-[10px] font-semibold ${card.color}`}>{card.relevanceLabel}</p>
                </div>
                <p className="text-sm font-bold">{card.title}</p>
                {!compact && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
                )}
                {!compact && card.why && (
                  <p className="text-[10px] text-foreground/60 mt-1 italic">{card.why}</p>
                )}
                {card.cta && (
                  <div className={`flex items-center gap-1 mt-2 ${card.color} text-xs font-medium`}>
                    {card.cta.label} <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default CoachingCardsComponent;
