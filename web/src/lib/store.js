import { create } from "zustand";
import { CONTAINER_PRESETS, BOX_COLORS } from "./packing/types";
import { packBoxes } from "./packing/algorithm";
import { parseCsvBoxes } from "./csvBoxParser";

let colorIndex = 0;
function nextColor() {
  const color = BOX_COLORS[colorIndex % BOX_COLORS.length];
  colorIndex++;
  return color;
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
    get().runPacking();
  },
  updateContainer: (dims) => {
    set((state) => ({
      container: { ...state.container, ...dims },
      containerPreset: "Custom",
    }));
    get().runPacking();
  },

  boxes: [],
  addBox: (box) => {
    const newBox = {
      ...box,
      id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      color: nextColor(),
    };
    set((state) => ({ boxes: [...state.boxes, newBox] }));
    get().runPacking();
  },
  removeBox: (id) => {
    set((state) => ({ boxes: state.boxes.filter((b) => b.id !== id) }));
    get().runPacking();
  },
  updateBox: (id, updates) => {
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    get().runPacking();
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

  clearCsvImport: () =>
    set({
      parsedCsvBoxes: [],
      csvParseErrors: [],
      csvFileName: null,
      csvUploadStatus: "idle",
      csvUploadMessage: "",
      maxBoxesToUseInput: "",
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
        });
        return;
      }
      set({
        parsedCsvBoxes: rows,
        csvParseErrors: errors,
        csvFileName: fileName,
        csvUploadStatus: "success",
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
      });
    }
  },

  executeCsvImport: () => {
    const s = get();
    const n = parseInt(String(s.maxBoxesToUseInput ?? "").trim(), 10);
    if (!s.selectedPackAlgorithm || !Number.isFinite(n) || n < 1 || s.parsedCsvBoxes.length === 0) return;
    if (s.csvUploadStatus !== "success") return;
    const cap = Math.min(n, s.parsedCsvBoxes.length);
    const slice = s.parsedCsvBoxes.slice(0, cap);
    const newBoxes = slice.map((b, idx) => ({
      id: `box-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
      name: b.name,
      length: b.length,
      width: b.width,
      height: b.height,
      weight: b.weight,
      fragile: Boolean(b.fragile),
      color: nextColor(),
    }));
    set({ boxes: newBoxes, lastRunAlgorithm: s.selectedPackAlgorithm });
    get().runPacking();
  },

  placedBoxes: [],
  unplacedBoxes: [],
  utilization: 0,
  totalBoxes: 0,
  placedCount: 0,

  runPacking: () => {
    const { boxes, container } = get();
    const result = packBoxes(boxes, container);
    set({
      placedBoxes: result.placed,
      unplacedBoxes: result.unplaced,
      utilization: result.utilization,
      totalBoxes: result.totalBoxes,
      placedCount: result.placedCount,
    });
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
