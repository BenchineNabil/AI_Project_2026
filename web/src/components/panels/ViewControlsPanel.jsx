import { useContainerStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clapperboard, Layers2, SlidersHorizontal, Square, SkipForward } from "lucide-react";

export function ViewControlsPanel() {
  const {
    explodedView,
    toggleExplodedView,
    placementSequence,
    simulationPlaying,
    simulationActive,
    simulationIndex,
    startPlacementSimulation,
    stopPlacementSimulation,
    skipPlacementSimulation,
  } = useContainerStore();

  const canSimulate = placementSequence.length > 0;
  const total = placementSequence.length;

  return (
    <Card className="shrink-0 border-white/[0.07]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm normal-case tracking-normal">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
          </span>
          Deck optics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          variant={explodedView ? "default" : "outline"}
          size="sm"
          onClick={toggleExplodedView}
          className="h-10 w-full min-w-0 justify-center gap-1.5 text-xs"
        >
          <Layers2 className="size-3.5 shrink-0" />
          Burst view
        </Button>

        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Placement replay
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Empty container, then boxes appear in search order ({total} stowed).
          </p>
          {simulationActive ? (
            <p className="font-mono text-[10px] tabular-nums text-primary">
              Showing {simulationIndex} / {total}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {!simulationPlaying ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!canSimulate}
                onClick={startPlacementSimulation}
                className="h-10 w-full min-w-0 justify-center gap-1.5 text-xs"
              >
                <Clapperboard className="size-3.5 shrink-0" />
                Play placement
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={stopPlacementSimulation}
                className="h-10 w-full min-w-0 justify-center gap-1.5 text-xs"
              >
                <Square className="size-3.5 shrink-0" />
                Stop
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canSimulate || (!simulationActive && simulationIndex >= total)}
              onClick={skipPlacementSimulation}
              className="h-10 w-full min-w-0 justify-center gap-1.5 text-xs"
            >
              <SkipForward className="size-3.5 shrink-0" />
              Show all now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
