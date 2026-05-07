import { ArrowClockwise, ArrowUp, FolderOpen } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listMarkdownDir, type FileEntry } from "./api";
import { useSidebarStore } from "./store";

type SortMode = "name" | "loc" | "modified";

interface Props {
  filePath: string | null;
  onOpen: (path: string) => void;
}

const MAX_DEPTH = 5;

function parentOf(p: string): string | null {
  const norm = p.replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return null;
  return norm.slice(0, idx);
}

function shortenRoot(root: string): string {
  const norm = root.replace(/\\/g, "/");
  const parts = norm.split("/");
  if (parts.length <= 3) return norm;
  return `…/${parts.slice(-2).join("/")}`;
}

export function FilesPanel({ filePath, onOpen }: Props) {
  const rootOverride = useSidebarStore((s) => s.rootOverride);
  const setRootOverride = useSidebarStore((s) => s.setRootOverride);

  const root = useMemo(() => {
    if (rootOverride) return rootOverride;
    if (filePath) return filePath.replace(/[\\/][^\\/]+$/, "");
    return null;
  }, [rootOverride, filePath]);

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("name");
  const [filter, setFilter] = useState("");

  const reload = useCallback(async () => {
    if (!root) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listMarkdownDir(root, MAX_DEPTH);
      setEntries(result);
    } catch (e) {
      setError(String(e));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [root]);

  useEffect(() => {
    reload();
  }, [reload]);

  const sorted = useMemo(() => {
    const list = filter
      ? entries.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
      : entries.slice();
    list.sort((a, b) => {
      if (sort === "loc") return b.line_count - a.line_count;
      if (sort === "modified") return b.modified_ms - a.modified_ms;
      return a.path.localeCompare(b.path);
    });
    return list;
  }, [entries, filter, sort]);

  const goUp = () => {
    if (!root) return;
    const parent = parentOf(root);
    if (parent) setRootOverride(parent);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-3 pt-2 pb-2 space-y-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goUp}
            disabled={!root}
            title="Parent folder"
            className="p-1 rounded text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
          >
            <ArrowUp size={12} />
          </button>
          <p
            className="text-[11px] font-mono text-stone-500 dark:text-stone-500 truncate flex-1"
            title={root ?? ""}
          >
            {root ? shortenRoot(root) : "No folder"}
          </p>
          <button
            type="button"
            onClick={reload}
            disabled={!root || loading}
            title="Refresh"
            className="p-1 rounded text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
          >
            <ArrowClockwise size={12} />
          </button>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="w-full px-2 py-1 text-[12px] rounded-md bg-stone-100 dark:bg-white/[0.05] text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none border border-transparent focus:border-stone-300 dark:focus:border-white/[0.10]"
        />
        <div className="flex gap-0.5 text-[10px] uppercase tracking-[0.08em] font-semibold">
          {(["name", "loc", "modified"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`px-2 py-0.5 rounded transition-colors ${
                sort === s
                  ? "text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/[0.07]"
                  : "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-3">
        {error && (
          <p className="px-3 py-2 text-[11px] text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
        {!root && (
          <p className="px-4 py-3 text-[11px] text-stone-400 dark:text-stone-600 leading-relaxed">
            <FolderOpen size={12} className="inline mr-1" />
            Open a file to browse its folder.
          </p>
        )}
        {root && !loading && sorted.length === 0 && (
          <p className="px-4 py-3 text-[11px] text-stone-400 dark:text-stone-600">
            No markdown files found.
          </p>
        )}
        {sorted.map((e) => (
          <FileRow
            key={e.path}
            entry={e}
            active={e.path === filePath}
            onClick={() => onOpen(e.path)}
          />
        ))}
      </div>
    </div>
  );
}

function FileRow({
  entry,
  active,
  onClick,
}: {
  entry: FileEntry;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={entry.path}
      className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors duration-100 ${
        active
          ? "bg-stone-100 dark:bg-white/[0.08] text-stone-800 dark:text-stone-100"
          : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/[0.03]"
      }`}
      style={{ paddingLeft: `${8 + Math.min(entry.depth - 1, 4) * 10}px` }}
    >
      <span className="text-[12px] truncate flex-1">{entry.name}</span>
      <span className="text-[10px] font-mono tabular-nums text-stone-400 dark:text-stone-600 shrink-0">
        {entry.line_count}
      </span>
    </button>
  );
}
