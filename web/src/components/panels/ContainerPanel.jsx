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

export function ContainerPanel() {
  const { container, containerPreset, setContainerPreset, updateContainer } = useContainerStore();

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
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Preset lane
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

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              L (m)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={container.length}
              onChange={(e) => updateContainer({ length: parseFloat(e.target.value) || 0 })}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              W (m)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={container.width}
              onChange={(e) => updateContainer({ width: parseFloat(e.target.value) || 0 })}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              H (m)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={container.height}
              onChange={(e) => updateContainer({ height: parseFloat(e.target.value) || 0 })}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
