import {
  FolderOpen,
  Folder,
  ListBullets,
  MagnifyingGlass,
  PushPin,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { FilesPanel } from "./FilesPanel";
import { HeldPanel } from "./HeldPanel";
import {
  OutlinePanel,
  type Frontmatter,
  type Heading,
  type Stats,
} from "./OutlinePanel";
import { SearchPanel } from "./SearchPanel";
import { useSidebarStore, type SidebarTab } from "./store";

interface Props {
  visible: boolean;
  filePath: string | null;
  headings: Heading[];
  stats: Stats | null;
  frontmatter: Frontmatter;
  activeId: string;
  onOpenFile: () => void;
  onOpenPath: (path: string, line?: number) => void;
  onJump: (id: string) => void;
}

const TABS: { id: SidebarTab; icon: ReactNode; label: string }[] = [
  { id: "outline", icon: <ListBullets size={13} />, label: "Outline" },
  { id: "files", icon: <Folder size={13} />, label: "Files" },
  { id: "search", icon: <MagnifyingGlass size={13} />, label: "Search" },
  { id: "held", icon: <PushPin size={13} />, label: "Held" },
];

export function Sidebar({
  visible,
  filePath,
  headings,
  stats,
  frontmatter,
  activeId,
  onOpenFile,
  onOpenPath,
  onJump,
}: Props) {
  const activeTab = useSidebarStore((s) => s.activeTab);
  const setActiveTab = useSidebarStore((s) => s.setActiveTab);

  return (
    <aside
      className="shrink-0 overflow-hidden border-r border-black/[0.06] dark:border-white/[0.06]"
      style={{
        width: visible ? 256 : 0,
        minWidth: visible ? 256 : 0,
        opacity: visible ? 1 : 0,
        transition:
          "width 300ms cubic-bezier(0.16,1,0.3,1), min-width 300ms cubic-bezier(0.16,1,0.3,1), opacity 220ms ease",
      }}
    >
      <div className="w-64 h-full flex flex-col overflow-hidden">
        <div className="px-3 pt-3.5 pb-2 shrink-0">
          <button
            type="button"
            onClick={onOpenFile}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.04] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]"
            style={{ transition: "all 180ms cubic-bezier(0.16,1,0.3,1)" }}
          >
            <FolderOpen size={14} />
            <span>Open file</span>
            <kbd className="ml-auto text-[10px] font-mono text-stone-400 dark:text-stone-600 bg-stone-100 dark:bg-white/[0.06] border border-stone-200 dark:border-white/10 px-1.5 py-px rounded">
              ⌘O
            </kbd>
          </button>
        </div>

        <div className="px-3 shrink-0">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 dark:bg-white/[0.04]">
            {TABS.map((t) => {
              const isActive = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  title={t.label}
                  className={`flex-1 flex items-center justify-center py-1 rounded-md transition-colors duration-100 ${
                    isActive
                      ? "bg-white dark:bg-white/[0.10] text-stone-700 dark:text-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400"
                  }`}
                >
                  {t.icon}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-stone-100 dark:bg-white/[0.05] mx-4 mt-2 shrink-0" />

        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "outline" && (
            <OutlinePanel
              filePath={filePath}
              headings={headings}
              stats={stats}
              frontmatter={frontmatter}
              activeId={activeId}
              onJump={onJump}
            />
          )}
          {activeTab === "files" && (
            <FilesPanel filePath={filePath} onOpen={(p) => onOpenPath(p)} />
          )}
          {activeTab === "search" && (
            <SearchPanel filePath={filePath} onOpenAt={onOpenPath} />
          )}
          {activeTab === "held" && <HeldPanel onOpenAt={onOpenPath} />}
        </div>
      </div>
    </aside>
  );
}
