use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileItem {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub mtime: i64,
    pub ctime: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameOp {
    pub old_path: String,
    pub new_name: String,
}

#[derive(Serialize)]
pub struct RenameResult {
    pub old_path: String,
    pub new_name: String,
    pub ok: bool,
    pub error: Option<String>,
}

fn to_millis(t: Result<SystemTime, std::io::Error>) -> i64 {
    t.ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn is_hidden(p: &Path) -> bool {
    p.file_name()
        .map(|n| n.to_string_lossy().starts_with('.'))
        .unwrap_or(false)
}

fn make_item(p: &Path) -> Option<FileItem> {
    let m = p.metadata().ok()?;
    let mtime = to_millis(m.modified());
    let created = to_millis(m.created());
    Some(FileItem {
        path: p.to_string_lossy().into_owned(),
        name: p.file_name()?.to_string_lossy().into_owned(),
        size: m.len(),
        mtime,
        // 创建时间不可用时回退为修改时间
        ctime: if created > 0 { created } else { mtime },
    })
}

/// 扫描若干路径（文件或文件夹），返回扁平的文件列表
#[tauri::command]
fn scan_paths(paths: Vec<String>, recursive: bool, include_hidden: bool) -> Result<Vec<FileItem>, String> {
    let mut out: Vec<FileItem> = Vec::new();
    for raw in paths {
        let pb = PathBuf::from(&raw);
        if pb.is_file() {
            if let Some(it) = make_item(&pb) {
                out.push(it);
            }
            continue;
        }
        if !pb.is_dir() {
            continue;
        }
        if recursive {
            let base = WalkDir::new(&pb).min_depth(1).follow_links(false);
            let entries: Vec<walkdir::DirEntry> = if include_hidden {
                base.into_iter().filter_map(|e| e.ok()).collect()
            } else {
                // 剪枝隐藏目录与隐藏文件（保留根目录本身）
                base.into_iter()
                    .filter_entry(|e| e.depth() == 0 || !is_hidden(e.path()))
                    .filter_map(|e| e.ok())
                    .collect()
            };
            for entry in entries {
                let p = entry.path();
                if p.is_file() {
                    if let Some(it) = make_item(p) {
                        out.push(it);
                    }
                }
            }
        } else if let Ok(rd) = std::fs::read_dir(&pb) {
            for entry in rd.filter_map(|e| e.ok()) {
                let p = entry.path();
                if p.is_file() && (include_hidden || !is_hidden(&p)) {
                    if let Some(it) = make_item(&p) {
                        out.push(it);
                    }
                }
            }
        }
    }
    Ok(out)
}

/// 顺序执行重命名；单个失败不影响其它，结果逐条返回
#[tauri::command]
fn rename_files(ops: Vec<RenameOp>) -> Vec<RenameResult> {
    ops.into_iter()
        .map(|op| {
            let old = PathBuf::from(&op.old_path);
            let target = old
                .parent()
                .map(|d| d.join(&op.new_name))
                .unwrap_or_else(|| PathBuf::from(&op.new_name));
            // 目标已存在时直接报错，避免覆盖
            if target.exists() {
                return RenameResult {
                    old_path: op.old_path,
                    new_name: op.new_name,
                    ok: false,
                    error: Some("目标名称已存在".to_string()),
                };
            }
            match std::fs::rename(&old, &target) {
                Ok(()) => RenameResult {
                    old_path: op.old_path,
                    new_name: op.new_name,
                    ok: true,
                    error: None,
                },
                Err(e) => RenameResult {
                    old_path: op.old_path,
                    new_name: op.new_name,
                    ok: false,
                    error: Some(e.to_string()),
                },
            }
        })
        .collect()
}

/// 通用 HTTP JSON 代理：供前端调用 AI 接口，绕开 WebView 的 CORS 限制
#[tauri::command]
async fn http_json(
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    body: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut req = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url).body(body),
        other => return Err(format!("不支持的 HTTP 方法: {other}")),
    };
    for (k, v) in &headers {
        req = req.header(k.as_str(), v.as_str());
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if status.is_success() {
        Ok(text)
    } else {
        Err(format!("HTTP {}: {}", status.as_u16(), text.chars().take(500).collect::<String>()))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_paths, rename_files, http_json])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
