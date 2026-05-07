import { Clock, FileText, Hash, TextT } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export interface Stats {
  words: number;
  chars: number;
  readingTime: number;
  headings: number;
  lines: number;
}

export type Frontmatter = Record<string, string>;

interface Props {
  filePath: string | null;
  headings: Heading[];
  stats: Stats | null;
  frontmatter: Frontmatter;
  activeId: string;
  onJump: (id: string) => void;
}

export function OutlinePanel({
  filePath,
  headings,
  stats,
  frontmatter,
  activeId,
  onJump,
}: Props) {
  const fileName = filePath ? (filePath.split(/[\\/]/).pop() ?? null) : null;
  const dir = filePath
    ? (() => {
        const parts = filePath.replace(/\\/g, "/").split("/").slice(0, -1);
        if (parts.length === 0) return null;
        return parts.length <= 2 ? parts.join("/") : `…/${parts.slice(-2).join("/")}`;
      })()
    : null;

  const fmEntries = Object.entries(frontmatter).slice(0, 8);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        {headings.length > 0 ? (
          <div className="px-2">
            <p className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-stone-400 dark:text-stone-600">
              Outline
            </p>
            {headings.map((h, i) => {
              const isActive = h.id === activeId;
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable
                  key={i}
                  type="button"
                  onClick={() => onJump(h.id)}
                  title={h.text}
                  className={`w-full text-left text-[12px] px-2 py-[3px] rounded-md truncate transition-colors duration-100 ${
                    isActive
                      ? "text-stone-800 dark:text-stone-100 bg-stone-100 dark:bg-white/[0.08] font-medium"
                      : "text-stone-500 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/[0.03]"
                  }`}
                  style={{ paddingLeft: `${8 + Math.min(h.level - 1, 3) * 10}px` }}
                >
                  {h.text}
                </button>
              );
            })}
          </div>
        ) : (
          !filePath && (
            <p className="px-5 text-xs text-stone-400 dark:text-stone-600 leading-relaxed">
              Open a file to see its outline.
              <br />
              <span className="font-mono text-[10px] mt-2 block">
                .md · .mdx · .markdown
                <br />
                .txt · .rmd · .mkd
              </span>
            </p>
          )
        )}
      </div>

      {(filePath || stats || fmEntries.length > 0) && (
        <>
          <div className="h-px bg-stone-100 dark:bg-white/[0.05] mx-4 shrink-0" />
          <div className="px-5 py-4 space-y-4 shrink-0">
            {filePath && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-stone-400 dark:text-stone-600">
                  Document
                </p>
                <div>
                  <p
                    className="text-[12px] font-medium text-stone-800 dark:text-stone-200 truncate leading-snug"
                    title={fileName ?? ""}
                  >
                    {fileName}
                  </p>
                  {dir && (
                    <p
                      className="text-[11px] text-stone-400 dark:text-stone-600 truncate leading-snug mt-0.5"
                      title={dir}
                    >
                      {dir}
                    </p>
                  )}
                </div>
              </div>
            )}

            {fmEntries.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-stone-400 dark:text-stone-600">
                  Properties
                </p>
                <div className="space-y-1">
                  {fmEntries.map(([k, v]) => (
                    <div key={k} className="flex gap-2 min-w-0">
                      <span className="text-[11px] text-stone-400 dark:text-stone-600 shrink-0">
                        {k}
                      </span>
                      <span
                        className="text-[11px] text-stone-600 dark:text-stone-400 truncate"
                        title={v}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-stone-400 dark:text-stone-600">
                  Statistics
                </p>
                <div className="space-y-2">
                  <StatRow icon={<TextT size={12} />} label="Words" value={stats.words.toLocaleString()} />
                  <StatRow icon={<Clock size={12} />} label="Read time" value={`${stats.readingTime} min`} />
                  <StatRow icon={<Hash size={12} />} label="Headings" value={String(stats.headings)} />
                  <StatRow icon={<FileText size={12} />} label="Lines" value={stats.lines.toLocaleString()} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-stone-400 dark:text-stone-600 w-3.5 shrink-0 flex items-center justify-center">
        {icon}
      </span>
      <span className="text-xs text-stone-500 dark:text-stone-500 min-w-0">{label}</span>
      <span className="ml-auto text-xs font-mono tabular-nums text-stone-700 dark:text-stone-300 shrink-0">
        {value}
      </span>
    </div>
  );
}
