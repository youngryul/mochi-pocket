//! Save file: a single JSON document in the app data directory.
//! Writes go to a temp file first and are then renamed, so a crash mid-write
//! never leaves a half-written save behind.

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const FILE_NAME: &str = "save.json";

fn save_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(FILE_NAME))
}

pub fn load(app: &AppHandle) -> Result<Option<String>, String> {
    let path = save_path(app)?;
    match fs::read_to_string(&path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn write(app: &AppHandle, data: &str) -> Result<(), String> {
    // Refuse anything that is not JSON so a frontend bug can't corrupt the save.
    serde_json::from_str::<serde_json::Value>(data).map_err(|e| e.to_string())?;
    let path = save_path(app)?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, data).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}
