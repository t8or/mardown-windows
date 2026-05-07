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

export interface Hunk {
  /** Inclusive start row index in the side-by-side rows. */
  start: number;
  /** Exclusive end row index. */
  end: number;
}

export function findHunks(rows: SideBySideRow[]): Hunk[] {
  const hunks: Hunk[] = [];
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].kind !== "equal") {
      if (start === -1) start = i;
    } else if (start !== -1) {
      hunks.push({ start, end: i });
      start = -1;
    }
  }
  if (start !== -1) hunks.push({ start, end: rows.length });
  return hunks;
}

export type HunkChoice = "left" | "right" | "both" | "none";

export function assembleMerged(
  rows: SideBySideRow[],
  hunks: Hunk[],
  choices: Record<number, HunkChoice>,
): string {
  const out: string[] = [];
  let cursor = 0;
  for (let h = 0; h < hunks.length; h++) {
    const hunk = hunks[h];
    for (let i = cursor; i < hunk.start; i++) {
      const r = rows[i];
      if (r.left != null) out.push(r.left);
    }
    const choice = choices[h] ?? "left";
    for (let i = hunk.start; i < hunk.end; i++) {
      const r = rows[i];
      if (choice === "left" && r.left != null) out.push(r.left);
      else if (choice === "right" && r.right != null) out.push(r.right);
      else if (choice === "both") {
        if (r.left != null) out.push(r.left);
        if (r.right != null && r.right !== r.left) out.push(r.right);
      }
      // 'none' → skip
    }
    cursor = hunk.end;
  }
  for (let i = cursor; i < rows.length; i++) {
    const r = rows[i];
    if (r.left != null) out.push(r.left);
  }
  return out.join("\n");
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
