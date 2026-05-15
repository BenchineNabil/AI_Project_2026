import { useContainerStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Anchor, BarChart2, CheckCircle2, Package, XCircle } from "lucide-react";

/**
 * layout="strip" — horizontal telemetry bar under the 3D viewport (desktop + mobile).
 * layout="card" — classic stacked card (side rails + mobile drawer).
 */
export function StatsPanel({ layout = "card", className }) {
  const {
    utilization,
    totalBoxes,
    placedCount,
    unplacedBoxes,
    container,
    lastPackScore,
    lastStability,
  } = useContainerStore();

  const utilizationPercent = Math.round(utilization * 100);
  const containerVolume = container.length * container.width * container.height;
  const usedVolume = utilization * containerVolume;

  const scoreDisplay = lastPackScore == null ? "—" : lastPackScore.toFixed(2);
  const stabilityDisplay =
    lastStability == null || lastStability.stability_score == null ? "—" : lastStability.stability_score.toFixed(2);
  const stabilityDetail =
    lastStability != null &&
    lastStability.weight_score != null &&
    lastStability.support_score != null &&
    (lastStability.weight_score !== 0 || lastStability.support_score !== 0 || totalBoxes > 0)
      ? `w ${lastStability.weight_score.toFixed(1)} · s ${lastStability.support_score.toFixed(1)}`
      : null;

  if (layout === "strip") {
    return (
      <div
        className={cn(
          "flex flex-col gap-4 rounded-3xl border border-white/[0.09] bg-gradient-to-r from-card/70 via-card/50 to-card/70 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:px-6",
          className
        )}
      >
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px] sm:tracking-[0.22em]">
              Volume load
            </span>
            <span className="font-display text-3xl font-extrabold tabular-nums text-primary sm:text-2xl">
              {utilizationPercent}
              <span className="text-lg font-bold text-muted-foreground sm:text-base">%</span>
            </span>
          </div>
          <Progress value={utilizationPercent} className="h-2 sm:h-1.5" />
          <p className="font-mono text-xs tabular-nums text-muted-foreground sm:text-[11px]">
            {usedVolume.toFixed(2)} / {containerVolume.toFixed(2)} m³
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:flex-nowrap sm:justify-end sm:gap-2">
          <div className="flex min-w-[6rem] flex-1 flex-col rounded-2xl border border-accent/25 bg-accent/10 px-3 py-2.5 sm:min-w-[5.5rem] sm:flex-none sm:py-2">
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-accent sm:text-[9px]">
              <CheckCircle2 className="size-3.5 shrink-0 sm:size-3" />
              Placed
            </span>
            <span className="font-display text-2xl font-bold tabular-nums text-foreground sm:text-xl">{placedCount}</span>
          </div>
          <div className="flex min-w-[6rem] flex-1 flex-col rounded-2xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 sm:min-w-[5.5rem] sm:flex-none sm:py-2">
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-red-300/90 sm:text-[9px]">
              <XCircle className="size-3.5 shrink-0 sm:size-3" />
              Overflow
            </span>
            <span className="font-display text-2xl font-bold tabular-nums text-foreground sm:text-xl">
              {unplacedBoxes.length}
            </span>
          </div>
          <div className="flex min-w-[6rem] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 sm:min-w-[5.5rem] sm:flex-none sm:py-2">
            <Package className="size-4 shrink-0 text-muted-foreground sm:size-4" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[9px]">Queue</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-foreground sm:text-sm">
                {totalBoxes} unit{totalBoxes !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex min-w-[6rem] flex-1 flex-col rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2.5 sm:min-w-[5.5rem] sm:flex-none sm:py-2">
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary sm:text-[9px]">
              <BarChart2 className="size-3.5 shrink-0 sm:size-3" />
              Score
            </span>
            <span className="font-display text-2xl font-bold tabular-nums text-foreground sm:text-xl">{scoreDisplay}</span>
          </div>
          <div className="flex min-w-[6rem] flex-1 flex-col rounded-2xl border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 sm:min-w-[5.5rem] sm:flex-none sm:py-2">
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-200/90 sm:text-[9px]">
              <Anchor className="size-3.5 shrink-0 sm:size-3" />
              Stability
            </span>
            <span className="font-display text-2xl font-bold tabular-nums text-foreground sm:text-xl">{stabilityDisplay}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-white/[0.07]", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm normal-case tracking-normal">
          <Activity className="size-4 text-accent" />
          Telemetry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-widest text-muted-foreground">Utilization</span>
            <span className="font-display text-lg font-bold tabular-nums text-primary">{utilizationPercent}%</span>
          </div>
          <Progress value={utilizationPercent} className="h-2" />
          <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {usedVolume.toFixed(2)} / {containerVolume.toFixed(2)} m³
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-accent/20 bg-accent/10 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-accent">
              <CheckCircle2 className="size-3.5" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Placed</span>
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{placedCount}</div>
          </div>
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-red-300">
              <XCircle className="size-3.5" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Unplaced</span>
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{unplacedBoxes.length}</div>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-primary">
              <BarChart2 className="size-3.5" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Score</span>
            </div>
            <div className="font-display text-2xl font-bold tabular-nums text-foreground">{scoreDisplay}</div>
          </div>
          <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-sky-200">
              <Anchor className="size-3.5" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Stability</span>
            </div>
            <div className="font-display text-2xl font-bold tabular-nums text-foreground">{stabilityDisplay}</div>
            {stabilityDetail ? (
              <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">{stabilityDetail}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 font-mono text-xs text-muted-foreground">
          <Package className="size-3.5 text-foreground/70" />
          <span>
            Total: <span className="font-semibold text-foreground">{totalBoxes}</span> unit
            {totalBoxes !== 1 ? "s" : ""}
          </span>
        </div>

        {lastStability == null && totalBoxes > 0 ? (
          <p className="font-mono text-[10px] leading-relaxed text-amber-200/90">
            Set{" "}
            <span className="text-foreground/90">
              VITE_STABILITY_MIN_OVERLAP_RATIO, VITE_STABILITY_WEIGHT_IMPORTANCE, VITE_STABILITY_SUPPORT_IMPORTANCE
            </span>{" "}
            in <span className="text-foreground/90">environment/.env</span> (values from env ahmed notebook) to compute
            score and stability.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
