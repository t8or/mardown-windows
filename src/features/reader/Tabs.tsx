import { ArrowsLeftRight, GitDiff, X } from "@phosphor-icons/react";
import { useState } from "react";
import { useReaderStore } from "./store";

interface Props {
  onCompare: (srcIdx: number, mode: "diff" | "merge") => void;
}

export function Tabs({ onCompare }: Props) {
  const files = useReaderStore((s) => s.files);
  const activeIndex = useReaderStore((s) => s.activeIndex);
  const pair = useReaderStore((s) => s.pair);
  const viewMode = useReaderStore((s) => s.viewMode);
  const focus = useReaderStore((s) => s.focus);
  const close = useReaderStore((s) => s.close);
  const endComparison = useReaderStore((s) => s.endComparison);

  if (files.length === 0) return null;

  const isCompareView = viewMode !== "read" && pair;

  return (
    <div className="h-9 shrink-0 flex items-end px-2 gap-0.5 border-b border-black/[0.06] dark:border-white/[0.06] overflow-x-auto">
      {files.map((f, i) => {
        const inPair = pair && (pair.a === i || pair.b === i);
        const isActive = !isCompareView && i === activeIndex;
        const name = f.path.split(/[\\/]/).pop() ?? f.path;
        return (
          <Tab
            key={f.path}
            name={name}
            path={f.path}
            active={isActive}
            highlighted={!!inPair && !!isCompareView}
            onClick={() => focus(i)}
            onClose={(e) => {
              e.stopPropagation();
              close(i);
            }}
            onCompare={(mode) => onCompare(i, mode)}
          />
        );
      })}
      {isCompareView && (
        <div className="ml-1 flex items-center gap-1.5 px-2 py-1 rounded-t-md bg-stone-100 dark:bg-white/[0.05] text-[11px] text-stone-600 dark:text-stone-400">
          {viewMode === "diff" ? <GitDiff size={11} /> : <ArrowsLeftRight size={11} />}
          <span className="font-medium">
            {viewMode === "diff" ? "Diff" : "Merge"}: {pair && tabName(files[pair.a]?.path)} ↔ {pair && tabName(files[pair.b]?.path)}
          </span>
          <button
            type="button"
            onClick={endComparison}
            className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-white/[0.10] transition-colors"
            title="Close comparison"
          >
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

function tabName(path: string | undefined): string {
  if (!path) return "";
  return path.split(/[\\/]/).pop() ?? path;
}

function Tab({
  name,
  path,
  active,
  highlighted,
  onClick,
  onClose,
  onCompare,
}: {
  name: string;
  path: string;
  active: boolean;
  highlighted: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
  onCompare: (mode: "diff" | "merge") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`relative group flex items-center gap-1.5 px-3 py-1 rounded-t-md text-[12px] transition-colors duration-150 cursor-default ${
        active
          ? "bg-stone-100 dark:bg-white/[0.06] text-stone-800 dark:text-stone-200"
          : highlighted
            ? "bg-stone-50 dark:bg-white/[0.03] text-stone-600 dark:text-stone-400"
            : "text-stone-500 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/[0.03]"
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      <button
        type="button"
        onClick={onClick}
        title={path}
        className="truncate max-w-[180px] outline-none"
      >
        {name}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="p-0.5 rounded text-stone-400 dark:text-stone-600 opacity-0 group-hover:opacity-100 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/[0.10] transition-opacity"
        title="Close tab"
      >
        <X size={10} />
      </button>
      {menuOpen && (
        <TabMenu
          onClose={() => setMenuOpen(false)}
          onDiff={() => {
            setMenuOpen(false);
            onCompare("diff");
          }}
          onMerge={() => {
            setMenuOpen(false);
            onCompare("merge");
          }}
        />
      )}
    </div>
  );
}

function TabMenu({
  onClose,
  onDiff,
  onMerge,
}: {
  onClose: () => void;
  onDiff: () => void;
  onMerge: () => void;
}) {
  return (
    <>
      {/* Click-out backdrop */}
      <div
        className="fixed inset-0 z-40"
        onMouseDown={onClose}
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop only
      />
      <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-lg bg-white/97 dark:bg-[#252525]/97 border border-black/[0.08] dark:border-white/[0.10] shadow-[0_4px_20px_rgba(0,0,0,0.15)] py-1">
        <MenuItem icon={<GitDiff size={11} />} label="Diff with..." onClick={onDiff} />
        <MenuItem
          icon={<ArrowsLeftRight size={11} />}
          label="Merge with..."
          onClick={onMerge}
        />
      </div>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/[0.05]"
    >
      {icon}
      {label}
    </button>
  );
}
