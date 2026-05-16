import { lazy, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ContainerPanel } from "@/components/panels/ContainerPanel";
import { CsvCargoPanel } from "@/components/panels/CsvCargoPanel";
import { StatsPanel } from "@/components/panels/StatsPanel";
import { BoxListPanel } from "@/components/panels/BoxListPanel";
import { ViewControlsPanel } from "@/components/panels/ViewControlsPanel";
import { AlgorithmSelector } from "@/components/panels/AlgorithmSelector";
import { Button } from "@/components/ui/button";
import { useContainerStore } from "@/lib/store";
import { canExecuteCsvImport } from "@/lib/csvBoxParser";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchRunDialog } from "@/components/ui/SearchRunDialog";
import { Cuboid, Menu, Play } from "lucide-react";

const Scene = lazy(() => import("@/components/scene/Scene"));

const spring = { type: "spring", stiffness: 420, damping: 34 };

function SceneLoading() {
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0 } : spring;
  return (
    <motion.div className="relative flex h-full min-h-[200px] w-full flex-col items-center justify-center overflow-hidden rounded-[inherit]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(0.55_0.2_35_/_0.15),transparent_55%)]" />
      <motion.div
        className="relative z-[1] flex flex-col items-center gap-4"
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={t}
      >
        <Cuboid className="size-8 text-primary" />
        <p className="font-mono text-xs text-muted-foreground">Loading 3D viewport…</p>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const executeCsvImport = useContainerStore((s) => s.executeCsvImport);
  const canRunDeck = useContainerStore(canExecuteCsvImport);
  const reduceMotion = useReducedMotion();
  const pageSpring = reduceMotion ? { duration: 0 } : spring;

  return (
    <motion.div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <SearchRunDialog />
      <motion.header
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={pageSpring}
        className="relative z-20 shrink-0 border-b border-white/[0.06] px-3 py-2 sm:px-4 sm:py-2.5"
      >
        <div className="mx-auto flex max-w-[2200px] flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0c121f] shadow-lg ring-1 ring-white/10 sm:size-11">
                <img src="/logo.svg" alt="" className="size-full p-1.5" width={44} height={44} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-base font-extrabold tracking-tight sm:text-lg">3D Container Project</h1>
                <p className="font-mono text-[10px] text-muted-foreground">Packing · env2</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!canRunDeck}
                onClick={() => void executeCsvImport()}
                className="min-h-9 gap-1.5 px-3 shadow-md disabled:opacity-45"
              >
                <Play className="size-4 shrink-0 fill-current" aria-hidden />
                <span className="hidden sm:inline">Execute deck</span>
                <span className="sm:hidden">Run</span>
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="size-9 shrink-0 lg:hidden" aria-label="Open panels">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex w-[min(100vw-0.5rem,24rem)] flex-col border-l border-white/10 p-0"
                >
                  <div className="shrink-0 border-b border-white/10 px-4 py-3">
                    <SheetHeader className="p-0">
                      <SheetTitle className="font-display text-base normal-case">Controls</SheetTitle>
                    </SheetHeader>
                  </div>
                  <div className="app-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                    <ContainerPanel />
                    <CsvCargoPanel />
                    <ViewControlsPanel />
                    <StatsPanel layout="card" />
                    <BoxListPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <AlgorithmSelector className="w-full min-w-0" />
        </div>
      </motion.header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[2200px] flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)_minmax(0,15rem)] lg:gap-0 xl:grid-cols-[minmax(0,14.5rem)_minmax(0,1fr)_minmax(0,16.5rem)]">
        <motion.aside
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={pageSpring}
          className="hidden min-h-0 flex-col overflow-hidden border-white/10 lg:flex lg:border-r lg:px-3 lg:py-3"
        >
          <p className="mb-2 shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Parameters
          </p>
          <div className="app-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
            <ContainerPanel />
            <CsvCargoPanel />
            <ViewControlsPanel />
          </div>
        </motion.aside>

        <motion.main
          initial={false}
          animate={{ opacity: 1 }}
          transition={pageSpring}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3 lg:p-3"
        >
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-[#0c121f] via-[#080c14] to-[#05070c] shadow-2xl lg:rounded-[1.5rem]">
            <div className="pointer-events-none absolute left-3 top-3 z-[2] font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 sm:left-4 sm:top-4">
              Deck viewport
            </div>
            <div className="relative z-[1] min-h-0 flex-1 overflow-hidden rounded-[inherit] p-1 sm:p-1.5">
              <Suspense fallback={<SceneLoading />}>
                <Scene />
              </Suspense>
            </div>
          </div>

          <StatsPanel layout="strip" className="mt-2 shrink-0 lg:mt-2.5" />
        </motion.main>

        <motion.aside
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={pageSpring}
          className="hidden min-h-0 flex-col overflow-hidden border-white/10 lg:flex lg:border-l lg:px-3 lg:py-3"
        >
          <p className="mb-2 shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Manifest
          </p>
          <BoxListPanel className="min-h-0 flex-1" />
        </motion.aside>
      </div>
    </motion.div>
  );
}

