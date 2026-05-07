import { diffLines, type Change } from "diff";

export type RowKind = "equal" | "modified" | "removed" | "added";

export interface SideBySideRow {
  left: string | null;
  right: string | null;
  /** What this row represents in the diff. */
  kind: RowKind;
  leftNo: number | null;
  rightNo: number | null;
}

export type UnifiedKind = "equal" | "removed" | "added";

export interface UnifiedRow {
  line: string;
  kind: UnifiedKind;
  leftNo: number | null;
  rightNo: number | null;
}

function splitLines(value: string): string[] {
  if (value === "") return [];
  const stripped = value.endsWith("\n") ? value.slice(0, -1) : value;
  return stripped.split("\n");
}

export function computeChanges(a: string, b: string): Change[] {
  return diffLines(a, b);
}

export function toSideBySide(changes: Change[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const lines = splitLines(c.value);
    if (lines.length === 0) continue;

    if (!c.added && !c.removed) {
      for (const line of lines) {
        rows.push({
          left: line,
          right: line,
          kind: "equal",
          leftNo: leftLine++,
          rightNo: rightLine++,
        });
      }
      continue;
    }

    if (c.removed) {
      const next = changes[i + 1];
      if (next?.added) {
        const removedLines = lines;
        const addedLines = splitLines(next.value);
        const max = Math.max(removedLines.length, addedLines.length);
        for (let j = 0; j < max; j++) {
          const hasLeft = j < removedLines.length;
          const hasRight = j < addedLines.length;
          rows.push({
            left: hasLeft ? removedLines[j] : null,
            right: hasRight ? addedLines[j] : null,
            kind: "modified",
            leftNo: hasLeft ? leftLine++ : null,
            rightNo: hasRight ? rightLine++ : null,
          });
        }
        i++; // skip the paired added chunk
        continue;
      }
      for (const line of lines) {
        rows.push({
          left: line,
          right: null,
          kind: "removed",
          leftNo: leftLine++,
          rightNo: null,
        });
      }
      continue;
    }

    if (c.added) {
      for (const line of lines) {
        rows.push({
          left: null,
          right: line,
          kind: "added",
          leftNo: null,
          rightNo: rightLine++,
        });
      }
    }
  }

  return rows;
}

export function toUnified(changes: Change[]): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (const c of changes) {
    const lines = splitLines(c.value);
    if (lines.length === 0) continue;
    if (!c.added && !c.removed) {
      for (const line of lines) {
        rows.push({
          line,
          kind: "equal",
          leftNo: leftLine++,
          rightNo: rightLine++,
        });
      }
    } else if (c.removed) {
      for (const line of lines) {
        rows.push({
          line,
          kind: "removed",
          leftNo: leftLine++,
          rightNo: null,
        });
      }
    } else if (c.added) {
      for (const line of lines) {
        rows.push({
          line,
          kind: "added",
          leftNo: null,
          rightNo: rightLine++,
        });
      }
    }
  }

  return rows;
}

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
}

export function summarize(rows: SideBySideRow[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let modified = 0;
  for (const r of rows) {
    if (r.kind === "added") added++;
    else if (r.kind === "removed") removed++;
    else if (r.kind === "modified") modified++;
  }
  return { added, removed, modified };
}
