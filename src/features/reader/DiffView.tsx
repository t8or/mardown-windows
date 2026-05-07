import { Columns, Rows, X } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useSettingsStore } from "@/features/settings/store";
import { useReaderStore } from "./store";
import {
  computeChanges,
  summarize,
  toSideBySide,
  toUnified,
  type SideBySideRow,
  type UnifiedRow,
} from "./diff";

export function DiffView() {
  const files = useReaderStore((s) => s.files);
  const pair = useReaderStore((s) => s.pair);
  const endComparison = useReaderStore((s) => s.endComparison);
  const startMerge = useReaderStore((s) => s.startMerge);
  const diffMode = useSettingsStore((s) => s.diffMode);
  const setDiffMode = useSettingsStore((s) => s.setDiffMode);

  const a = pair ? files[pair.a] : null;
  const b = pair ? files[pair.b] : null;

  const { sideRows, unifiedRows, summary } = useMemo(() => {
    if (!a || !b) {
      return {
        sideRows: [] as SideBySideRow[],
        unifiedRows: [] as UnifiedRow[],
        summary: { added: 0, removed: 0, modified: 0 },
      };
    }
    const changes = computeChanges(a.content, b.content);
    const side = toSideBySide(changes);
    return {
      sideRows: side,
      unifiedRows: toUnified(changes),
      summary: summarize(side),
    };
  }, [a, b]);

  if (!a || !b || !pair) return null;

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-[#161616]">
      <div className="shrink-0 px-4 py-2 flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex items-center gap-2 text-[12px] min-w-0 flex-1">
          <span className="text-stone-400 dark:text-stone-600 shrink-0">A</span>
          <span className="font-medium text-stone-700 dark:text-stone-300 truncate" title={a.path}>
            {a.path.split(/[\\/]/).pop()}
          </span>
          <span className="text-stone-400 dark:text-stone-600">↔</span>
          <span className="text-stone-400 dark:text-stone-600 shrink-0">B</span>
          <span className="font-medium text-stone-700 dark:text-stone-300 truncate" title={b.path}>
            {b.path.split(/[\\/]/).pop()}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
          <span className="text-emerald-600 dark:text-emerald-400">+{summary.added + summary.modified}</span>
          <span className="text-rose-600 dark:text-rose-400">−{summary.removed + summary.modified}</span>
        </div>

        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100 dark:bg-white/[0.04] shrink-0">
          <ModeBtn
            icon={<Columns size={12} />}
            label="Split"
            active={diffMode === "split"}
            onClick={() => setDiffMode("split")}
          />
          <ModeBtn
            icon={<Rows size={12} />}
            label="Unified"
            active={diffMode === "unified"}
            onClick={() => setDiffMode("unified")}
          />
        </div>

        <button
          type="button"
          onClick={() => pair && startMerge(pair.a, pair.b)}
          className="text-[11px] px-2 py-1 rounded-md bg-stone-100 dark:bg-white/[0.04] text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/[0.08] hover:text-stone-800 dark:hover:text-stone-200 transition-colors shrink-0"
          title="Open merge editor"
        >
          Merge…
        </button>

        <button
          type="button"
          onClick={endComparison}
          className="p-1 rounded text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/[0.05] shrink-0"
          title="Close diff"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-auto font-mono text-[12px] leading-[1.55] tabular-nums">
        {diffMode === "split" ? (
          <SplitView rows={sideRows} />
        ) : (
          <UnifiedView rows={unifiedRows} />
        )}
        {sideRows.length === 0 && (
          <p className="px-4 py-8 text-stone-400 dark:text-stone-600 text-center">
            Files are identical.
          </p>
        )}
      </div>
    </div>
  );
}

function ModeBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors ${
        active
          ? "bg-white dark:bg-white/[0.10] text-stone-700 dark:text-stone-200 shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
          : "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SplitView({ rows }: { rows: SideBySideRow[] }) {
  return (
    <div className="min-w-fit">
      {rows.map((r, i) => (
        <SplitRow key={i} row={r} />
      ))}
    </div>
  );
}

function SplitRow({ row }: { row: SideBySideRow }) {
  const leftKind =
    row.kind === "equal"
      ? "equal"
      : row.kind === "added"
        ? "blank"
        : "removed";
  const rightKind =
    row.kind === "equal"
      ? "equal"
      : row.kind === "removed"
        ? "blank"
        : "added";

  return (
    <div className="flex">
      <DiffCell line={row.left} kind={leftKind} lineNo={row.leftNo} />
      <div className="w-px shrink-0 bg-black/[0.06] dark:bg-white/[0.06]" />
      <DiffCell line={row.right} kind={rightKind} lineNo={row.rightNo} />
    </div>
  );
}

type CellKind = "equal" | "added" | "removed" | "blank";

function DiffCell({
  line,
  kind,
  lineNo,
}: {
  line: string | null;
  kind: CellKind;
  lineNo: number | null;
}) {
  const bg =
    kind === "added"
      ? "bg-emerald-50 dark:bg-emerald-950/25"
      : kind === "removed"
        ? "bg-rose-50 dark:bg-rose-950/25"
        : kind === "blank"
          ? "bg-stone-100/60 dark:bg-white/[0.02]"
          : "";
  const sign =
    kind === "added" ? "+" : kind === "removed" ? "−" : kind === "blank" ? "" : " ";
  const signColor =
    kind === "added"
      ? "text-emerald-600 dark:text-emerald-400"
      : kind === "removed"
        ? "text-rose-600 dark:text-rose-400"
        : "text-stone-300 dark:text-stone-700";

  return (
    <div className={`flex-1 min-w-0 flex ${bg}`}>
      <span className="w-10 px-2 text-right text-stone-400 dark:text-stone-600 select-none shrink-0">
        {lineNo ?? ""}
      </span>
      <span className={`w-3 text-center select-none shrink-0 ${signColor}`}>{sign}</span>
      <pre className="px-2 whitespace-pre overflow-x-auto flex-1 text-stone-700 dark:text-stone-300 m-0">
        {line ?? ""}
      </pre>
    </div>
  );
}

function UnifiedView({ rows }: { rows: UnifiedRow[] }) {
  return (
    <div className="min-w-fit">
      {rows.map((r, i) => (
        <UnifiedRowEl key={i} row={r} />
      ))}
    </div>
  );
}

function UnifiedRowEl({ row }: { row: UnifiedRow }) {
  const bg =
    row.kind === "added"
      ? "bg-emerald-50 dark:bg-emerald-950/25"
      : row.kind === "removed"
        ? "bg-rose-50 dark:bg-rose-950/25"
        : "";
  const sign = row.kind === "added" ? "+" : row.kind === "removed" ? "−" : " ";
  const signColor =
    row.kind === "added"
      ? "text-emerald-600 dark:text-emerald-400"
      : row.kind === "removed"
        ? "text-rose-600 dark:text-rose-400"
        : "text-stone-300 dark:text-stone-700";
  return (
    <div className={`flex ${bg}`}>
      <span className="w-10 px-2 text-right text-stone-400 dark:text-stone-600 select-none shrink-0">
        {row.leftNo ?? ""}
      </span>
      <span className="w-10 px-2 text-right text-stone-400 dark:text-stone-600 select-none shrink-0">
        {row.rightNo ?? ""}
      </span>
      <span className={`w-3 text-center select-none shrink-0 ${signColor}`}>{sign}</span>
      <pre className="px-2 whitespace-pre overflow-x-auto flex-1 text-stone-700 dark:text-stone-300 m-0">
        {row.line}
      </pre>
    </div>
  );
}
