import { useContainerStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutList, ScanEye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function DimLine({ box }) {
  const text = `${box.length.toFixed(1)}×${box.width.toFixed(1)}×${box.height.toFixed(1)}\u00a0m`;
  return (
    <span
      className="block truncate font-mono text-[11px] leading-tight tracking-tight text-muted-foreground tabular-nums sm:text-xs"
      title={`${box.length.toFixed(1)} × ${box.width.toFixed(1)} × ${box.height.toFixed(1)} m`}
    >
      {text}
    </span>
  );
}

export function BoxListPanel({ className }) {
  const { placedBoxes, unplacedBoxes, boxes, selectedBoxId, setSelectedBoxId, removeBox } =
    useContainerStore();

  return (
    <Card className={cn("flex shrink-0 flex-col border-white/[0.07]", className)}>
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm normal-case tracking-normal">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-transparent ring-1 ring-violet-400/25">
            <LayoutList className="size-4 text-violet-300" />
          </span>
          Manifest ledger
        </CardTitle>
      </CardHeader>
      <CardContent className="shrink-0 pt-0">
        <div className="max-h-72 space-y-2 overflow-y-auto overscroll-y-contain rounded-2xl border border-white/[0.06] bg-black/20 p-2.5 sm:max-h-80 lg:max-h-none">
          {boxes.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Awaiting cargo
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground/90">
                Stage units from the intake panel or hydrate the demo fleet.
              </p>
            </div>
          )}

          {placedBoxes.map((box) => {
            const isSelected = selectedBoxId === box.id;
            return (
              <div
                key={box.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedBoxId(isSelected ? null : box.id);
                  }
                }}
                className={cn(
                  "group cursor-pointer rounded-xl border p-3 text-sm transition-all duration-200",
                  isSelected
                    ? "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_rgba(255,107,53,0.25)]"
                    : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]"
                )}
                onClick={() => setSelectedBoxId(isSelected ? null : box.id)}
              >
                <div className="flex gap-3">
                  <div
                    className="mt-0.5 size-4 shrink-0 rounded-md shadow-inner ring-1 ring-white/20"
                    style={{ backgroundColor: box.color }}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate font-medium leading-tight tracking-tight text-foreground">
                        {box.name}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-90 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoxId(isSelected ? null : box.id);
                          }}
                          aria-label="Focus in viewport"
                        >
                          <ScanEye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 rounded-full text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBox(box.id);
                          }}
                          aria-label="Remove from manifest"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <DimLine box={box} />
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200"
                      >
                        Stowed
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {unplacedBoxes.map((box) => (
            <div
              key={box.id}
              className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm transition-colors hover:bg-red-500/10"
            >
              <div
                className="mt-0.5 size-4 shrink-0 rounded-md opacity-60 ring-1 ring-white/15"
                style={{ backgroundColor: box.color }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate font-medium leading-tight text-foreground">{box.name}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 rounded-full text-destructive hover:text-destructive"
                    onClick={() => removeBox(box.id)}
                    aria-label="Remove"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <DimLine box={box} />
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200"
                  >
                    Hold
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
