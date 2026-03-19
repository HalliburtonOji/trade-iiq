import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  hoverable?: boolean;
  children: React.ReactNode;
}

const GlassCard = ({ className, hoverable = false, children, ...props }: GlassCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
    className={cn(
      "glass-card p-4",
      hoverable && "glass-card-hover cursor-pointer active:scale-[0.98]",
      className
    )}
    {...props}
  >
    {children}
  </motion.div>
);

export default GlassCard;
