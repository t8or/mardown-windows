import {
  CaretDown,
  CaretRight,
  MagnifyingGlass,
  PushPin,
  PushPinSlash,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHeldStore } from "@/features/held/store";
import { useSettingsStore } from "@/features/settings/store";
import { searchMarkdown, type SearchHit } from "./api";
import { useSidebarStore } from "./store";

interface Props {
  filePath: string | null;
  onOpenAt: (path: string, line?: number) => void;
}

export function SearchPanel({ filePath, onOpenAt }: Props) {
  const rootOverride = useSidebarStore((s) => s.rootOverride);

  const root = useMemo(() => {
    if (rootOverride) return rootOverride;
    if (filePath) return filePath.replace(/[\\/][^\\/]+$/, "");
    return null;
  }, [rootOverride, filePath]);

  const depth = useSettingsStore((s) => s.searchDepth);
  const setDepth = useSettingsStore((s) => s.setSearchDepth);
  const caseSensitive = useSettingsStore((s) => s.searchCaseSensitive);
  const setCaseSensitive = useSettingsStore((s) => s.setSearchCaseSensitive);
  const regex = useSettingsStore((s) => s.searchRegex);
  const setRegex = useSettingsStore((s) => s.setSearchRegex);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    if (!root || !query.trim()) {
      setHits([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await searchMarkdown({
        root,
        query,
        maxDepth: depth,
        caseSensitive,
        regex,
      });
      setHits(result);
    } catch (e) {
      setError(String(e));
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [root, query, depth, caseSensitive, regex]);

  useEffect(() => {
    const id = setTimeout(runSearch, 250);
    return () => clearTimeout(id);
  }, [runSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; hits: SearchHit[] }>();
    for (const h of hits) {
      const g = map.get(h.path);
      if (g) g.hits.push(h);
      else map.set(h.path, { name: h.name, hits: [h] });
    }
    return Array.from(map.entries());
  }, [hits]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-3 pt-2 pb-2 space-y-2 shrink-0">
        <div className="relative">
          <MagnifyingGlass
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-600 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markdown…"
            className="w-full pl-7 pr-2 py-1 text-[12px] rounded-md bg-stone-100 dark:bg-white/[0.05] text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none border border-transparent focus:border-stone-300 dark:focus:border-white/[0.10]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Case sensitive"
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
              caseSensitive
                ? "bg-stone-200 dark:bg-white/[0.10] text-stone-700 dark:text-stone-200"
                : "text-stone-400 dark:text-stone-600 hover:bg-stone-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            Aa
          </button>
          <button
            type="button"
            onClick={() => setRegex(!regex)}
            title="Regex"
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
              regex
                ? "bg-stone-200 dark:bg-white/[0.10] text-stone-700 dark:text-stone-200"
                : "text-stone-400 dark:text-stone-600 hover:bg-stone-100 dark:hover:bg-white/[0.05]"
            }`}
          >
            .*
          </button>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-500">
            <span className="font-mono uppercase tracking-[0.08em]">depth</span>
            <input
              type="range"
              min={1}
              max={5}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-16"
            />
            <span className="font-mono tabular-nums w-3 text-right">{depth}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-3">
        {error && (
          <p className="px-3 py-2 text-[11px] text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
        {!root && (
          <p className="px-4 py-3 text-[11px] text-stone-400 dark:text-stone-600">
            Open a file to enable folder search.
          </p>
        )}
        {root && query && !loading && hits.length === 0 && !error && (
          <p className="px-4 py-3 text-[11px] text-stone-400 dark:text-stone-600">
            No matches.
          </p>
        )}
        {loading && (
          <p className="px-4 py-3 text-[11px] text-stone-400 dark:text-stone-600">
            Searching…
          </p>
        )}
        {grouped.map(([path, g]) => (
          <SearchFileGroup
            key={path}
            path={path}
            name={g.name}
            hits={g.hits}
            onOpenAt={onOpenAt}
          />
        ))}
      </div>
    </div>
  );
}

function SearchFileGroup({
  path,
  name,
  hits,
  onOpenAt,
}: {
  path: string;
  name: string;
  hits: SearchHit[];
  onOpenAt: (path: string, line?: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const add = useHeldStore((s) => s.add);
  const remove = useHeldStore((s) => s.remove);
  const has = useHeldStore((s) => s.has);
  const heldFile = has(path);

  return (
    <div className="mb-1">
      <div className="flex items-center gap-1 px-1 py-0.5 group">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="p-0.5 text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300"
        >
          {open ? <CaretDown size={10} /> : <CaretRight size={10} />}
        </button>
        <button
          type="button"
          onClick={() => onOpenAt(path)}
          className="text-[12px] font-medium text-stone-700 dark:text-stone-300 truncate flex-1 text-left hover:text-stone-900 dark:hover:text-stone-100"
          title={path}
        >
          {name}
        </button>
        <span className="text-[10px] font-mono tabular-nums text-stone-400 dark:text-stone-600 shrink-0">
          {hits.length}
        </span>
        <button
          type="button"
          onClick={() =>
            heldFile
              ? remove(`${path}`)
              : add({ path, name })
          }
          title={heldFile ? "Unhold file" : "Hold file"}
          className={`p-0.5 transition-opacity ${
            heldFile
              ? "text-stone-700 dark:text-stone-300 opacity-100"
              : "text-stone-400 dark:text-stone-600 opacity-0 group-hover:opacity-100 hover:text-stone-700 dark:hover:text-stone-300"
          }`}
        >
          {heldFile ? <PushPinSlash size={11} /> : <PushPin size={11} />}
        </button>
      </div>
      {open && (
        <div>
          {hits.map((h, i) => (
            <SearchHitRow
              // biome-ignore lint/suspicious/noArrayIndexKey: stable per hit list
              key={`${h.line}-${i}`}
              hit={h}
              onOpen={() => onOpenAt(h.path, h.line)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchHitRow({
  hit,
  onOpen,
}: {
  hit: SearchHit;
  onOpen: () => void;
}) {
  const add = useHeldStore((s) => s.add);
  const remove = useHeldStore((s) => s.remove);
  const has = useHeldStore((s) => s.has);
  const held = has(hit.path, hit.line);

  return (
    <div className="flex items-start gap-1 pl-5 pr-1 py-0.5 group hover:bg-stone-50 dark:hover:bg-white/[0.03] rounded">
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 text-left min-w-0"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-mono tabular-nums text-stone-400 dark:text-stone-600 shrink-0">
            {hit.line}
          </span>
          <span className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
            {hit.text.trim()}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={() =>
          held
            ? remove(`${hit.path}#L${hit.line}`)
            : add({
                path: hit.path,
                name: hit.name,
                line: hit.line,
                snippet: hit.text.trim(),
              })
        }
        title={held ? "Unhold" : "Hold this hit"}
        className={`p-0.5 transition-opacity ${
          held
            ? "text-stone-700 dark:text-stone-300 opacity-100"
            : "text-stone-400 dark:text-stone-600 opacity-0 group-hover:opacity-100 hover:text-stone-700 dark:hover:text-stone-300"
        }`}
      >
        {held ? <PushPinSlash size={10} /> : <PushPin size={10} />}
      </button>
    </div>
  );
}
