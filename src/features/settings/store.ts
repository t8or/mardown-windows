import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tauriJSONStorage } from "@/lib/persist";

export type ContentWidth = "comfortable" | "full";
export type DiffMode = "split" | "unified";

interface SettingsState {
  contentWidth: ContentWidth;
  dark: boolean | null; // null = follow system
  sidebarOpen: boolean;
  searchDepth: number;
  searchCaseSensitive: boolean;
  searchRegex: boolean;
  diffMode: DiffMode;
  setContentWidth: (w: ContentWidth) => void;
  setDark: (d: boolean | null) => void;
  setSidebarOpen: (v: boolean) => void;
  setSearchDepth: (n: number) => void;
  setSearchCaseSensitive: (v: boolean) => void;
  setSearchRegex: (v: boolean) => void;
  setDiffMode: (m: DiffMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      contentWidth: "comfortable",
      dark: null,
      sidebarOpen: true,
      searchDepth: 2,
      searchCaseSensitive: false,
      searchRegex: false,
      diffMode: "split",
      setContentWidth: (contentWidth) => set({ contentWidth }),
      setDark: (dark) => set({ dark }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSearchDepth: (searchDepth) => set({ searchDepth }),
      setSearchCaseSensitive: (searchCaseSensitive) => set({ searchCaseSensitive }),
      setSearchRegex: (searchRegex) => set({ searchRegex }),
      setDiffMode: (diffMode) => set({ diffMode }),
    }),
    {
      name: "settings",
      storage: tauriJSONStorage,
    },
  ),
);
