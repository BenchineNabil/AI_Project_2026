import { useContainerStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers2, SlidersHorizontal } from "lucide-react";

export function ViewControlsPanel() {
  const { explodedView, toggleExplodedView } = useContainerStore();

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
      <CardContent>
        <Button
          type="button"
          variant={explodedView ? "default" : "outline"}
          size="sm"
          onClick={toggleExplodedView}
          className="h-9 w-full justify-center gap-1.5 text-xs"
        >
          <Layers2 className="size-3.5" />
          Burst
        </Button>
      </CardContent>
    </Card>
  );
}
