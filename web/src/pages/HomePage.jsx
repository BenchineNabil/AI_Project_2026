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
import { Cuboid, Loader2, Menu, Play } from "lucide-react";

const Scene = lazy(() => import("@/components/scene/Scene"));

const spring = { type: "spring", stiffness: 420, damping: 34 };

function SceneLoading() {
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? { duration: 0 } : spring;
  return (
    <div className="relative flex h-full min-h-[280px] w-full flex-col items-center justify-center overflow-hidden rounded-[inherit]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(0.55_0.2_35_/_0.15),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(-45deg,transparent,transparent_8px,rgba(255,255,255,0.04)_8px,rgba(255,255,255,0.04)_9px)]" />
      <motion.div
        className="relative z-[1] flex flex-col items-center gap-5"
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={t}
      >
        <div className="relative size-14">
          <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-primary/30"
            animate={reduceMotion ? false : { rotate: 360 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="absolute inset-1 rounded-xl border border-accent/40 border-t-transparent"
            animate={reduceMotion ? false : { rotate: -360 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
          <Cuboid className="absolute inset-0 m-auto size-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-muted-foreground">
            Rasterizing hold
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground/80">WebGL / Three bridge</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  const executeCsvImport = useContainerStore((s) => s.executeCsvImport);
  const canRunDeck = useContainerStore(canExecuteCsvImport);
  const packingBusy = useContainerStore((s) => s.packingBusy);
  const reduceMotion = useReducedMotion();
  const pageSpring = reduceMotion ? { duration: 0 } : spring;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {packingBusy ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center bg-black/55 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#0a101c]/95 px-10 py-8 shadow-xl">
            <Loader2 className="size-10 shrink-0 animate-spin text-primary" aria-hidden />
            <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Running packer…
            </p>
            <p className="max-w-[16rem] text-center text-[11px] leading-relaxed text-muted-foreground/90">
              Optimizing layout — this may take a moment for genetic / SA runs.
            </p>
          </div>
        </div>
      ) : null}
      <motion.header
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={pageSpring}
        className="relative z-20 shrink-0 px-4 py-3 sm:px-5"
      >
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-x-3 gap-y-3 rounded-2xl border border-white/[0.1] bg-gradient-to-r from-card/55 via-card/40 to-card/55 px-3 py-2.5 shadow-[0_12px_48px_-20px_rgba(0,0,0,0.82)] backdrop-blur-2xl sm:gap-y-2 sm:px-5 sm:py-3">
          <div className="flex min-w-0 flex-1 basis-[min(100%,14rem)] items-center gap-3 sm:basis-auto sm:flex-initial">
            <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/90 via-orange-500 to-amber-600 text-primary-foreground shadow-[0_0_28px_-4px_oklch(0.55_0.22_35_/_0.55)] sm:size-12">
              <Cuboid className="size-5 sm:size-6" />
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent shadow-[0_0_12px_oklch(0.78_0.12_195_/_0.8)]" />
            </div>
            <div className="min-w-0 text-balance">
              <h1 className="font-display text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                VoxelBerth
              </h1>
              <p className="font-mono text-[10px] leading-snug text-muted-foreground sm:text-[11px] sm:leading-normal">
                <span className="sm:hidden">Load deck · 3D packing</span>
                <span className="hidden sm:inline">Stowage console · volumetric load deck</span>
              </p>
            </div>
          </div>

          <AlgorithmSelector className="basis-full sm:basis-auto sm:max-w-[min(100%,28rem)] lg:max-w-[min(100%,34rem)]" />

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!canRunDeck}
              onClick={() => void executeCsvImport()}
              className="min-h-10 gap-2 px-4 shadow-[0_8px_24px_-12px_rgba(255,107,53,0.5)] disabled:opacity-45"
            >
              {packingBusy ? (
                <Loader2 className="size-4 shrink-0 animate-spin fill-none" aria-hidden />
              ) : (
                <Play className="size-4 shrink-0 fill-current" aria-hidden />
              )}
              <span className="hidden sm:inline">Execute deck</span>
              <span className="sm:hidden">Run</span>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="size-10 shrink-0 lg:hidden" aria-label="Open controls">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[min(100vw-0.75rem,26rem)] max-w-[min(26rem,calc(100vw-0.75rem))] flex-col border-l border-white/10 p-0 sm:w-[min(100%,26rem)]"
              >
                <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
                  <SheetHeader className="space-y-1.5 p-0">
                    <SheetTitle className="font-display flex items-center gap-2 text-lg normal-case tracking-tight sm:text-xl">
                      <Cuboid className="size-5 shrink-0 text-primary" />
                      Bridge panels
                    </SheetTitle>
                    <p className="text-left text-sm leading-relaxed text-muted-foreground sm:text-[13px]">
                      Vessel, cargo, view options, telemetry, and manifest — optimized for small screens.
                    </p>
                  </SheetHeader>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 sm:py-5 [scrollbar-gutter:stable]">
                    <ContainerPanel />
                    <CsvCargoPanel />
                    <ViewControlsPanel />
                    <StatsPanel layout="card" />
                    <BoxListPanel />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>

      <p className="mx-auto max-w-[1920px] px-4 pb-1 text-xs leading-relaxed text-muted-foreground lg:hidden">
        <span className="font-medium text-foreground/90">Workflow</span> — Upload CSV in{" "}
        <span className="text-foreground/80">Cargo intake</span>, set max boxes + algorithm, then{" "}
        <span className="text-foreground/80">Run</span> or <span className="text-foreground/80">Execute deck</span>. Uses a{" "}
        <span className="text-foreground/80">random subset</span> of N staged rows each run. Use
        the <Menu className="inline size-3.5 align-text-bottom text-foreground/70" aria-hidden /> menu for panels.
      </p>

      <div className="relative z-10 mx-auto flex min-h-0 min-w-0 w-full max-w-[1920px] flex-1 flex-col gap-4 px-4 pb-4 pt-0 sm:gap-4 sm:px-5 sm:pb-5 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,19.5rem)_minmax(0,1fr)_minmax(0,21rem)] lg:items-stretch lg:gap-6 lg:px-6 lg:pb-6 xl:grid-cols-[minmax(0,20.5rem)_minmax(0,1fr)_minmax(0,23rem)] 2xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,25rem)]">
        <motion.aside
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...pageSpring, delay: reduceMotion ? 0 : 0.04 }}
          className="hidden min-h-0 min-w-0 flex-col overflow-hidden border-white/10 lg:flex lg:border-r lg:pr-3 xl:pr-4"
        >
          <p className="shrink-0 pr-1 pt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground/90">
            Load parameters
          </p>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]">
            <div className="flex flex-col gap-4 pb-4">
              <ContainerPanel />
              <CsvCargoPanel />
              <ViewControlsPanel />
            </div>
          </div>
        </motion.aside>

        <motion.main
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...pageSpring, delay: reduceMotion ? 0 : 0.06 }}
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:gap-3 lg:overflow-hidden"
        >
          <StatsPanel layout="strip" className="order-2 shrink-0 lg:order-none" />

          <div className="relative order-1 flex min-h-[min(260px,44svh)] flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-[#0c121f] via-[#080c14] to-[#05070c] p-1.5 shadow-[0_24px_80px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] sm:min-h-[min(320px,48svh)] sm:p-1 sm:rounded-[1.75rem] lg:order-none lg:min-h-0 lg:rounded-[2rem]">
            <span className="pointer-events-none absolute left-4 top-4 z-[2] hidden font-mono text-[10px] uppercase tracking-[0.25em] text-white/25 lg:left-5 lg:top-5 lg:block">
              Deck viewport
            </span>
            <span className="pointer-events-none absolute right-4 bottom-4 z-[2] hidden font-mono text-[10px] uppercase tracking-[0.25em] text-white/20 lg:right-6 lg:bottom-5 lg:block">
              Orbit · pinch / scroll zoom
            </span>
            <div className="relative z-[1] flex min-h-0 flex-1 overflow-hidden rounded-[1.35rem] ring-1 ring-inset ring-white/[0.04] lg:rounded-[1.65rem]">
              <Suspense fallback={<SceneLoading />}>
                <Scene />
              </Suspense>
            </div>
          </div>
        </motion.main>

        <motion.aside
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...pageSpring, delay: reduceMotion ? 0 : 0.08 }}
          className="hidden min-h-0 min-w-0 flex-col overflow-hidden border-white/10 lg:flex lg:border-l lg:pl-3 xl:pl-4"
        >
          <p className="shrink-0 pl-1 pt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground/90">
            Live manifest
          </p>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pl-1 [scrollbar-gutter:stable]">
            <BoxListPanel className="shrink-0 pb-4" />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

