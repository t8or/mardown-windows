import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tauriJSONStorage } from "@/lib/persist";

export interface HeldItem {
  id: string;
  path: string;
  name: string;
  line?: number;
  snippet?: string;
  addedAt: number;
}

interface HeldState {
  items: HeldItem[];
  add: (item: Omit<HeldItem, "id" | "addedAt">) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (path: string, line?: number) => boolean;
}

function makeId(path: string, line?: number): string {
  return line != null ? `${path}#L${line}` : path;
}

export const useHeldStore = create<HeldState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const id = makeId(item.path, item.line);
        const existing = get().items;
        if (existing.some((i) => i.id === id)) return;
        const next: HeldItem = { ...item, id, addedAt: Date.now() };
        set({ items: [next, ...existing] });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
      has: (path, line) =>
        get().items.some((i) => i.id === makeId(path, line)),
    }),
    { name: "held-items", storage: tauriJSONStorage },
  ),
);

export { makeId as makeHeldId };
