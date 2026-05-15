import { motion, useReducedMotion } from "framer-motion";
import { PACK_ALGORITHM_OPTIONS } from "@/lib/packAlgorithmUi";
import { useContainerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const tap = { scale: 0.97 };
const hoverLift = { y: -2, transition: { type: "spring", stiffness: 420, damping: 26 } };

/**
 * Single-select packing algorithm (stored in zustand; wiring to packers is future work).
 */
export function AlgorithmSelector({ className }) {
  const reduceMotion = useReducedMotion();
  const value = useContainerStore((s) => s.selectedPackAlgorithm);
  const onChange = useContainerStore((s) => s.setSelectedPackAlgorithm);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:border-white/10 sm:bg-white/[0.04] sm:px-2 sm:py-1.5",
        className
      )}
      role="radiogroup"
      aria-label="Packing algorithm"
    >
      <span className="shrink-0 px-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/90 sm:text-[10px] sm:tracking-[0.24em]">
        Algorithm
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 sm:flex-nowrap sm:justify-end sm:gap-1">
        {PACK_ALGORITHM_OPTIONS.map((opt) => {
          const selected = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              whileTap={reduceMotion ? undefined : tap}
              whileHover={reduceMotion || selected ? undefined : hoverLift}
              transition={{ type: "spring", stiffness: 520, damping: 32 }}
              onClick={() => onChange(selected ? null : opt.id)}
              title={opt.blurb}
              className={cn(
                "relative min-h-10 min-w-[4.25rem] flex-1 overflow-hidden rounded-xl border px-2 py-2 text-center text-xs font-semibold tracking-tight transition-colors duration-200 sm:min-h-9 sm:min-w-[5.25rem] sm:flex-none sm:px-3 sm:py-1.5 sm:text-[13px]",
                selected
                  ? "border-primary/55 bg-gradient-to-br from-primary/25 via-primary/15 to-orange-500/10 text-foreground shadow-[0_0_0_1px_rgba(255,107,53,0.2),0_8px_28px_-12px_rgba(255,107,53,0.35)]"
                  : "border-transparent bg-white/[0.04] text-muted-foreground hover:border-white/15 hover:bg-white/[0.08] hover:text-foreground"
              )}
            >
              <span className="relative z-[1] block leading-tight">{opt.label}</span>
              {selected ? (
                <motion.span
                  layoutId="algo-glow"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_50%_-20%,oklch(0.72_0.2_35_/_0.25),transparent_65%)]"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
