import { Coins } from "lucide-react";
import { motion } from "motion/react";
import { springs } from "../../../lib/motion";
import { cn } from "../../../lib/cn";

interface CoinChipProps {
  /** Coin amount shown. */
  coins: number;
  /** Accessible label (e.g. "1 240 OuiCoins"); the bare number is the visible text. */
  label?: string;
  size?: number;
  className?: string;
}

/**
 * The OuiCoins balance pill — shared by the sidebar, shop, tank picker and
 * landing page so the wallet always reads the same. Yellow/ink arcade styling
 * (distinct from the blue/white action buttons).
 */
export const CoinChip = ({
  coins,
  label,
  size = 16,
  className,
}: CoinChipProps) => (
  <motion.span
    // Re-keying on the balance gives every earn/spend a little celebratory
    // pop instead of silently swapping the number.
    key={coins}
    initial={{ scale: 1.3 }}
    animate={{ scale: 1 }}
    transition={springs.bouncy}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-yellow px-2.5 py-0.5 font-display font-bold text-sm leading-5 text-ink tabular-nums shadow-[0_2px_0_rgba(0,0,0,0.15)]",
      className
    )}
    aria-label={label}
    title={label}
  >
    <Coins size={size} strokeWidth={2.75} className="shrink-0" aria-hidden />
    {coins}
  </motion.span>
);
