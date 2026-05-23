import { useEffect, useRef, useState } from "react";
import { useContainerStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ListOrdered, ScanEye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n, d = 2) {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : "—";
}

function BoxFields({ box, placed }) {
  const fields = [
    { label: "Dimensions", value: `${fmt(box.length, 2)} × ${fmt(box.width, 2)} × ${fmt(box.height, 2)} m` },
    { label: "Weight", value: `${fmt(box.weight, 1)} kg` },
    { label: "Fragile", value: box.fragile ? "Yes" : "No" },
  ];
  if (placed && box.posX != null) {
    fields.push({
      label: "Position",
      value: `X ${fmt(box.posX)} · Y ${fmt(box.posY)} · Z ${fmt(box.posZ)}`,
      highlight: true,
    });
  }
  if (!placed && box.reason) {
    fields.push({ label: "Reason", value: box.reason, error: true });
  }

  return (
    <ul className="mt-3 space-y-2">
      {fields.map(({ label, value, highlight, error }) => (
        <li key={label} className="block">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <p
            className={cn(
              "mt-0.5 break-words text-xs leading-relaxed",
              highlight && "font-mono tabular-nums text-primary",
              error && "text-red-200",
              !highlight && !error && "text-foreground/95"
            )}
          >
            {value}
          </p>
        </li>
      ))}
    </ul>
  );
}

function BoxCard({
  box,
  orderIdx,
  placed,
  isSelected,
  selectedRef,
  setSelectedBoxId,
  removeBox,
  fullListOpen,
}) {
  return (
    <article
      ref={isSelected ? selectedRef : undefined}
      className={cn(
        "isolate w-full rounded-xl border px-3.5 py-3.5",
        placed
          ? isSelected
            ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
            : "border-white/10 bg-white/[0.03]"
          : "border-red-500/35 bg-red-500/[0.07]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 size-4 shrink-0 rounded-md ring-1 ring-white/20"
          style={{ backgroundColor: box.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {orderIdx != null ? (
                <span className="font-mono text-[11px] font-medium text-muted-foreground">
                  #{orderIdx + 1}
                </span>
              ) : null}
              <h3 className="mt-0.5 break-words text-sm font-semibold leading-snug text-foreground">
                {box.name}
              </h3>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase",
                placed
                  ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-200"
                  : "border-red-400/40 bg-red-500/20 text-red-200"
              )}
            >
              {placed ? "Stowed" : "Unplaced"}
            </Badge>
          </div>

          {fullListOpen ? (
            <BoxFields box={box} placed={placed} />
          ) : (
            <p className="mt-2 font-mono text-xs leading-relaxed tabular-nums text-muted-foreground">
              {fmt(box.length, 1)}×{fmt(box.width, 1)}×{fmt(box.height, 1)} m · {fmt(box.weight, 1)} kg
              {placed && box.posX != null
                ? ` · X${fmt(box.posX, 1)} Y${fmt(box.posY, 1)} Z${fmt(box.posZ, 1)}`
                : null}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3">
            {placed ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setSelectedBoxId(isSelected ? null : box.id)}
              >
                <ScanEye className="size-3.5" />
                {isSelected ? "Unfocus" : "Focus"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs text-destructive hover:text-destructive"
              onClick={() => removeBox(box.id)}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({ children, variant }) {
  return (
    <h4
      className={cn(
        "sticky top-0 z-[2] -mx-1 mb-3 mt-1 border-b px-1 pb-2 pt-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-md",
        variant === "placed"
          ? "border-emerald-500/25 bg-[#0a0f18]/95 text-emerald-300"
          : "border-red-500/25 bg-[#0a0f18]/95 text-red-300"
      )}
    >
      {children}
    </h4>
  );
}

export function BoxListPanel({ className }) {
  const {
    placedBoxes,
    placementSequence,
    unplacedBoxes,
    boxes,
    selectedBoxId,
    setSelectedBoxId,
    removeBox,
  } = useContainerStore();
  const [fullListOpen, setFullListOpen] = useState(false);
  const selectedRef = useRef(null);

  const placedInOrder =
    placementSequence.length > 0 ? placementSequence : placedBoxes;

  useEffect(() => {
    if (selectedBoxId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedBoxId]);

  const hasResults = placedInOrder.length > 0 || unplacedBoxes.length > 0;

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col gap-0 overflow-hidden border-white/[0.07] py-3 shadow-none hover:shadow-none",
        className
      )}
    >
      <CardHeader className="!grid shrink-0 grid-cols-1 gap-2 space-y-0 px-3 pb-3">
        <CardTitle className="text-sm font-semibold normal-case tracking-normal">
          Placed boxes
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasResults}
          onClick={() => setFullListOpen((o) => !o)}
          className="h-9 w-full justify-center gap-1.5 text-xs"
        >
          <ListOrdered className="size-3.5 shrink-0" />
          {fullListOpen ? "Hide full list" : "Show full list"}
          {fullListOpen ? <ChevronUp className="size-3.5 opacity-70" /> : <ChevronDown className="size-3.5 opacity-70" />}
        </Button>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-0">
        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5">
          {boxes.length === 0 && !hasResults ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Awaiting cargo
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Upload CSV and run Execute deck.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {placedInOrder.length > 0 ? (
                <section>
                  <SectionHeading variant="placed">
                    Stowed — {placedInOrder.length}
                  </SectionHeading>
                  <div className="space-y-3">
                    {placedInOrder.map((box, orderIdx) => (
                      <BoxCard
                        key={box.id}
                        box={box}
                        orderIdx={orderIdx}
                        placed
                        fullListOpen={fullListOpen}
                        isSelected={selectedBoxId === box.id}
                        selectedRef={selectedRef}
                        setSelectedBoxId={setSelectedBoxId}
                        removeBox={removeBox}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {unplacedBoxes.length > 0 ? (
                <section>
                  <SectionHeading variant="unplaced">
                    Unplaced — {unplacedBoxes.length}
                  </SectionHeading>
                  <div className="space-y-3">
                    {unplacedBoxes.map((box) => (
                      <BoxCard
                        key={box.id}
                        box={box}
                        placed={false}
                        fullListOpen={fullListOpen}
                        isSelected={false}
                        selectedRef={selectedRef}
                        setSelectedBoxId={setSelectedBoxId}
                        removeBox={removeBox}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
