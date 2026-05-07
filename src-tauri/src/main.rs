// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod fs_ops;

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, State};
#[cfg(any(target_os = "windows", target_os = "linux"))]
use tauri::Emitter;

use fs_ops::{list_markdown_dir, save_md_file, search_markdown};

struct DocDir(Mutex<Option<PathBuf>>);
struct PendingOpen(Mutex<Option<String>>);

const SUPPORTED_EXTS: &[&str] = &[
    "md", "mdx", "markdown", "mdown", "mkd", "mkdn", "mdwn", "mdtxt", "mdtext", "rmd", "txt",
];

fn pick_md_path(argv: &[String]) -> Option<String> {
    argv.iter().skip(1).find(|a| {
        let lower = a.to_lowercase();
        SUPPORTED_EXTS.iter().any(|ext| lower.ends_with(&format!(".{ext}")))
    }).cloned()
}

#[tauri::command]
fn set_doc_dir(dir: String, state: State<DocDir>) {
    *state.0.lock().unwrap() = Some(PathBuf::from(dir));
}

#[tauri::command]
fn read_md_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn take_pending_open(state: State<PendingOpen>) -> Option<String> {
    state.0.lock().unwrap().take()
}

fn guess_mime(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase().as_str() {
        "png"  => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif"  => "image/gif",
        "webp" => "image/webp",
        "svg"  => "image/svg+xml",
        "ico"  => "image/x-icon",
        "bmp"  => "image/bmp",
        "avif" => "image/avif",
        "tiff" | "tif" => "image/tiff",
        "pdf"  => "application/pdf",
        _      => "application/octet-stream",
    }
}

fn main() {
    let cold_start_path = pick_md_path(&std::env::args().collect::<Vec<_>>());

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = pick_md_path(&argv) {
                let _ = app.emit("open-file", path);
            }
            // Bring main window to front
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
                let _ = win.unminimize();
            }
        }));
    }

    builder
        .manage(DocDir(Mutex::new(None)))
        .manage(PendingOpen(Mutex::new(cold_start_path)))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            set_doc_dir,
            read_md_file,
            take_pending_open,
            list_markdown_dir,
            search_markdown,
            save_md_file,
        ])
        .register_uri_scheme_protocol("md-asset", |ctx, request| {
            let app = ctx.app_handle();
            let doc_dir = {
                let state = app.state::<DocDir>();
                let guard = state.0.lock().unwrap();
                guard.clone()
            };

            let uri = request.uri().to_string();
            // Strip "md-asset://localhost/" prefix
            let rel = uri
                .strip_prefix("md-asset://localhost/")
                .or_else(|| uri.strip_prefix("md-asset://"))
                .unwrap_or("")
                .split('?')
                .next()
                .unwrap_or("");

            // Percent-decode
            let decoded = percent_encoding::percent_decode_str(rel)
                .decode_utf8_lossy()
                .into_owned();

            let Some(base) = doc_dir else {
                return tauri::http::Response::builder()
                    .status(404)
                    .body(b"No document open".to_vec())
                    .unwrap();
            };

            let candidate = base.join(&decoded);

            // Path traversal guard: resolved path must stay within base
            let Ok(canonical_base) = base.canonicalize() else {
                return tauri::http::Response::builder()
                    .status(403)
                    .body(b"Forbidden".to_vec())
                    .unwrap();
            };
            let Ok(canonical_file) = candidate.canonicalize() else {
                return tauri::http::Response::builder()
                    .status(404)
                    .body(b"Not found".to_vec())
                    .unwrap();
            };
            if !canonical_file.starts_with(&canonical_base) {
                return tauri::http::Response::builder()
                    .status(403)
                    .body(b"Forbidden".to_vec())
                    .unwrap();
            }

            match std::fs::read(&canonical_file) {
                Ok(data) => {
                    let mime = guess_mime(&canonical_file);
                    tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", mime)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(data)
                        .unwrap()
                }
                Err(_) => tauri::http::Response::builder()
                    .status(404)
                    .body(b"Not found".to_vec())
                    .unwrap(),
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
