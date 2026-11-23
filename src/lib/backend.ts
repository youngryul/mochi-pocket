import { invoke } from "@tauri-apps/api/core";

/** True inside the Tauri webview; false when the UI runs in a plain browser (`npm run dev`). */
export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const LS_KEY = "mochi-pocket-save";

export async function loadSave(): Promise<string | null> {
  if (!inTauri) return localStorage.getItem(LS_KEY);
  return (await invoke<string | null>("load_save")) ?? null;
}

export async function writeSave(data: string): Promise<void> {
  if (!inTauri) {
    localStorage.setItem(LS_KEY, data);
    return;
  }
  await invoke("write_save", { data });
}

export async function setTraySound(enabled: boolean): Promise<void> {
  if (inTauri) await invoke("set_tray_sound", { enabled });
}
