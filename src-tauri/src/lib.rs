//! Mochi Pocket — Tauri backend.
//!
//! The Rust side is deliberately thin: it owns the window, the tray menu and the
//! save file. All game rules (stats, evolution, mini-game) live in TypeScript
//! under `src/game`, so they can be unit-tested without a native build.

mod save;
mod tray;

use tauri::Manager;
use tauri_plugin_window_state::StateFlags;

#[tauri::command]
fn load_save(app: tauri::AppHandle) -> Result<Option<String>, String> {
    save::load(&app)
}

#[tauri::command]
fn write_save(app: tauri::AppHandle, data: String) -> Result<(), String> {
    save::write(&app, &data)
}

/// The frontend owns the "sound" preference; this keeps the tray checkbox in sync.
#[tauri::command]
fn set_tray_sound(state: tauri::State<'_, tray::TrayHandles>, enabled: bool) {
    let _ = state.sound.set_checked(enabled);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION | StateFlags::VISIBLE)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![load_save, write_save, set_tray_sound])
        .setup(|app| {
            // A desktop pet should not take a Dock slot; it lives in the menu bar tray.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let handles = tray::build(app.handle())?;
            app.manage(handles);

            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_always_on_top(true);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Mochi Pocket");
}
