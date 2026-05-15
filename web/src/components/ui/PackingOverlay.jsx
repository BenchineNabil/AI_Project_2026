import { motion, useReducedMotion } from "framer-motion";
import { Cuboid } from "lucide-react";
import { useContainerStore } from "@/lib/store";
import { PACK_ALGORITHM_OPTIONS } from "@/lib/packAlgorithmUi";

const ALGO_LABEL = Object.fromEntries(PACK_ALGORITHM_OPTIONS.map((o) => [o.id, o.label]));

export function PackingOverlay() {
  const reduceMotion = useReducedMotion();
  const busy = useContainerStore((s) => s.packingBusy);
  const phase = useContainerStore((s) => s.packingPhase);
  const algorithm = useContainerStore((s) => s.selectedPackAlgorithm);

  if (!busy) return null;

  const algoName = algorithm ? ALGO_LABEL[algorithm] ?? algorithm : "Packer";

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
    >
      <motion.div
        className="relative mx-4 flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0f1628] to-[#080c14] px-8 py-10 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
        initial={reduceMotion ? false : { scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.55 0.2 35 / 0.35), transparent 70%)",
          }}
        />

        <motion.div
          className="relative flex size-20 items-center justify-center"
          animate={reduceMotion ? false : { rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary/40" />
          <motion.span
            className="absolute inset-1 rounded-xl border-2 border-accent/50 border-t-transparent"
            animate={reduceMotion ? false : { rotate: -360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="absolute inset-3 rounded-lg bg-primary/20"
            animate={reduceMotion ? false : { scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <Cuboid className="relative z-[1] size-8 text-primary" />
        </motion.div>

        <motion.p
          className="relative text-center font-display text-sm font-bold uppercase tracking-[0.22em] text-foreground"
          animate={reduceMotion ? false : { opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {algoName}
        </motion.p>

        <p className="relative text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
          {phase || "Executing env2.ipynb via Python…"}
        </p>

        <motion.div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          initial={false}
        >
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-orange-400 to-amber-300"
            animate={reduceMotion ? false : { x: ["-100%", "280%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <p className="relative text-center text-[10px] text-muted-foreground/80">
          Search in progress — controls are disabled until results return.
        </p>
      </motion.div>
    </motion.div>
  );
}
