import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tauriJSONStorage } from "@/lib/persist";

export type SidebarTab = "outline" | "files" | "search" | "held";

interface SidebarState {
  activeTab: SidebarTab;
  /** Override directory for files/search panels. If null, derived from open file. */
  rootOverride: string | null;
  setActiveTab: (t: SidebarTab) => void;
  setRootOverride: (p: string | null) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      activeTab: "outline",
      rootOverride: null,
      setActiveTab: (activeTab) => set({ activeTab }),
      setRootOverride: (rootOverride) => set({ rootOverride }),
    }),
    { name: "sidebar", storage: tauriJSONStorage },
  ),
);
