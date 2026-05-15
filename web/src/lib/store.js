import { create } from "zustand";
import { CONTAINER_PRESETS, BOX_COLORS } from "./packing/types";
import { parseCsvBoxes } from "./csvBoxParser";
import { packViaApi } from "./packingApi";
import { shuffleIndices } from "./shuffleIndices";
import { PACK_ALGORITHM_OPTIONS } from "./packAlgorithmUi";

const ALGO_LABEL = Object.fromEntries(PACK_ALGORITHM_OPTIONS.map((o) => [o.id, o.label]));

let colorIndex = 0;
function nextColor() {
  const color = BOX_COLORS[colorIndex % BOX_COLORS.length];
  colorIndex++;
  return color;
}

async function yieldToBrowser() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => requestAnimationFrame(r));
}

export const useContainerStore = create((set, get) => ({
  container: { ...CONTAINER_PRESETS["20ft Standard"] },
  containerPreset: "20ft Standard",
  setContainerPreset: (preset) => {
    if (preset === "Custom") {
      set({ containerPreset: preset });
      return;
    }
    set({
      containerPreset: preset,
      container: { ...CONTAINER_PRESETS[preset] },
    });
    void get().runPacking();
  },
  updateContainer: (dims) => {
    set((state) => ({
      container: { ...state.container, ...dims },
      containerPreset: "Custom",
    }));
    void get().runPacking();
  },

  boxes: [],
  addBox: (box) => {
    const newBox = {
      ...box,
      id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      color: nextColor(),
    };
    set((state) => ({ boxes: [...state.boxes, newBox] }));
    void get().runPacking();
  },
  removeBox: (id) => {
    set((state) => ({ boxes: state.boxes.filter((b) => b.id !== id) }));
    void get().runPacking();
  },
  updateBox: (id, updates) => {
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    void get().runPacking();
  },
  clearBoxes: () =>
    set({
      boxes: [],
      placedBoxes: [],
      unplacedBoxes: [],
      utilization: 0,
      totalBoxes: 0,
      placedCount: 0,
      selectedBoxId: null,
      parsedCsvBoxes: [],
      csvParseErrors: [],
      csvFileName: null,
      csvUploadStatus: "idle",
      csvUploadMessage: "",
      maxBoxesToUseInput: "",
      selectedPackAlgorithm: null,
      lastRunAlgorithm: null,
      csvExecutePreviewRows: [],
      packingBusy: false,
      packingPhase: "",
      lastStability: null,
      lastPackScore: null,
      packError: null,
    }),

  /** Staged CSV rows (not yet applied to `boxes` until execute). */
  parsedCsvBoxes: [],
  csvParseErrors: [],
  csvFileName: null,
  csvUploadStatus: "idle",
  csvUploadMessage: "",
  maxBoxesToUseInput: "",
  setMaxBoxesToUseInput: (v) => set({ maxBoxesToUseInput: v }),

  /** UI-only algorithm id for future backend / alternate packers. */
  selectedPackAlgorithm: null,
  setSelectedPackAlgorithm: (id) => set({ selectedPackAlgorithm: id }),

  /** Last algorithm used when execute ran (for display / future wiring). */
  lastRunAlgorithm: null,

  /** Last randomly chosen staged rows used on Execute (preview = this list). */
  csvExecutePreviewRows: [],
  packingBusy: false,
  packingPhase: "",
  lastStability: null,
  lastPackScore: null,
  packError: null,

  clearCsvImport: () =>
    set({
      parsedCsvBoxes: [],
      csvParseErrors: [],
      csvFileName: null,
      csvUploadStatus: "idle",
      csvUploadMessage: "",
      maxBoxesToUseInput: "",
      csvExecutePreviewRows: [],
    }),

  ingestCsvFromFile: async (file) => {
    set({ csvUploadStatus: "reading", csvUploadMessage: "Reading file…", csvParseErrors: [] });
    await new Promise((r) => setTimeout(r, 140));
    try {
      const text = await file.text();
      const fileName = file.name || "upload.csv";
      const { rows, errors } = parseCsvBoxes(text);
      if (rows.length === 0) {
        set({
          csvUploadStatus: "error",
          csvUploadMessage: "No valid rows to import.",
          csvParseErrors: errors,
          parsedCsvBoxes: [],
          csvFileName: fileName,
          maxBoxesToUseInput: "",
          csvExecutePreviewRows: [],
        });
        return;
      }
      set({
        parsedCsvBoxes: rows,
        csvParseErrors: errors,
        csvFileName: fileName,
        csvUploadStatus: "success",
        csvExecutePreviewRows: [],
        csvUploadMessage: `Ready: ${rows.length} box${rows.length !== 1 ? "es" : ""}${
          errors.length ? ` — ${errors.length} row warning${errors.length !== 1 ? "s" : ""}` : ""
        }`,
        maxBoxesToUseInput: String(rows.length),
      });
    } catch (e) {
      set({
        csvUploadStatus: "error",
        csvUploadMessage: e instanceof Error ? e.message : "Failed to read file",
        parsedCsvBoxes: [],
        csvParseErrors: [],
        csvFileName: null,
        maxBoxesToUseInput: "",
        csvExecutePreviewRows: [],
      });
    }
  },

  executeCsvImport: async () => {
    const s = get();
    const n = parseInt(String(s.maxBoxesToUseInput ?? "").trim(), 10);
    if (!s.selectedPackAlgorithm || !Number.isFinite(n) || n < 1 || s.parsedCsvBoxes.length === 0) return;
    if (s.csvUploadStatus !== "success") return;

    try {
      await yieldToBrowser();

      const pool = get().parsedCsvBoxes;
      const cap = Math.min(n, pool.length);
      const order = shuffleIndices(pool.length);
      const chosen = order.slice(0, cap).map((i) => pool[i]);

      const newBoxes = chosen.map((b, idx) => ({
        id: `box-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
        name: b.name,
        length: b.length,
        width: b.width,
        height: b.height,
        weight: b.weight,
        fragile: Boolean(b.fragile),
        color: nextColor(),
      }));

      set({
        boxes: newBoxes,
        csvExecutePreviewRows: chosen,
        lastRunAlgorithm: s.selectedPackAlgorithm,
      });
      await get().runPacking();
    } catch (e) {
      set({
        packError: e instanceof Error ? e.message : "Execute failed",
        packingBusy: false,
        packingPhase: "",
      });
    }
  },

  placedBoxes: [],
  unplacedBoxes: [],
  utilization: 0,
  totalBoxes: 0,
  placedCount: 0,

  runPacking: async () => {
    const s = get();
    if (s.boxes.length === 0) {
      set({
        placedBoxes: [],
        unplacedBoxes: [],
        utilization: 0,
        totalBoxes: 0,
        placedCount: 0,
        lastStability: null,
        lastPackScore: null,
        packError: null,
      });
      return;
    }

    if (!s.selectedPackAlgorithm) {
      set({ packError: "Select a packing algorithm before running." });
      return;
    }

    const algoLabel = ALGO_LABEL[s.selectedPackAlgorithm] ?? s.selectedPackAlgorithm;
    set({
      packingBusy: true,
      packingPhase: `Loading env2.ipynb — ${algoLabel}…`,
      packError: null,
    });
    await yieldToBrowser();

    try {
      set({ packingPhase: `Python search running (${algoLabel})…` });
      const result = await packViaApi({
        boxes: get().boxes,
        container: get().container,
        algorithm: get().selectedPackAlgorithm,
      });

      const placed = result.placed ?? [];
      const unplaced = result.unplaced ?? [];
      const total = result.totalBoxes ?? get().boxes.length;
      const placedCount = result.placedCount ?? placed.length;

      set({
        placedBoxes: placed,
        unplacedBoxes: unplaced,
        utilization: result.utilization ?? 0,
        totalBoxes: total,
        placedCount,
        lastStability: result.stability ?? null,
        lastPackScore: result.score ?? null,
        lastRunAlgorithm: get().selectedPackAlgorithm,
        packingPhase: "Applying results…",
        packError:
          placedCount === 0 && total > 0
            ? "No boxes could be placed. Check CSV units (data.csv uses cm) and container size, or see server logs if Python failed."
            : null,
      });
    } catch (e) {
      set({
        packError: e instanceof Error ? e.message : "Packing failed",
        placedBoxes: [],
        unplacedBoxes: get().boxes.map((b) => ({
          ...b,
          placed: false,
          reason: "Packer error",
        })),
        utilization: 0,
        placedCount: 0,
        totalBoxes: get().boxes.length,
        lastStability: null,
        lastPackScore: null,
      });
    } finally {
      set({ packingBusy: false, packingPhase: "" });
    }
  },

  selectedBoxId: null,
  setSelectedBoxId: (id) => set({ selectedBoxId: id }),

  showWireframe: true,
  toggleWireframe: () => set((s) => ({ showWireframe: !s.showWireframe })),
  showLabels: true,
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  autoRotate: false,
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  explodedView: false,
  toggleExplodedView: () => {
    set((s) => ({ explodedView: !s.explodedView }));
  },
}));
