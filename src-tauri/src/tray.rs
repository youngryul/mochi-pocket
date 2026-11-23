//! Menu bar / system tray: show-hide, size, sound and reset.
//! Game-related items are forwarded to the frontend as a `tray://action` event.

use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, Wry};

pub struct TrayHandles {
    pub sound: CheckMenuItem<Wry>,
}

pub fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

fn hide_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}

pub fn build(app: &AppHandle) -> tauri::Result<TrayHandles> {
    let show = MenuItem::with_id(app, "show", "모찌 보이기", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "숨기기", true, None::<&str>)?;
    let on_top = CheckMenuItem::with_id(app, "on_top", "항상 위에", true, true, None::<&str>)?;
    let sound = CheckMenuItem::with_id(app, "sound", "효과음", true, true, None::<&str>)?;
    let size = Submenu::with_items(
        app,
        "크기",
        true,
        &[
            &MenuItem::with_id(app, "size:small", "작게", true, None::<&str>)?,
            &MenuItem::with_id(app, "size:normal", "보통", true, None::<&str>)?,
            &MenuItem::with_id(app, "size:large", "크게", true, None::<&str>)?,
        ],
    )?;
    let help = MenuItem::with_id(app, "help", "사용법 보기", true, None::<&str>)?;
    let reset = MenuItem::with_id(app, "reset", "새 알로 다시 시작…", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Mochi Pocket 종료", true, None::<&str>)?;
    let sep = || PredefinedMenuItem::separator(app);

    let menu = Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &sep()?,
            &on_top,
            &sound,
            &size,
            &sep()?,
            &help,
            &reset,
            &sep()?,
            &quit,
        ],
    )?;

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))?;
    let on_top_item = on_top.clone();
    let sound_item = sound.clone();
    TrayIconBuilder::with_id("main")
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Mochi Pocket")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "show" => show_main(app),
            "hide" => hide_main(app),
            "on_top" => {
                let on = on_top_item.is_checked().unwrap_or(true);
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_always_on_top(on);
                }
            }
            "sound" => {
                let on = sound_item.is_checked().unwrap_or(true);
                let _ = app.emit("tray://action", format!("sound:{}", on));
            }
            "reset" | "help" => {
                show_main(app);
                let _ = app.emit("tray://action", event.id().as_ref());
            }
            id if id.starts_with("size:") => {
                show_main(app);
                let _ = app.emit("tray://action", id);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(TrayHandles { sound })
}
