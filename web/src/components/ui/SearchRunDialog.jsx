import { motion, useReducedMotion } from "framer-motion";
import { Cuboid, X } from "lucide-react";
import { useContainerStore } from "@/lib/store";
import { PACK_ALGORITHM_OPTIONS } from "@/lib/packAlgorithmUi";
import { Button } from "@/components/ui/button";

const ALGO_LABEL = Object.fromEntries(PACK_ALGORITHM_OPTIONS.map((o) => [o.id, o.label]));

export function SearchRunDialog() {
  const reduceMotion = useReducedMotion();
  const open = useContainerStore((s) => s.searchRunDialogOpen);
  const busy = useContainerStore((s) => s.packingBusy);
  const phase = useContainerStore((s) => s.packingPhase);
  const config = useContainerStore((s) => s.lastSearchConfig);
  const algorithm = useContainerStore((s) => s.selectedPackAlgorithm);
  const close = useContainerStore((s) => s.closeSearchRunDialog);

  if (!open) return null;

  const algoName = algorithm ? ALGO_LABEL[algorithm] ?? algorithm : "Search";
  const params = config?.parameters ?? [];

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-3 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-run-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1628] to-[#080c14] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] sm:max-w-xl"
        initial={reduceMotion ? false : { y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <motion.div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              env2.ipynb
            </p>
            <h2 id="search-run-title" className="font-display text-lg font-bold tracking-tight text-foreground">
              {busy ? "Running search…" : "Search parameters"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {config?.className ?? algoName}
              {busy ? ` — ${phase || "Python packer"}` : " — values loaded from env2"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full"
            onClick={close}
            disabled={busy}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </motion.div>

        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5">
          {busy && params.length === 0 ? (
            <motion.div
              className="flex flex-col items-center gap-4 py-8"
              animate={reduceMotion ? false : { opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <Cuboid className="size-10 text-primary" />
              <p className="text-center font-mono text-xs text-muted-foreground">
                Instantiating {config?.className ?? "packer"} from env2…
              </p>
            </motion.div>
          ) : null}

          {config?.containerCm ? (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Container (env2 cm)
              </p>
              <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                L {config.containerCm.length} × W {config.containerCm.width} × H{" "}
                {config.containerCm.height}
                {config.boxCount != null ? ` · ${config.boxCount} boxes` : ""}
              </p>
            </div>
          ) : null}

          {params.length > 0 ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3 font-semibold">Parameter</th>
                  <th className="pb-2 font-semibold">Value (env2)</th>
                </tr>
              </thead>
              <tbody>
                {params.map((row) => (
                  <tr key={row.name} className="border-b border-white/[0.06] last:border-0">
                    <td className="py-2.5 pr-3 align-top text-muted-foreground">{row.label}</td>
                    <td className="py-2.5 align-top font-mono text-xs font-medium tabular-nums text-foreground">
                      {String(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !busy ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No parameters reported.</p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/10 px-4 py-3 sm:px-5">
          {busy ? (
            <motion.div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              initial={false}
            >
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-orange-400 to-amber-300"
                animate={reduceMotion ? false : { x: ["-100%", "280%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          ) : (
            <Button type="button" className="w-full" onClick={close}>
              Close
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
