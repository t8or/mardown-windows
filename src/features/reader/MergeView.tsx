import { CaretLeft, CaretRight, Eye, FloppyDisk, Pencil, Plus, X } from "@phosphor-icons/react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { useReaderStore } from "./store";
import {
  assembleMerged,
  computeChanges,
  findHunks,
  toSideBySide,
  type HunkChoice,
  type SideBySideRow,
} from "./diff";

export function MergeView() {
  const files = useReaderStore((s) => s.files);
  const pair = useReaderStore((s) => s.pair);
  const endComparison = useReaderStore((s) => s.endComparison);
  const startDiff = useReaderStore((s) => s.startDiff);
  const openOrFocus = useReaderStore((s) => s.openOrFocus);

  const a = pair ? files[pair.a] : null;
  const b = pair ? files[pair.b] : null;

  const { rows, hunks } = useMemo(() => {
    if (!a || !b) {
      return { rows: [] as SideBySideRow[], hunks: [] };
    }
    const changes = computeChanges(a.content, b.content);
    const rows = toSideBySide(changes);
    return { rows, hunks: findHunks(rows) };
  }, [a, b]);

  const [choices, setChoices] = useState<Record<number, HunkChoice>>({});
  const [mode, setMode] = useState<"pick" | "preview">("pick");
  const [error, setError] = useState<string | null>(null);

  const merged = useMemo(
    () => assembleMerged(rows, hunks, choices),
    [rows, hunks, choices],
  );

  if (!a || !b || !pair) return null;

  const setChoice = (idx: number, c: HunkChoice) =>
    setChoices((prev) => ({ ...prev, [idx]: c }));

  const handleSave = async () => {
    const defaultName = `merged-${(a.path.split(/[\\/]/).pop() ?? "merged.md").replace(/\.[^.]+$/, "")}.md`;
    try {
      const target = await save({
        defaultPath: defaultName,
        filters: [
          {
            name: "Markdown",
            extensions: ["md", "mdx", "markdown", "mdown", "txt"],
          },
        ],
      });
      if (!target) return;
      await invoke("save_md_file", { path: target, content: merged });
      // Open the new merged file as a fresh tab and exit merge view
      openOrFocus({ path: target, content: merged });
    } catch (e) {
      setError(String(e));
    }
  };

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

        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100 dark:bg-white/[0.04] shrink-0">
          <ModeBtn
            icon={<Pencil size={11} />}
            label="Pick"
            active={mode === "pick"}
            onClick={() => setMode("pick")}
          />
          <ModeBtn
            icon={<Eye size={11} />}
            label="Preview"
            active={mode === "preview"}
            onClick={() => setMode("preview")}
          />
        </div>

        <button
          type="button"
          onClick={() => pair && startDiff(pair.a, pair.b)}
          className="text-[11px] px-2 py-1 rounded-md bg-stone-100 dark:bg-white/[0.04] text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/[0.08] hover:text-stone-800 dark:hover:text-stone-200 transition-colors shrink-0"
          title="Back to diff"
        >
          Diff
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="text-[11px] px-2 py-1 rounded-md bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <FloppyDisk size={11} />
          Save merged…
        </button>

        <button
          type="button"
          onClick={endComparison}
          className="p-1 rounded text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/[0.05] shrink-0"
          title="Close merge"
        >
          <X size={12} />
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto font-mono text-[12px] leading-[1.55] tabular-nums">
        {mode === "pick" ? (
          <PickerView rows={rows} hunks={hunks} choices={choices} setChoice={setChoice} />
        ) : (
          <PreviewView merged={merged} />
        )}
        {hunks.length === 0 && mode === "pick" && (
          <p className="px-4 py-8 text-stone-400 dark:text-stone-600 text-center">
            Files are identical — nothing to merge.
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

function PickerView({
  rows,
  hunks,
  choices,
  setChoice,
}: {
  rows: SideBySideRow[];
  hunks: { start: number; end: number }[];
  choices: Record<number, HunkChoice>;
  setChoice: (idx: number, c: HunkChoice) => void;
}) {
  const hunkAtStart = useMemo(() => {
    const m = new Map<number, number>();
    hunks.forEach((h, i) => m.set(h.start, i));
    return m;
  }, [hunks]);
  const hunkAtEnd = useMemo(() => {
    const ends = new Set<number>();
    for (const h of hunks) ends.add(h.end - 1);
    return ends;
  }, [hunks]);

  return (
    <div className="min-w-fit">
      {rows.map((r, i) => {
        const startsHunk = hunkAtStart.get(i);
        const choice =
          startsHunk != null ? (choices[startsHunk] ?? "left") : null;
        const inHunk =
          startsHunk != null ||
          hunks.some((h) => i > h.start && i < h.end);
        const hunkIdx =
          startsHunk != null
            ? startsHunk
            : hunks.findIndex((h) => i >= h.start && i < h.end);
        const activeChoice =
          hunkIdx >= 0 ? (choices[hunkIdx] ?? "left") : null;
        return (
          <div key={i}>
            {startsHunk != null && (
              <HunkBar
                hunkIdx={startsHunk}
                choice={choice ?? "left"}
                onChoose={(c) => setChoice(startsHunk, c)}
              />
            )}
            <PickerRow row={r} inHunk={inHunk} choice={activeChoice} />
            {hunkAtEnd.has(i) && <div className="h-2" />}
          </div>
        );
      })}
    </div>
  );
}

function HunkBar({
  hunkIdx,
  choice,
  onChoose,
}: {
  hunkIdx: number;
  choice: HunkChoice;
  onChoose: (c: HunkChoice) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-3 py-1 mt-2 bg-stone-100 dark:bg-white/[0.04] border-y border-black/[0.04] dark:border-white/[0.04] text-[11px] sticky top-0 z-10">
      <span className="text-stone-500 dark:text-stone-500 mr-2 font-mono">
        Hunk {hunkIdx + 1}
      </span>
      <ChoiceBtn
        icon={<CaretLeft size={11} />}
        label="Use A"
        active={choice === "left"}
        onClick={() => onChoose("left")}
      />
      <ChoiceBtn
        label="Skip"
        active={choice === "none"}
        onClick={() => onChoose("none")}
      />
      <ChoiceBtn
        icon={<Plus size={11} />}
        label="Both"
        active={choice === "both"}
        onClick={() => onChoose("both")}
      />
      <ChoiceBtn
        icon={<CaretRight size={11} />}
        label="Use B"
        active={choice === "right"}
        onClick={() => onChoose("right")}
        iconRight
      />
    </div>
  );
}

function ChoiceBtn({
  icon,
  label,
  active,
  onClick,
  iconRight,
}: {
  icon?: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  iconRight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
        active
          ? "bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900"
          : "text-stone-500 dark:text-stone-500 hover:bg-stone-200 dark:hover:bg-white/[0.08] hover:text-stone-700 dark:hover:text-stone-300"
      }`}
    >
      {!iconRight && icon}
      <span className="font-medium">{label}</span>
      {iconRight && icon}
    </button>
  );
}

function PickerRow({
  row,
  inHunk,
  choice,
}: {
  row: SideBySideRow;
  inHunk: boolean;
  choice: HunkChoice | null;
}) {
  const leftKind: CellKind =
    row.kind === "equal" ? "equal" : row.kind === "added" ? "blank" : "removed";
  const rightKind: CellKind =
    row.kind === "equal" ? "equal" : row.kind === "removed" ? "blank" : "added";

  const leftSelected = inHunk && (choice === "left" || choice === "both");
  const rightSelected = inHunk && (choice === "right" || choice === "both");

  return (
    <div className="flex">
      <Cell
        line={row.left}
        kind={leftKind}
        lineNo={row.leftNo}
        selected={leftSelected}
      />
      <div className="w-px shrink-0 bg-black/[0.06] dark:bg-white/[0.06]" />
      <Cell
        line={row.right}
        kind={rightKind}
        lineNo={row.rightNo}
        selected={rightSelected}
      />
    </div>
  );
}

type CellKind = "equal" | "added" | "removed" | "blank";

function Cell({
  line,
  kind,
  lineNo,
  selected,
}: {
  line: string | null;
  kind: CellKind;
  lineNo: number | null;
  selected: boolean;
}) {
  const bg =
    kind === "added"
      ? "bg-emerald-50 dark:bg-emerald-950/25"
      : kind === "removed"
        ? "bg-rose-50 dark:bg-rose-950/25"
        : kind === "blank"
          ? "bg-stone-100/60 dark:bg-white/[0.02]"
          : "";
  const ring = selected
    ? "ring-1 ring-inset ring-stone-900/20 dark:ring-stone-100/20"
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
    <div className={`flex-1 min-w-0 flex ${bg} ${ring}`}>
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

function PreviewView({ merged }: { merged: string }) {
  const lines = merged.split("\n");
  return (
    <div className="min-w-fit">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-12 px-2 text-right text-stone-400 dark:text-stone-600 select-none shrink-0">
            {i + 1}
          </span>
          <pre className="px-2 whitespace-pre overflow-x-auto flex-1 text-stone-700 dark:text-stone-300 m-0">
            {line}
          </pre>
        </div>
      ))}
    </div>
  );
}
