import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  ArrowSquareOut,
  ArrowUp,
  ArrowDown,
  ArrowsHorizontal,
  ArrowsInLineHorizontal,
  Clock,
  Copy,
  FileText,
  FolderOpen,
  Gear,
  Hash,
  MagnifyingGlass,
  Moon,
  Printer,
  SidebarSimple,
  Sun,
  TextT,
  X,
} from "@phosphor-icons/react";
import { useSettingsStore, type ContentWidth } from "@/features/settings/store";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject, KeyboardEvent as ReactKeyboardEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import mermaid from "mermaid";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark-dimmed.css";

/* ─── types ───────────────────────────────────────────────────────── */

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface Stats {
  words: number;
  chars: number;
  readingTime: number;
  headings: number;
  lines: number;
}

type Frontmatter = Record<string, string>;

/* ─── utilities ───────────────────────────────────────────────────── */

const SUPPORTED_EXTS =
  /\.(md|mdx|markdown|mdown|txt|mkd|mkdn|mdwn|mdtxt|mdtext|rmd)$/i;

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseFrontmatter(raw: string): {
  body: string;
  fm: Frontmatter;
} {
  const match = raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!match) return { body: raw, fm: {} };
  const fm: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    fm[line.slice(0, colon).trim()] = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return { body: raw.slice(match[0].length), fm };
}

function extractHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/);
    if (!m) continue;
    const text = m[2]
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim();
    headings.push({ level: m[1].length, text, id: slugify(text) });
  }
  return headings;
}

function computeStats(body: string): Stats {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const chars = body.replace(/\s/g, "").length;
  const lines = body.split("\n").length;
  const headings = (body.match(/^#{1,6}[ \t]/gm) ?? []).length;
  return { words, chars, lines, headings, readingTime: Math.max(1, Math.ceil(words / 238)) };
}

/* ─── MermaidBlock ─────────────────────────────────────────────────
   Isolated memo component — never causes parent re-renders.        */

let mermaidCounter = 0;

const MermaidBlock = memo(function MermaidBlock({
  code,
  dark,
}: {
  code: string;
  dark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-${++mermaidCounter}`);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;

    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "inherit",
    });

    mermaid
      .render(id.current, code)
      .then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => {
        if (!cancelled && ref.current) {
          ref.current.textContent = `Diagram error: ${String(e)}`;
        }
      });

    return () => { cancelled = true; };
  }, [code, dark]);

  return (
    <div
      ref={ref}
      className="my-5 flex justify-center overflow-auto rounded-xl p-5 bg-stone-50 dark:bg-stone-900/60 not-prose"
    />
  );
});

/* ─── StatRow ─────────────────────────────────────────────────────── */

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

/* ─── Sidebar ─────────────────────────────────────────────────────── */

function Sidebar({
  filePath,
  headings,
  stats,
  frontmatter,
  activeId,
  onOpenFile,
  onJump,
  visible,
}: {
  filePath: string | null;
  headings: Heading[];
  stats: Stats | null;
  frontmatter: Frontmatter;
  activeId: string;
  onOpenFile: () => void;
  onJump: (id: string) => void;
  visible: boolean;
}) {
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
    <aside
      className="shrink-0 overflow-hidden border-r border-black/[0.06] dark:border-white/[0.06]"
      style={{
        width: visible ? 224 : 0,
        minWidth: visible ? 224 : 0,
        opacity: visible ? 1 : 0,
        transition:
          "width 300ms cubic-bezier(0.16,1,0.3,1), min-width 300ms cubic-bezier(0.16,1,0.3,1), opacity 220ms ease",
      }}
    >
      <div className="w-56 h-full flex flex-col overflow-hidden">
        {/* Open file */}
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

        <div className="h-px bg-stone-100 dark:bg-white/[0.05] mx-4 shrink-0" />

        {/* Outline — scrolls independently */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3">
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
                    style={{
                      paddingLeft: `${8 + Math.min(h.level - 1, 3) * 10}px`,
                    }}
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

        <div className="h-px bg-stone-100 dark:bg-white/[0.05] mx-4 shrink-0" />

        {/* Document info + stats */}
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
      </div>
    </aside>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────────── */

function EmptyState({ onOpenFile }: { onOpenFile: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-8">
      <div className="w-[52px] h-[52px] rounded-[14px] border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-300 dark:text-stone-700">
        <FileText size={24} weight="thin" />
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-[15px] font-medium text-stone-600 dark:text-stone-400 tracking-tight">
          No document open
        </p>
        <p className="text-sm text-stone-400 dark:text-stone-600 max-w-[28ch] leading-relaxed">
          Open a Markdown file to start reading — or drag one onto the window.
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenFile}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.16)] active:translate-y-0 active:scale-[0.98]"
        style={{ transition: "all 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <FolderOpen size={14} />
        Choose file
      </button>

      <p className="text-[11px] font-mono text-stone-400 dark:text-stone-600 tracking-wide text-center leading-relaxed">
        .md · .mdx · .markdown · .mdown
        <br />
        .txt · .rmd · .mkd · .mdwn
      </p>
    </div>
  );
}

/* ─── SearchBar ───────────────────────────────────────────────────── */

interface SearchBarProps {
  open: boolean;
  onClose: () => void;
  scrollContainer: RefObject<HTMLElement | null>;
}

const SearchBar = memo(function SearchBar({ open, onClose, scrollContainer }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);

  const clearMarks = useCallback(() => {
    for (const m of marksRef.current) {
      const parent = m.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
      parent.normalize();
    }
    marksRef.current = [];
  }, []);

  const highlight = useCallback((q: string) => {
    clearMarks();
    if (!q) { setMatchCount(0); setMatchIndex(0); return; }

    const article = scrollContainer.current?.querySelector("article");
    if (!article) return;

    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent && ["SCRIPT", "STYLE", "CODE", "PRE", "MARK"].includes(parent.tagName)) continue;
      textNodes.push(node as Text);
    }

    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const newMarks: HTMLElement[] = [];

    for (const tn of textNodes) {
      const text = tn.nodeValue ?? "";
      if (!re.test(text)) { re.lastIndex = 0; continue; }
      re.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const mark = document.createElement("mark");
        mark.className = "bg-yellow-300/60 dark:bg-yellow-500/40 rounded-[2px] text-inherit";
        mark.textContent = m[0];
        frag.appendChild(mark);
        newMarks.push(mark);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      tn.parentNode?.replaceChild(frag, tn);
    }

    marksRef.current = newMarks;
    setMatchCount(newMarks.length);
    setMatchIndex(newMarks.length > 0 ? 1 : 0);
    newMarks[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
    newMarks[0]?.classList.add("ring-2", "ring-yellow-400", "dark:ring-yellow-500");
  }, [clearMarks, scrollContainer]);

  const scrollToMatch = useCallback((marks: HTMLElement[], idx: number) => {
    for (const m of marks) m.classList.remove("ring-2", "ring-yellow-400", "dark:ring-yellow-500");
    const target = marks[idx];
    if (!target) return;
    target.classList.add("ring-2", "ring-yellow-400", "dark:ring-yellow-500");
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const next = useCallback(() => {
    if (!marksRef.current.length) return;
    const ni = matchIndex % marksRef.current.length;
    setMatchIndex(ni + 1);
    scrollToMatch(marksRef.current, ni);
  }, [matchIndex, scrollToMatch]);

  const prev = useCallback(() => {
    if (!marksRef.current.length) return;
    const pi = (matchIndex - 2 + marksRef.current.length) % marksRef.current.length;
    setMatchIndex(pi + 1);
    scrollToMatch(marksRef.current, pi);
  }, [matchIndex, scrollToMatch]);

  // Re-highlight when query changes (debounced)
  useEffect(() => {
    const id = setTimeout(() => highlight(query), 120);
    return () => clearTimeout(id);
  }, [query, highlight]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      clearMarks();
      setQuery("");
      setMatchCount(0);
      setMatchIndex(0);
    }
  }, [open, clearMarks]);

  const handleKey = useCallback((e: ReactKeyboardEvent) => {
    if (e.key === "Enter") { e.shiftKey ? prev() : next(); }
    if (e.key === "Escape") { onClose(); }
  }, [next, prev, onClose]);

  if (!open) return null;

  return (
    <div
      className="absolute top-0 right-0 z-50 m-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#252525]/95 border border-black/[0.08] dark:border-white/[0.10] shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
      style={{ backdropFilter: "blur(12px)" }}
    >
      <MagnifyingGlass size={13} className="text-stone-400 dark:text-stone-600 shrink-0" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Find in document…"
        className="w-44 text-[13px] bg-transparent text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none"
      />
      {query && (
        <span className="text-[11px] font-mono text-stone-400 dark:text-stone-600 shrink-0 tabular-nums">
          {matchCount === 0 ? "0" : `${matchIndex}/${matchCount}`}
        </span>
      )}
      <button type="button" onClick={prev} disabled={matchCount === 0} className="p-0.5 rounded text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 disabled:opacity-30 transition-colors">
        <ArrowUp size={12} />
      </button>
      <button type="button" onClick={next} disabled={matchCount === 0} className="p-0.5 rounded text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 disabled:opacity-30 transition-colors">
        <ArrowDown size={12} />
      </button>
      <button type="button" onClick={onClose} className="p-0.5 rounded text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors">
        <X size={12} />
      </button>
    </div>
  );
});

/* ─── MarkdownContent ─────────────────────────────────────────────── */

function MarkdownContent({
  body,
  dark,
  filePath,
  onActiveId,
  contentWidth,
}: {
  body: string;
  dark: boolean;
  filePath: string | null;
  onActiveId: (id: string) => void;
  contentWidth: ContentWidth;
}) {
  const articleRef = useRef<HTMLDivElement>(null);

  /* Active heading tracking via IntersectionObserver */
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) onActiveId(visible[0].target.id);
      },
      { root: null, rootMargin: "-48px 0px -74% 0px", threshold: 0 },
    );

    article
      .querySelectorAll("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [body, onActiveId]);

  /* Custom components — mermaid interception + local image rewriting */
  const components = useMemo<Components>(
    () => ({
      code({ className, children, ...rest }) {
        if (className?.includes("language-mermaid")) {
          return (
            <MermaidBlock code={String(children ?? "").trim()} dark={dark} />
          );
        }
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
      img({ src, alt, ...rest }) {
        const resolved = src && filePath && !/^https?:\/\//i.test(src) && !src.startsWith("data:")
          ? `md-asset://localhost/${encodeURIComponent(src)}`
          : src;
        // biome-ignore lint/a11y/useAltText: alt forwarded from markdown
        return <img src={resolved} alt={alt} {...rest} />;
      },
    }),
    [dark, filePath],
  );

  const widthClass =
    contentWidth === "full" ? "max-w-none px-16" : "max-w-[72ch] px-10";

  return (
    <div
      ref={articleRef}
      className={`mx-auto py-12 content-fade-in ${widthClass}`}
    >
      <article
        className="
          prose prose-stone dark:prose-invert max-w-none select-text font-reading
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-p:leading-[1.78] prose-p:text-stone-700 dark:prose-p:text-stone-300
          prose-a:text-stone-700 dark:prose-a:text-stone-300 prose-a:no-underline prose-a:border-b prose-a:border-stone-400/40 dark:prose-a:border-stone-600/40 hover:prose-a:border-stone-700 dark:hover:prose-a:border-stone-300
          prose-blockquote:border-stone-300 dark:prose-blockquote:border-stone-700 prose-blockquote:not-italic prose-blockquote:text-stone-500 dark:prose-blockquote:text-stone-500
          prose-code:text-stone-800 dark:prose-code:text-stone-200 prose-code:bg-stone-100 dark:prose-code:bg-white/[0.07] prose-code:rounded-md prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-medium prose-code:before:hidden prose-code:after:hidden
          prose-pre:p-0 prose-pre:bg-transparent prose-pre:overflow-hidden
          [&_pre_code.hljs]:rounded-xl [&_pre_code.hljs]:block [&_pre_code.hljs]:p-5 [&_pre_code.hljs]:text-sm [&_pre_code.hljs]:leading-relaxed
          prose-img:rounded-xl
          prose-hr:border-stone-200 dark:prose-hr:border-stone-800
          prose-strong:text-stone-900 dark:prose-strong:text-stone-100
          prose-table:text-sm prose-th:border-stone-300 dark:prose-th:border-stone-700 prose-td:border-stone-200 dark:prose-td:border-stone-800
          [&_.task-list-item]:list-none [&_.task-list-item_input[type=checkbox]]:mr-2 [&_.task-list-item_input[type=checkbox]]:cursor-default
        "
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            rehypeKatex,
            [rehypeHighlight, { ignoreMissing: true }],
            rehypeSlug,
          ]}
          components={components}
        >
          {body}
        </ReactMarkdown>
      </article>
    </div>
  );
}

/* ─── HomePage ────────────────────────────────────────────────────── */

export function HomePage() {
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const darkOverride = useSettingsStore((s) => s.dark);
  const setDarkOverride = useSettingsStore((s) => s.setDark);
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const setSidebarOpen = useSettingsStore((s) => s.setSidebarOpen);
  const contentWidth = useSettingsStore((s) => s.contentWidth);
  const setContentWidth = useSettingsStore((s) => s.setContentWidth);
  const dark = darkOverride ?? systemDark;
  const [error, setError] = useState<string | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  /* Track system dark-mode changes when no explicit override */
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  /* Parse document: strip frontmatter, compute stats + headings */
  const { body, frontmatter, stats, headings } = useMemo(() => {
    if (!rawContent) return { body: null, frontmatter: {}, stats: null, headings: [] };
    const { body, fm } = parseFrontmatter(rawContent);
    return {
      body,
      frontmatter: fm,
      stats: computeStats(body),
      headings: extractHeadings(body),
    };
  }, [rawContent]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  /* Open file via dialog */
  const openMdFile = useCallback(async (path: string) => {
    try {
      setError(null);
      const text = await invoke<string>("read_md_file", { path });
      setFilePath(path);
      setRawContent(text);
      setActiveHeadingId("");
      setSearchOpen(false);
      // Tell Rust the document directory so md-asset:// can resolve relative images
      const dir = path.replace(/[\\/][^\\/]+$/, "");
      invoke("set_doc_dir", { dir }).catch(() => null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const openFilePicker = useCallback(async () => {
    const path = await openDialog({
      multiple: false,
      filters: [
        {
          name: "Markdown",
          extensions: ["md", "mdx", "markdown", "mdown", "txt", "mkd", "mkdn", "mdwn", "mdtxt", "mdtext", "rmd"],
        },
      ],
    }).catch(() => null);
    if (path) openMdFile(path as string);
  }, [openMdFile]);

  /* Drag and drop */
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((e) => {
        if (e.payload.type === "drop") {
          const md = (e.payload as { type: "drop"; paths: string[] }).paths.find(
            (p) => SUPPORTED_EXTS.test(p),
          );
          if (md) openMdFile(md);
        }
      })
      .then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, [openMdFile]);

  /* OS file-open: cold start (Explorer double-click on closed app) +
     warm start (single-instance forwarded path) */
  useEffect(() => {
    invoke<string | null>("take_pending_open")
      .then((p) => { if (p) openMdFile(p); })
      .catch(() => null);

    let unlisten: (() => void) | undefined;
    listen<string>("open-file", (e) => {
      if (e.payload) openMdFile(e.payload);
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, [openMdFile]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "o") { e.preventDefault(); openFilePicker(); }
      if (mod && e.key === "p" && body) { e.preventDefault(); window.print(); }
      if (mod && e.key === "c" && e.shiftKey && body) {
        e.preventDefault();
        navigator.clipboard.writeText(rawContent ?? "");
      }
      if (mod && e.key === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openFilePicker, body, rawContent]);

  /* TOC jump */
  const jumpToHeading = useCallback(
    (id: string) => {
      const main = mainRef.current;
      if (!main) return;
      const el = main.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
      if (!el) return;
      setActiveHeadingId(id);
      const offset = el.offsetTop - 48;
      main.scrollTo({ top: offset, behavior: "smooth" });
    },
    [],
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8f7f5] dark:bg-[#181818]">
      {/* Topbar */}
      <header
        data-tauri-drag-region
        className="h-10 shrink-0 flex items-center gap-2 px-3 border-b border-black/[0.06] dark:border-white/[0.06] select-none"
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors duration-150"
          title="Toggle sidebar"
        >
          <SidebarSimple size={15} />
        </button>

        <div className="w-px h-3.5 bg-stone-200 dark:bg-stone-800 shrink-0" />

        <span className="text-[13px] font-medium text-stone-500 dark:text-stone-500 tracking-tight shrink-0">
          Markdown Reader
        </span>

        {filePath && (
          <>
            <span className="text-stone-300 dark:text-stone-700 text-sm shrink-0">/</span>
            <span
              className="text-[13px] text-stone-500 dark:text-stone-500 truncate"
              title={filePath}
            >
              {filePath.split(/[\\/]/).pop()}
            </span>
          </>
        )}

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-0.5">
          {body && (
            <>
              <TopbarBtn
                title="Find in document (⌘F)"
                onClick={() => setSearchOpen((v) => !v)}
                active={searchOpen}
              >
                <MagnifyingGlass size={14} />
              </TopbarBtn>
              <TopbarBtn
                title="Copy Markdown source (⌘⇧C)"
                onClick={() => navigator.clipboard.writeText(rawContent ?? "")}
              >
                <Copy size={14} />
              </TopbarBtn>
              <TopbarBtn
                title="Print (⌘P)"
                onClick={() => window.print()}
              >
                <Printer size={14} />
              </TopbarBtn>
              {filePath && (
                <TopbarBtn
                  title="Open in default editor"
                  onClick={() => shellOpen(filePath).catch(() => null)}
                >
                  <ArrowSquareOut size={14} />
                </TopbarBtn>
              )}
              <div className="w-px h-3.5 bg-stone-200 dark:bg-stone-800 mx-1" />
            </>
          )}

          <TopbarBtn
            title={dark ? "Switch to light" : "Switch to dark"}
            onClick={() => setDarkOverride(!dark)}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </TopbarBtn>

          <div className="relative">
            <TopbarBtn
              title="Settings"
              onClick={() => setSettingsOpen((v) => !v)}
              active={settingsOpen}
            >
              <Gear size={15} />
            </TopbarBtn>
            {settingsOpen && (
              <SettingsMenu
                contentWidth={contentWidth}
                onContentWidth={setContentWidth}
                darkOverride={darkOverride}
                onDarkOverride={setDarkOverride}
                onClose={() => setSettingsOpen(false)}
              />
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          filePath={filePath}
          headings={headings}
          stats={stats}
          frontmatter={frontmatter}
          activeId={activeHeadingId}
          onOpenFile={openFilePicker}
          onJump={jumpToHeading}
          visible={sidebarOpen}
        />

        <main ref={mainRef} className="flex-1 overflow-y-auto relative">
          <SearchBar
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            scrollContainer={mainRef}
          />
          {error && (
            <div className="mx-5 mt-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-sm text-red-600 dark:text-red-400 select-text">
              {error}
            </div>
          )}

          {!body && !error && <EmptyState onOpenFile={openFilePicker} />}

          {body && (
            <MarkdownContent
              key={filePath}
              body={body}
              dark={dark}
              filePath={filePath}
              onActiveId={setActiveHeadingId}
              contentWidth={contentWidth}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ─── SettingsMenu ────────────────────────────────────────────────── */

function SettingsMenu({
  contentWidth,
  onContentWidth,
  darkOverride,
  onDarkOverride,
  onClose,
}: {
  contentWidth: ContentWidth;
  onContentWidth: (w: ContentWidth) => void;
  darkOverride: boolean | null;
  onDarkOverride: (d: boolean | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    setTimeout(() => window.addEventListener("mousedown", handler), 0);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl bg-white/97 dark:bg-[#252525]/97 border border-black/[0.08] dark:border-white/[0.10] shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-2"
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="px-2 pt-1 pb-2">
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-stone-400 dark:text-stone-600">
          Content width
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 px-1 pb-2">
        <SettingsToggle
          icon={<ArrowsInLineHorizontal size={13} />}
          label="Comfortable"
          active={contentWidth === "comfortable"}
          onClick={() => onContentWidth("comfortable")}
        />
        <SettingsToggle
          icon={<ArrowsHorizontal size={13} />}
          label="Full width"
          active={contentWidth === "full"}
          onClick={() => onContentWidth("full")}
        />
      </div>
      <div className="h-px bg-stone-100 dark:bg-white/[0.05] my-1" />
      <div className="px-2 pt-1 pb-2">
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-stone-400 dark:text-stone-600">
          Theme
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1 px-1 pb-1">
        <SettingsToggle
          label="System"
          active={darkOverride === null}
          onClick={() => onDarkOverride(null)}
        />
        <SettingsToggle
          icon={<Sun size={13} />}
          label="Light"
          active={darkOverride === false}
          onClick={() => onDarkOverride(false)}
        />
        <SettingsToggle
          icon={<Moon size={13} />}
          label="Dark"
          active={darkOverride === true}
          onClick={() => onDarkOverride(true)}
        />
      </div>
    </div>
  );
}

function SettingsToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] transition-colors duration-100 ${
        active
          ? "bg-stone-100 dark:bg-white/[0.08] text-stone-800 dark:text-stone-100 font-medium"
          : "text-stone-500 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/[0.04]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── TopbarBtn ───────────────────────────────────────────────────── */

function TopbarBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors duration-150 ${
        active
          ? "text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-white/[0.08]"
          : "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

export const Component = HomePage;
