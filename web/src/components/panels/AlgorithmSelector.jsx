import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PACK_ALGORITHM_OPTIONS } from "@/lib/packAlgorithmUi";
import { fetchPackAlgorithms } from "@/lib/packingApi";
import { useContainerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const tap = { scale: 0.97 };
const hoverLift = { y: -2, transition: { type: "spring", stiffness: 420, damping: 26 } };

/**
 * Single-select packing algorithm (classes loaded from env2.ipynb on each run).
 */
export function AlgorithmSelector({ className }) {
  const reduceMotion = useReducedMotion();
  const value = useContainerStore((s) => s.selectedPackAlgorithm);
  const onChange = useContainerStore((s) => s.setSelectedPackAlgorithm);
  const packingBusy = useContainerStore((s) => s.packingBusy);
  const [options, setOptions] = useState(PACK_ALGORITHM_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    fetchPackAlgorithms()
      .then((algos) => {
        if (cancelled || !Array.isArray(algos) || algos.length === 0) return;
        const fallbackBlurbs = Object.fromEntries(
          PACK_ALGORITHM_OPTIONS.map((o) => [o.id, o.blurb])
        );
        setOptions(
          algos.map((a) => ({
            id: a.id,
            label: a.label,
            blurb: fallbackBlurbs[a.id] ?? `env2 search: ${a.label}`,
          }))
        );
      })
      .catch(() => {
        /* keep static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md",
        className
      )}
      role="radiogroup"
      aria-label="Packing algorithm"
    >
      <span className="shrink-0 px-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/90 sm:text-[10px] sm:tracking-[0.24em]">
        Algorithm
      </span>
      <motion.div
        layout
        className="app-scrollbar -mx-0.5 flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 [scrollbar-gutter:stable]"
      >
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              layout
              whileTap={reduceMotion ? undefined : tap}
              whileHover={reduceMotion || selected ? undefined : hoverLift}
              transition={{ type: "spring", stiffness: 520, damping: 32 }}
              disabled={packingBusy}
              onClick={() => onChange(selected ? null : opt.id)}
              title={opt.blurb}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-xl border px-2.5 py-2 text-center text-[11px] font-semibold leading-tight tracking-tight transition-colors duration-200 sm:px-3 sm:py-1.5 sm:text-xs disabled:pointer-events-none disabled:opacity-45",
                selected
                  ? "border-primary/55 bg-gradient-to-br from-primary/25 via-primary/15 to-orange-500/10 text-foreground shadow-[0_0_0_1px_rgba(255,107,53,0.2),0_8px_28px_-12px_rgba(255,107,53,0.35)]"
                  : "border-transparent bg-white/[0.04] text-muted-foreground hover:border-white/15 hover:bg-white/[0.08] hover:text-foreground"
              )}
            >
              <span className="relative z-[1] block whitespace-nowrap">{opt.label}</span>
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
      </motion.div>
    </div>
  );
}
