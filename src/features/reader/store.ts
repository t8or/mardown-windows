import { create } from "zustand";

export interface OpenFile {
  path: string;
  content: string;
}

export type ViewMode = "read" | "diff" | "merge";

interface ReaderState {
  files: OpenFile[];
  activeIndex: number;
  /** Indices of the two files currently being diffed/merged. */
  pair: { a: number; b: number } | null;
  viewMode: ViewMode;

  openOrFocus: (file: OpenFile) => number;
  focus: (idx: number) => void;
  close: (idx: number) => void;
  updateContent: (idx: number, content: string) => void;
  startDiff: (aIdx: number, bIdx: number) => void;
  startMerge: (aIdx: number, bIdx: number) => void;
  endComparison: () => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  files: [],
  activeIndex: -1,
  pair: null,
  viewMode: "read",

  openOrFocus: (file) => {
    const existing = get().files.findIndex((f) => f.path === file.path);
    if (existing >= 0) {
      set({ activeIndex: existing, viewMode: "read", pair: null });
      // Refresh content if changed on disk
      const files = get().files.slice();
      files[existing] = file;
      set({ files });
      return existing;
    }
    const next = [...get().files, file];
    set({ files: next, activeIndex: next.length - 1, viewMode: "read", pair: null });
    return next.length - 1;
  },

  focus: (idx) => {
    if (idx < 0 || idx >= get().files.length) return;
    set({ activeIndex: idx, viewMode: "read", pair: null });
  },

  close: (idx) => {
    const { files, activeIndex, pair } = get();
    if (idx < 0 || idx >= files.length) return;
    const next = files.slice();
    next.splice(idx, 1);
    let newActive = activeIndex;
    if (next.length === 0) newActive = -1;
    else if (idx < activeIndex) newActive = activeIndex - 1;
    else if (idx === activeIndex) newActive = Math.min(activeIndex, next.length - 1);
    let newPair = pair;
    if (pair && (pair.a === idx || pair.b === idx)) newPair = null;
    else if (pair) {
      newPair = {
        a: pair.a > idx ? pair.a - 1 : pair.a,
        b: pair.b > idx ? pair.b - 1 : pair.b,
      };
    }
    set({
      files: next,
      activeIndex: newActive,
      pair: newPair,
      viewMode: newPair ? get().viewMode : "read",
    });
  },

  updateContent: (idx, content) => {
    const files = get().files.slice();
    if (!files[idx]) return;
    files[idx] = { ...files[idx], content };
    set({ files });
  },

  startDiff: (aIdx, bIdx) => set({ pair: { a: aIdx, b: bIdx }, viewMode: "diff" }),
  startMerge: (aIdx, bIdx) => set({ pair: { a: aIdx, b: bIdx }, viewMode: "merge" }),
  endComparison: () => set({ pair: null, viewMode: "read" }),
}));
