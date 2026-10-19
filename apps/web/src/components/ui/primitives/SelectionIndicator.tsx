import { motion, useReducedMotion } from "motion/react";
import { springs } from "../../../lib/motion";

/** A shared selection frame. Each control owns its own LayoutGroup. */
export function SelectionIndicator({ className }: { className: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      data-selection-indicator=""
      layoutId="selection"
      initial={false}
      transition={reduce ? { duration: 0 } : springs.snappy}
      className={className}
    />
  );
}
