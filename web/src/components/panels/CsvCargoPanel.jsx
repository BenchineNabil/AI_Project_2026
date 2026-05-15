import { useCallback, useRef, useState } from "react";
import { useContainerStore } from "@/lib/store";
import { canExecuteCsvImport } from "@/lib/csvBoxParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Boxes,
  FileSpreadsheet,
  Loader2,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function CsvCargoPanel() {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const boxes = useContainerStore((s) => s.boxes);
  const clearBoxes = useContainerStore((s) => s.clearBoxes);
  const clearCsvImport = useContainerStore((s) => s.clearCsvImport);
  const ingestCsvFromFile = useContainerStore((s) => s.ingestCsvFromFile);
  const executeCsvImport = useContainerStore((s) => s.executeCsvImport);
  const parsedCsvBoxes = useContainerStore((s) => s.parsedCsvBoxes);
  const csvParseErrors = useContainerStore((s) => s.csvParseErrors);
  const csvFileName = useContainerStore((s) => s.csvFileName);
  const csvUploadStatus = useContainerStore((s) => s.csvUploadStatus);
  const csvUploadMessage = useContainerStore((s) => s.csvUploadMessage);
  const maxBoxesToUseInput = useContainerStore((s) => s.maxBoxesToUseInput);
  const setMaxBoxesToUseInput = useContainerStore((s) => s.setMaxBoxesToUseInput);
  const canRun = useContainerStore(canExecuteCsvImport);
  const csvExecutePreviewRows = useContainerStore((s) => s.csvExecutePreviewRows);
  const packingBusy = useContainerStore((s) => s.packingBusy);

  const onPickFile = useCallback(() => inputRef.current?.click(), []);

  const handleFile = useCallback(
    async (fileList) => {
      const file = fileList?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        useContainerStore.setState({
          csvUploadStatus: "error",
          csvUploadMessage: "Please choose a .csv file.",
          parsedCsvBoxes: [],
          csvParseErrors: [],
          maxBoxesToUseInput: "",
          csvFileName: file.name || null,
        });
        return;
      }
      await ingestCsvFromFile(file);
    },
    [ingestCsvFromFile]
  );

  const onInputChange = (e) => {
    const f = e.target.files;
    void handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files);
  };

  const reading = csvUploadStatus === "reading";
  const success = csvUploadStatus === "success";
  const failed = csvUploadStatus === "error";

  const previewRows =
    csvExecutePreviewRows.length > 0 ? csvExecutePreviewRows : parsedCsvBoxes;
  const previewLabel =
    csvExecutePreviewRows.length > 0
      ? `Active load (${previewRows.length} random) — matches deck`
      : `Staged file (${previewRows.length} row${previewRows.length !== 1 ? "s" : ""})`;

  return (
    <Card className="shrink-0 border-white/[0.07]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm normal-case tracking-normal">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-orange-600/10 ring-1 ring-primary/30">
            <Boxes className="size-4 text-primary" />
          </span>
          Cargo intake
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Upload a CSV with columns{" "}
          <code className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-accent/90">
            id,name,length,width,height,weight,fragile
          </code>
          . By default L/W/H are treated as <span className="text-foreground/90">centimeters</span> (converted to
          meters for packing); set <span className="font-mono text-[10px] text-foreground/80">VITE_CSV_DIMENSION_UNIT=m</span>{" "}
          in <span className="font-mono text-[10px]">environment/.env</span> if your file is already in meters. Use{" "}
          <span className="text-foreground/90">true</span> or <span className="text-foreground/90">false</span> for fragile
          (case-insensitive). Nothing is packed until you run execute.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onInputChange}
        />

        <button
          type="button"
          disabled={reading}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={onPickFile}
          className={cn(
            "group relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200",
            reading && "pointer-events-none opacity-80",
            dragOver
              ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(255,107,53,0.25)]"
              : "border-white/15 bg-white/[0.03] hover:border-primary/35 hover:bg-primary/[0.06]",
            failed && !dragOver && "border-red-500/35 bg-red-500/[0.04]"
          )}
        >
          {reading ? (
            <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
          ) : (
            <Upload className="size-9 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:text-primary" aria-hidden />
          )}
          <span className="font-display text-sm font-semibold text-foreground">
            {reading ? "Reading CSV…" : "Drop CSV here or click to browse"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">.csv only</span>
        </button>

        {(csvFileName || csvUploadMessage) && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs",
              failed ? "border-red-500/30 bg-red-500/10 text-red-100" : "border-white/10 bg-black/25 text-muted-foreground"
            )}
          >
            {failed ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" /> : <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-accent" />}
            <div className="min-w-0 space-y-0.5">
              {csvFileName ? (
                <p className="truncate font-mono text-[11px] text-foreground/90">
                  <span className="text-muted-foreground">File:</span> {csvFileName}
                </p>
              ) : null}
              <p className="leading-snug">{csvUploadMessage}</p>
            </div>
          </div>
        )}

        {csvParseErrors.length > 0 && (
          <div className="max-h-28 space-y-1 overflow-y-auto rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/95">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200/90">Row warnings</p>
            <ul className="list-inside list-disc space-y-0.5 font-mono leading-relaxed">
              {csvParseErrors.slice(0, 12).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            {csvParseErrors.length > 12 ? (
              <p className="pt-1 font-mono text-[10px] text-amber-200/80">+{csvParseErrors.length - 12} more…</p>
            ) : null}
          </div>
        )}

        {success && parsedCsvBoxes.length > 0 && (
          <>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Max boxes to use
              </Label>
              <Input
                type="number"
                min={1}
                max={parsedCsvBoxes.length}
                value={maxBoxesToUseInput}
                onChange={(e) => setMaxBoxesToUseInput(e.target.value)}
                className="h-10 font-mono text-sm tabular-nums"
              />
              <p className="font-mono text-[10px] text-muted-foreground">
                Staged: <span className="text-foreground">{parsedCsvBoxes.length}</span> — each execute randomly picks N
                rows (uniform, not first-N).
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Preview
                </Label>
                <span className="max-w-[12rem] truncate text-right font-mono text-[10px] text-muted-foreground">
                  {previewLabel}
                </span>
              </div>
              <div className="max-h-56 overflow-auto rounded-xl border border-white/[0.08] bg-black/30 shadow-inner">
                <table className="w-full min-w-[20rem] border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 z-[1] bg-[#0d1424]/95 backdrop-blur-sm">
                    <tr className="border-b border-white/10 font-mono uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">Id</th>
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">L</th>
                      <th className="px-2 py-2 font-medium">W</th>
                      <th className="px-2 py-2 font-medium">H</th>
                      <th className="px-2 py-2 font-medium">kg</th>
                      <th className="px-2 py-2 font-medium">Frag</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {previewRows.map((row, idx) => (
                      <tr
                        key={`${row.rowIndex}-${idx}-${row.sourceId}`}
                        className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground/80">{idx + 1}</td>
                        <td className="max-w-[5rem] truncate px-2 py-1.5 font-medium text-foreground">{row.sourceId}</td>
                        <td className="max-w-[7rem] truncate px-2 py-1.5 text-foreground/90">{row.name}</td>
                        <td className="px-2 py-1.5 font-mono tabular-nums">{row.length}</td>
                        <td className="px-2 py-1.5 font-mono tabular-nums">{row.width}</td>
                        <td className="px-2 py-1.5 font-mono tabular-nums">{row.height}</td>
                        <td className="px-2 py-1.5 font-mono tabular-nums">{row.weight}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-foreground/90">
                          {row.fragile ? "true" : "false"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="default"
            className="min-h-11 flex-1 gap-2 shadow-[0_8px_28px_-12px_rgba(255,107,53,0.45)]"
            disabled={!canRun}
            onClick={() => void executeCsvImport()}
          >
            {packingBusy ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : <Play className="size-4 shrink-0 fill-current" aria-hidden />}
            Execute deck
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => clearCsvImport()}
            disabled={parsedCsvBoxes.length === 0 && csvUploadStatus === "idle"}
          >
            Reset import
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clearBoxes()}
            className="h-9 gap-1.5 text-xs text-destructive hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Purge deck
          </Button>
        </div>

        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-3 py-2 text-center font-mono text-[11px] text-muted-foreground">
          <span className="text-foreground">{boxes.length}</span> box{boxes.length !== 1 ? "es" : ""} on deck
        </div>
      </CardContent>
    </Card>
  );
}
