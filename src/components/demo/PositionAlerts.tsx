import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface Position {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
}

interface Quote {
  current_price: number;
}

interface Props {
  positions: Position[];
  quotes: Record<string, Quote>;
  balance: number;
}

const PositionAlerts = ({ positions, quotes, balance }: Props) => {
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    positions.forEach((pos) => {
      const price = quotes[pos.symbol]?.current_price;
      if (!price) return;

      const slKey = `sl-${pos.id}`;
      const tpKey = `tp-${pos.id}`;

      // SL proximity (within 1%)
      if (pos.stop_loss) {
        const slDist = Math.abs(price - pos.stop_loss) / price;
        if (slDist < 0.01 && !alerted.current.has(slKey)) {
          alerted.current.add(slKey);
          toast.warning(`⚠️ ${pos.symbol} approaching Stop Loss`, {
            description: `Price: $${price.toFixed(2)} | SL: $${pos.stop_loss}`,
          });
        }
      }

      // TP proximity (within 1%)
      if (pos.take_profit) {
        const tpDist = Math.abs(price - pos.take_profit) / price;
        if (tpDist < 0.01 && !alerted.current.has(tpKey)) {
          alerted.current.add(tpKey);
          toast.success(`🎯 ${pos.symbol} approaching Take Profit`, {
            description: `Price: $${price.toFixed(2)} | TP: $${pos.take_profit}`,
          });
        }
      }
    });
  }, [positions, quotes]);

  // Clear alerts for closed positions
  useEffect(() => {
    const openIds = new Set(positions.map(p => p.id));
    alerted.current.forEach((key) => {
      const id = key.split("-").slice(1).join("-");
      if (!openIds.has(id)) alerted.current.delete(key);
    });
  }, [positions]);

  return null;
};

export default PositionAlerts;
