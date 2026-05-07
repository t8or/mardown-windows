 # Markdown Reader                                                                                                     
                                                                                                                        
  A fast, focused desktop reader for Markdown files. Built for Windows 11 first; runs on macOS and Linux too.           
                                                                                                                        
  Inspired by the macOS-only [`pluk-inc/md-preview.app`](https://github.com/pluk-inc/md-preview.app). Built with [Tauri 
  2](https://tauri.app), so the installer is small (~15 MB) and rendering uses the system WebView2 — no bundled
  Chromium.                                                                                                             
                                                                      
  ---                                                                                                                   
  
  ## Features                                                                                                           
                                                                      
  ### Reading
  - **GitHub-Flavored Markdown** — tables, task lists, autolinks, strikethrough.
  - **Syntax-highlighted code blocks** (highlight.js, GitHub Dark Dimmed) with the `ignoreMissing` option so unknown    
  languages don't break the render.                                                                                     
  - **Math** — inline and display math via KaTeX.                                                                       
  - **Mermaid diagrams** — flowcharts, sequence diagrams, ER, etc.; theme follows the app's light/dark mode.            
  - **YAML frontmatter** — stripped from the rendered body and shown in a Properties panel.                             
  - **Local relative images** — `![diagram](./assets/foo.png)` resolves against the current document's directory through
   a custom `md-asset://` URI scheme (with path-traversal protection).                                                  
  - **Document statistics** — word count, estimated reading time, heading count, line count.                            
  - **In-document search** — `Ctrl+F` opens a floating search bar with prev/next navigation and a match counter.        
  - **Print** — `Ctrl+P` prints the article with sidebar/topbar hidden and code blocks themed for paper.                
                                                                                                                        
  ### Tabbed sidebar                                                                                                    
  - **Outline** — live TOC with active-heading tracking via `IntersectionObserver`. Click any heading to jump.          
  - **Files** — recursive tree of every markdown file under the open file's folder, with line-count next to each name.  
  Sortable by name / LOC / modified, filterable, with a parent-folder breadcrumb to walk up.                            
  - **Search** — cross-folder grep with a depth slider (1–5), case-sensitive and regex toggles, and results grouped by  
  file. Respects `.gitignore` by default.                                                                               
  - **Held** — pin any search hit or whole file to keep it within reach. Held items persist across launches.
                                                                                                                        
  ### Multi-file workspace                                            
  - **Tabs** — opening a file (picker, drag-drop, OS file association) adds a tab instead of replacing the active one.  
  - **Diff view** — right-click a tab → *Diff with…* to compare against another open tab (or pick from disk if only one 
  tab is open). Toggle between split (side-by-side with per-side line numbers) and unified modes; toolbar shows the     
  additions/removals tally.                                                                                             
  - **Merge view** — right-click → *Merge with…* opens a 2-pane hunk picker. Choose **Use A**, **Skip**, **Both**, or   
  **Use B** per hunk; flip to **Preview** to see the assembled result, then **Save merged…** writes a new file and opens
   it as a fresh tab.
                                                                                                                        
  ### Polish                                                                                                            
  - **Drag and drop** — drop a `.md` file onto the window to open it.
  - **Persisted settings** — gear menu in the topbar toggles content width (Comfortable 72ch / Full) and forces a theme 
  override (System / Light / Dark). Search defaults, sidebar visibility, and active tab also stick across launches via  
  `tauri-plugin-store`.
  - **Dark / light mode** — auto-detects system preference; manual override in the settings menu.                       
  - **Default `.md` handler on Windows** — installer registers Markdown Reader for `.md`, `.mdx`, `.markdown`, `.mdown`,
   `.mkd`, `.mkdn`, `.mdwn`, `.rmd`. Single-instance: a second double-click routes the path into the running window.    
                                                                                                                        
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
                                                                                                                        
  Right-click any tab to access **Diff with…** / **Merge with…**.                                                       
                                                                      
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
                                                                                                                        
  WebView2 is preinstalled on Windows 11. On Windows 10, install the [Evergreen WebView2                                
  Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). 
                                                                                                                        
  The first `cargo` build pulls and compiles ~300 crates and takes 3–5 minutes. Subsequent builds are incremental.      
   
  ## Quick start (development)                                                                                          
                                                                      
  ```powershell                                                                                                         
  git clone https://github.com/t8or/mardown-windows.git               
  cd mardown-windows                                                                                                    
  npm install
  npm run tauri dev                                                                                                     
  ```                                                                 

  `tauri dev` starts Vite on `http://localhost:1420`, then launches the desktop window pointing at it. Hot reload works 
  for both React and Rust (Rust changes trigger a rebuild + relaunch).
                                                                                                                        
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

  1. **Settings → Apps → Default apps**, search ".md", click the entry, pick *Markdown Reader*. Repeat for any other    
  extensions you use (`.mdx`, `.markdown`, etc.).
                                                                                                                        
  Or per-file:                                                        

  2. Right-click any `.md` → **Open with → Choose another app → Markdown Reader**, tick **Always use this app**.        
   
  Once set, double-clicking any registered Markdown file opens it in Markdown Reader. If the app is already running, the
   file is routed into the existing window (single-instance behavior).
                                                                                                                        
  ---                                                                 

  ## Project layout

  ```
  mardown-windows/
  ├── src/
  │   ├── app/
  │   │   ├── routes/home.tsx       # top-level page: topbar, settings menu, drag-drop, dialogs
  │   │   ├── global.css            # Tailwind v4 + theme variables + print styles                                      
  │   │   └── router.tsx            # react-router setup
  │   ├── features/                                                                                                     
  │   │   ├── settings/store.ts     # persisted settings (content width, theme, search defaults)
  │   │   ├── sidebar/              # tabbed sidebar                                                                    
  │   │   │   ├── Sidebar.tsx       # tab strip + panel switcher                                                        
  │   │   │   ├── OutlinePanel.tsx  # heading TOC + stats + frontmatter
  │   │   │   ├── FilesPanel.tsx    # recursive markdown file tree with LOC                                             
  │   │   │   ├── SearchPanel.tsx   # cross-folder grep with depth + regex/case                                         
  │   │   │   ├── HeldPanel.tsx     # pinned hits / files                                                               
  │   │   │   ├── api.ts            # invoke wrappers for list_markdown_dir / search_markdown                           
  │   │   │   └── store.ts          # active tab + root-override                                                        
  │   │   ├── reader/               # multi-file + diff + merge                                                         
  │   │   │   ├── store.ts          # open files, active tab, compare pair
  │   │   │   ├── Tabs.tsx          # tab strip with right-click compare menu                                           
  │   │   │   ├── diff.ts           # side-by-side / unified / hunk algorithms                                          
  │   │   │   ├── DiffView.tsx
  │   │   │   └── MergeView.tsx                                                                                         
  │   │   └── held/store.ts         # held items (persisted)          
  │   └── lib/                                                                                                          
  │       └── persist.ts            # Zustand <-> tauri-plugin-store adapter                                            
  ├── src-tauri/
  │   ├── src/                                                                                                          
  │   │   ├── main.rs               # md-asset:// scheme, single-instance,
  │   │   │                         # set_doc_dir / read_md_file / take_pending_open                                    
  │   │   └── fs_ops.rs             # list_markdown_dir / search_markdown / save_md_file
  │   ├── tauri.conf.json           # bundle config + fileAssociations                                                  
  │   ├── capabilities/                                               
  │   │   └── migrated.json         # permission set (shell, dialog, process, store)                                    
  │   ├── icons/                    # icon.ico used by the Windows installer
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
  - **Zustand** — small state stores; persisted ones write through a `createJSONStorage` adapter to                     
  **`tauri-plugin-store`**                                                                                              
  - **Phosphor icons**                                                                                                  
  - **react-markdown** + **remark-gfm** + **remark-math** + **rehype-katex** + **rehype-highlight** + **rehype-slug**   
  - **highlight.js** (GitHub Dark Dimmed)                                                                               
  - **KaTeX**                                                                                                           
  - **Mermaid**                                                                                                         
  - **`diff`** — line-level diffing for the diff and merge views                                                        
  - **`walkdir`** / **`ignore`** / **`regex`** — recursive markdown discovery and grep on the Rust side                 
  - **react-router**                                                                                                    
                                                                                                                        
  Inspiration: [`pluk-inc/md-preview.app`](https://github.com/pluk-inc/md-preview.app) (macOS, Swift). The `md-asset://`
   scheme handler is a direct port of that project's `MarkdownAssetSchemeHandler.swift`.
                                                                                                                        
  ## License                                                          

  See [LICENSE](./LICENSE).            
