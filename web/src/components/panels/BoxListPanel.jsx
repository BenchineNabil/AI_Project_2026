import { useEffect, useRef, useState } from "react";
import { useContainerStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, LayoutList, ListOrdered, ScanEye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n, d = 2) {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : "—";
}

function BoxInfoGrid({ box, placed }) {
  const rows = [
    { label: "Name", value: box.name },
    {
      label: "L × W × H",
      value: `${fmt(box.length, 2)} × ${fmt(box.width, 2)} × ${fmt(box.height, 2)} m`,
      mono: true,
    },
    { label: "Weight", value: `${fmt(box.weight, 1)} kg`, mono: true },
    { label: "Fragile", value: box.fragile ? "yes" : "no" },
  ];
  if (placed && box.posX != null) {
    rows.push({
      label: "Position",
      value: `X ${fmt(box.posX)} · Y ${fmt(box.posY)} · Z ${fmt(box.posZ)}`,
      mono: true,
      accent: true,
    });
  }
  if (!placed && box.reason) {
    rows.push({ label: "Reason", value: box.reason, error: true });
  }

  return (
    <dl className="space-y-1.5">
      {rows.map(({ label, value, mono, accent, error }) => (
        <div key={label}>
          <dt className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {label}
          </dt>
          <dd
            className={cn(
              "mt-0.5 break-words text-[11px] leading-snug",
              mono && "font-mono tabular-nums",
              accent && "text-primary",
              error && "text-red-200/90",
              !accent && !error && "text-foreground"
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DimLine({ box }) {
  return (
    <p className="break-words font-mono text-[10px] leading-snug tabular-nums text-muted-foreground">
      {fmt(box.length, 1)}×{fmt(box.width, 1)}×{fmt(box.height, 1)} m · {fmt(box.weight, 1)} kg
    </p>
  );
}

function DetailedList({ placedInOrder, unplacedBoxes }) {
  return (
    <div className="app-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
      <section className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
          Placed ({placedInOrder.length})
        </p>
        {placedInOrder.length === 0 ? (
          <p className="text-xs text-muted-foreground">No boxes stowed yet.</p>
        ) : (
          <ol className="space-y-2">
            {placedInOrder.map((box, idx) => (
              <li
                key={box.id}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2"
              >
                <p className="mb-1.5 font-mono text-[10px] font-bold text-emerald-200/90">#{idx + 1}</p>
                <BoxInfoGrid box={box} placed />
              </li>
            ))}
          </ol>
        )}
      </section>
      {unplacedBoxes.length > 0 ? (
        <section className="space-y-2 border-t border-white/[0.06] pt-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-red-300/90">
            Unplaced ({unplacedBoxes.length})
          </p>
          <ul className="space-y-2">
            {unplacedBoxes.map((box) => (
              <li
                key={box.id}
                className="rounded-lg border border-red-500/25 bg-red-500/5 px-2.5 py-2"
              >
                <BoxInfoGrid box={box} placed={false} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PlacedRow({ box, orderIdx, isSelected, selectedRef, setSelectedBoxId, removeBox }) {
  const [expanded, setExpanded] = useState(false);
  const showDetails = expanded || isSelected;

  return (
    <div
      ref={isSelected ? selectedRef : undefined}
      className={cn(
        "rounded-xl border p-2.5 transition-colors",
        isSelected
          ? "border-primary/50 bg-primary/10 ring-1 ring-primary/25"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-1 size-3.5 shrink-0 rounded-md ring-1 ring-white/20"
          style={{ backgroundColor: box.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => setSelectedBoxId(isSelected ? null : box.id)}
            >
              <span className="font-mono text-[10px] text-muted-foreground">#{orderIdx + 1}</span>
              <span className="mt-0.5 block break-words text-xs font-medium leading-snug text-foreground">
                {box.name}
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 rounded-full"
                onClick={() => setSelectedBoxId(isSelected ? null : box.id)}
                aria-label="Focus in viewport"
              >
                <ScanEye className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 rounded-full text-destructive hover:text-destructive"
                onClick={() => removeBox(box.id)}
                aria-label="Remove"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-1.5 space-y-1.5">
            <DimLine box={box} />
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0 text-[9px] font-semibold uppercase text-emerald-200"
              >
                Stowed
              </Badge>
              <button
                type="button"
                className="font-mono text-[9px] text-primary/90 underline-offset-2 hover:underline"
                onClick={() => setExpanded((e) => !e)}
              >
                {showDetails ? "Less" : "Details"}
              </button>
            </div>
          </div>
          {showDetails ? (
            <div className="mt-2 rounded-lg border border-white/10 bg-black/35 p-2">
              <BoxInfoGrid box={box} placed />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UnplacedRow({ box, removeBox }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5">
      <div className="flex items-start gap-2">
        <div
          className="mt-1 size-3.5 shrink-0 rounded-md ring-1 ring-white/15"
          style={{ backgroundColor: box.color }}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-1">
            <p className="min-w-0 flex-1 break-words text-xs font-medium leading-snug text-foreground">
              {box.name}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 rounded-full text-destructive hover:text-destructive"
              onClick={() => removeBox(box.id)}
              aria-label="Remove"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <DimLine box={box} />
          <Badge
            variant="secondary"
            className="w-fit border-red-400/40 bg-red-500/20 px-1.5 py-0 text-[9px] font-semibold uppercase text-red-200"
          >
            Unplaced
          </Badge>
          <div className="rounded-lg border border-red-500/15 bg-black/25 p-2">
            <BoxInfoGrid box={box} placed={false} />
          </div>
        </div>
      </div>
    </div>
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
        "flex min-h-0 flex-col gap-0 overflow-hidden py-3 shadow-none hover:shadow-none",
        className
      )}
    >
      <CardHeader className="flex shrink-0 flex-col gap-2 space-y-0 px-3 pb-2 !grid-cols-1">
        <CardTitle className="flex items-center gap-2 text-sm normal-case tracking-normal">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-transparent ring-1 ring-violet-400/25">
            <LayoutList className="size-3.5 text-violet-300" />
          </span>
          <span className="min-w-0 truncate">Placed boxes</span>
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasResults}
          onClick={() => setFullListOpen((o) => !o)}
          className="h-8 w-full min-w-0 justify-center gap-1.5 text-[11px]"
        >
          <ListOrdered className="size-3.5 shrink-0" />
          <span className="truncate">{fullListOpen ? "Hide full list" : "Show full list"}</span>
          {fullListOpen ? (
            <ChevronUp className="size-3.5 shrink-0 opacity-70" />
          ) : (
            <ChevronDown className="size-3.5 shrink-0 opacity-70" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pt-0 pb-3">
        {fullListOpen && hasResults ? (
          <DetailedList placedInOrder={placedInOrder} unplacedBoxes={unplacedBoxes} />
        ) : !fullListOpen ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="app-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain rounded-xl border border-white/[0.06] bg-black/20 p-2">
              {boxes.length === 0 && !hasResults ? (
                <div className="px-2 py-8 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Awaiting cargo
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90">
                    Upload CSV and run Execute deck.
                  </p>
                </div>
              ) : null}

              {placedInOrder.length > 0 ? (
                <p className="px-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
                  Stowed ({placedInOrder.length})
                </p>
              ) : null}

              {placedInOrder.map((box, orderIdx) => (
                <PlacedRow
                  key={box.id}
                  box={box}
                  orderIdx={orderIdx}
                  isSelected={selectedBoxId === box.id}
                  selectedRef={selectedRef}
                  setSelectedBoxId={setSelectedBoxId}
                  removeBox={removeBox}
                />
              ))}
            </div>

            {unplacedBoxes.length > 0 ? (
              <section className="shrink-0 overflow-hidden rounded-xl border border-red-500/35 bg-red-500/[0.08]">
                <p className="border-b border-red-500/20 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">
                  Unplaced ({unplacedBoxes.length})
                </p>
                <div className="app-scrollbar max-h-40 space-y-2 overflow-y-auto p-2">
                  {unplacedBoxes.map((box) => (
                    <UnplacedRow key={box.id} box={box} removeBox={removeBox} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
