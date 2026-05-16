import { useEffect, useState } from "react";
import { useContainerStore } from "@/lib/store";
import { CONTAINER_PRESETS } from "@/lib/packing/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ship } from "lucide-react";

function dimsToDraft(container) {
  return {
    length: String(container.length),
    width: String(container.width),
    height: String(container.height),
  };
}

function parseDim(raw) {
  const n = parseFloat(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ContainerPanel() {
  const { container, containerPreset, setContainerPreset, updateContainer } = useContainerStore();
  const [draft, setDraft] = useState(() => dimsToDraft(container));
  const volumeM3 = container.length * container.width * container.height;

  useEffect(() => {
    setDraft(dimsToDraft(container));
  }, [container.length, container.width, container.height, containerPreset]);

  const commitField = (key, raw) => {
    const n = parseDim(raw);
    if (n == null) {
      setDraft(dimsToDraft(container));
      return;
    }
    if (Math.abs(n - container[key]) < 1e-6) return;
    updateContainer({ [key]: n });
  };

  const dimFields = [
    { key: "length", label: "Length (m)" },
    { key: "width", label: "Width (m)" },
    { key: "height", label: "Height (m)" },
  ];

  return (
    <Card className="shrink-0 border-white/[0.07]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm normal-case tracking-normal">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-primary/20 ring-1 ring-white/10">
            <Ship className="size-4 text-accent" />
          </span>
          Vessel spec
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Standard size
          </Label>
          <Select value={containerPreset} onValueChange={setContainerPreset}>
            <SelectTrigger className="h-10 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(CONTAINER_PRESETS).map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-3">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">
            Dimensions (m)
          </p>
          <div className="space-y-2.5">
            {dimFields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  onBlur={(e) => commitField(key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="input-no-spinner h-11 w-full min-w-0 border-white/15 bg-black/40 px-3 text-base font-bold tabular-nums text-foreground"
                />
              </div>
            ))}
          </div>
          <p className="mt-2.5 border-t border-white/10 pt-2 font-mono text-[11px] text-muted-foreground">
            Volume{" "}
            <span className="text-base font-bold tabular-nums text-foreground">{volumeM3.toFixed(2)}</span> m³
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
