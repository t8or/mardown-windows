# Markdown Reader

A fast, focused desktop reader for Markdown files. Built for Windows 11 first; runs on macOS and Linux too.

Inspired by the macOS-only [`pluk-inc/md-preview.app`](https://github.com/pluk-inc/md-preview.app). Built with [Tauri 2](https://tauri.app), so the installer is small (~15 MB) and rendering uses the system WebView2 — no bundled Chromium.

---

## Features

- **GitHub-Flavored Markdown** — tables, task lists, autolinks, strikethrough.
- **Syntax-highlighted code blocks** (highlight.js, GitHub Dark Dimmed) with the `ignoreMissing` option so unknown languages don't break the render.
- **Math** — inline and display math via KaTeX.
- **Mermaid diagrams** — flowcharts, sequence diagrams, ER, etc.; theme follows the app's light/dark mode.
- **Live outline** — sidebar TOC with active-heading tracking via `IntersectionObserver`. Click any heading to jump.
- **Document statistics** — word count, estimated reading time, heading count, line count.
- **YAML frontmatter** — stripped from the rendered body and shown in a Properties panel.
- **Drag and drop** — drop a `.md` file onto the window to open it.
- **In-document search** — `Ctrl+F` opens a floating search bar with prev/next navigation and a match counter.
- **Local relative images** — `![diagram](./assets/foo.png)` resolves against the current document's directory through a custom `md-asset://` URI scheme (with path-traversal protection).
- **Print** — `Ctrl+P` prints the article with sidebar/topbar hidden and code blocks themed for paper.
- **Dark / light mode** — auto-detects system preference; manual toggle in the topbar.
- **Default `.md` handler on Windows** — installer registers Markdown Reader for `.md`, `.mdx`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`, `.mdwn`, `.rmd`. Single-instance: a second double-click routes the path into the running window.

## Keyboard shortcuts

| Action            | Shortcut         |
| ----------------- | ---------------- |
| Open file         | `Ctrl+O`         |
| Find in document  | `Ctrl+F`         |
| Print             | `Ctrl+P`         |
| Copy source       | `Ctrl+Shift+C`   |
| Next match        | `Enter` (in search) |
| Previous match    | `Shift+Enter` (in search) |
| Close search      | `Esc`            |

(On macOS, `Cmd` instead of `Ctrl`.)

---

## Prerequisites (Windows 11)

Install the toolchain once. All four are needed for `npm run tauri build`.

```powershell
# Node.js 20+ (for Vite, npm)
winget install OpenJS.NodeJS.LTS

# Rust toolchain (for the Tauri backend)
winget install Rustlang.Rustup
rustup default stable-msvc

# Microsoft C++ Build Tools (Rust on Windows links via MSVC)
winget install Microsoft.VisualStudio.2022.BuildTools
# In the installer that opens, select "Desktop development with C++"
```

WebView2 is preinstalled on Windows 11. On Windows 10, install the [Evergreen WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).

The first `cargo` build pulls and compiles ~300 crates and takes 3–5 minutes. Subsequent builds are incremental.

## Quick start (development)

```powershell
git clone https://github.com/t8or/mardown-windows.git
cd mardown-windows
npm install
npm run tauri dev
```

`tauri dev` starts Vite on `http://localhost:1420`, then launches the desktop window pointing at it. Hot reload works for both React and Rust (Rust changes trigger a rebuild + relaunch).

## Building a Windows installer

```powershell
npm run tauri build
```

Outputs land in `src-tauri/target/release/bundle/`:

- `nsis/Markdown Reader_0.1.0_x64-setup.exe` — NSIS installer, smaller, recommended for personal use.
- `msi/Markdown Reader_0.1.0_x64_en-US.msi` — MSI installer, friendlier for managed/enterprise deployment.

Both register the file associations declared in `src-tauri/tauri.conf.json` under `bundle.fileAssociations`.

## Set as the default Markdown app on Windows

After installing:

1. **Settings → Apps → Default apps**, search ".md", click the entry, pick *Markdown Reader*. Repeat for any other extensions you use (`.mdx`, `.markdown`, etc.).

Or per-file:

2. Right-click any `.md` → **Open with → Choose another app → Markdown Reader**, tick **Always use this app**.

Once set, double-clicking any registered Markdown file opens it in Markdown Reader. If the app is already running, the file is routed into the existing window (single-instance behavior).

---

## Project layout

```
mardown-windows/
├── src/
│   └── app/
│       ├── routes/home.tsx     # the entire reader UI (single feature file)
│       ├── global.css          # Tailwind v4 + theme variables + print styles
│       └── router.tsx          # react-router setup
├── src-tauri/
│   ├── src/main.rs             # Rust backend: md-asset:// scheme,
│   │                           # single-instance, file-open argv,
│   │                           # read_md_file / set_doc_dir / take_pending_open
│   ├── tauri.conf.json         # bundle config + fileAssociations
│   ├── capabilities/
│   │   └── migrated.json       # permission set (shell, dialog, process)
│   ├── icons/                  # icon.ico used by the Windows installer
│   └── Cargo.toml
├── index.html
├── package.json
└── vite.config.ts
```

## Tech stack

- **Tauri 2** — Rust shell, WebView2 frontend, native installer
- **React 19** + **TypeScript 6**
- **Vite 8**
- **Tailwind CSS v4** (CSS-based config) + **`@tailwindcss/typography`**
- **Phosphor icons**
- **react-markdown** + **remark-gfm** + **remark-math** + **rehype-katex** + **rehype-highlight** + **rehype-slug**
- **highlight.js** (GitHub Dark Dimmed)
- **KaTeX**
- **Mermaid**
- **react-router**

Inspiration: [`pluk-inc/md-preview.app`](https://github.com/pluk-inc/md-preview.app) (macOS, Swift). The `md-asset://` scheme handler is a direct port of that project's `MarkdownAssetSchemeHandler.swift`.

## License

See [LICENSE](./LICENSE).
