use ignore::WalkBuilder;
use regex::RegexBuilder;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const MD_EXTS: &[&str] = &[
    "md", "mdx", "markdown", "mdown", "mkd", "mkdn", "mdwn", "mdtxt", "mdtext", "rmd",
];

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| MD_EXTS.iter().any(|x| x.eq_ignore_ascii_case(e)))
        .unwrap_or(false)
}

#[derive(Serialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub parent: String,
    pub depth: usize,
    pub line_count: usize,
    pub size: u64,
    pub modified_ms: u64,
}

#[tauri::command]
pub fn list_markdown_dir(root: String, max_depth: u32) -> Result<Vec<FileEntry>, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err(format!("Not a directory: {}", root));
    }

    let walker = WalkBuilder::new(&root_path)
        .max_depth(Some(max_depth as usize))
        .hidden(false)
        .git_ignore(true)
        .build();

    let mut entries: Vec<FileEntry> = Vec::new();

    for result in walker {
        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if !entry.file_type().is_some_and(|t| t.is_file()) {
            continue;
        }
        if !is_markdown(path) {
            continue;
        }

        let line_count = std::fs::read_to_string(path)
            .map(|s| s.lines().count())
            .unwrap_or(0);

        let metadata = entry.metadata().ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified_ms = metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let parent_str = path
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();

        let depth = entry.depth();

        entries.push(FileEntry {
            path: path.to_string_lossy().to_string(),
            name,
            parent: parent_str,
            depth,
            line_count,
            size,
            modified_ms,
        });
    }

    Ok(entries)
}

#[derive(Serialize)]
pub struct SearchHit {
    pub path: String,
    pub name: String,
    pub line: usize,
    pub col: usize,
    pub text: String,
    pub before: Vec<String>,
    pub after: Vec<String>,
}

#[tauri::command]
pub fn search_markdown(
    root: String,
    query: String,
    max_depth: u32,
    case_sensitive: bool,
    regex: bool,
    max_hits: Option<usize>,
) -> Result<Vec<SearchHit>, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err(format!("Not a directory: {}", root));
    }
    if query.is_empty() {
        return Ok(vec![]);
    }

    let pattern = if regex { query.clone() } else { regex::escape(&query) };
    let re = RegexBuilder::new(&pattern)
        .case_insensitive(!case_sensitive)
        .multi_line(true)
        .build()
        .map_err(|e| format!("Invalid regex: {e}"))?;

    let walker = WalkBuilder::new(&root_path)
        .max_depth(Some(max_depth as usize))
        .hidden(false)
        .git_ignore(true)
        .build();

    let cap = max_hits.unwrap_or(2_000);
    let mut hits: Vec<SearchHit> = Vec::new();

    'outer: for result in walker {
        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if !entry.file_type().is_some_and(|t| t.is_file()) {
            continue;
        }
        if !is_markdown(path) {
            continue;
        }

        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let lines: Vec<&str> = content.lines().collect();

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let path_str = path.to_string_lossy().to_string();

        for (idx, line) in lines.iter().enumerate() {
            if let Some(m) = re.find(line) {
                let before = if idx > 0 { vec![lines[idx - 1].to_string()] } else { vec![] };
                let after = if idx + 1 < lines.len() {
                    vec![lines[idx + 1].to_string()]
                } else {
                    vec![]
                };
                hits.push(SearchHit {
                    path: path_str.clone(),
                    name: name.clone(),
                    line: idx + 1,
                    col: m.start() + 1,
                    text: line.to_string(),
                    before,
                    after,
                });
                if hits.len() >= cap {
                    break 'outer;
                }
            }
        }
    }

    Ok(hits)
}

#[tauri::command]
pub fn save_md_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
