import { invoke } from "@tauri-apps/api/core";

export interface FileEntry {
  path: string;
  name: string;
  parent: string;
  depth: number;
  line_count: number;
  size: number;
  modified_ms: number;
}

export interface SearchHit {
  path: string;
  name: string;
  line: number;
  col: number;
  text: string;
  before: string[];
  after: string[];
}

export function listMarkdownDir(root: string, maxDepth: number) {
  return invoke<FileEntry[]>("list_markdown_dir", { root, maxDepth });
}

export function searchMarkdown(args: {
  root: string;
  query: string;
  maxDepth: number;
  caseSensitive: boolean;
  regex: boolean;
  maxHits?: number;
}) {
  return invoke<SearchHit[]>("search_markdown", {
    root: args.root,
    query: args.query,
    maxDepth: args.maxDepth,
    caseSensitive: args.caseSensitive,
    regex: args.regex,
    maxHits: args.maxHits ?? 2000,
  });
}
