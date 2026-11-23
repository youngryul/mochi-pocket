import { useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { inTauri } from "@/lib/backend";
import { SIZE_SCALE, useGame } from "@/store/gameStore";
import { Device } from "./components/Device";

const BASE_W = 300;
const BASE_H = 350;

export function App() {
  const size = useGame((s) => s.settings.size);
  const scale = SIZE_SCALE[size];

  // Game clock: one simulation step per second.
  useEffect(() => {
    const id = setInterval(() => useGame.getState().tick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard: ←/1 = A, Enter/Space/2 = B, Esc/→/3 = C
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = useGame.getState();
      if (["ArrowLeft", "1", "a"].includes(e.key)) g.pressA();
      else if (["Enter", " ", "2", "s"].includes(e.key)) g.pressB();
      else if (["Escape", "ArrowRight", "3", "d"].includes(e.key)) g.pressC();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Tray menu → game
  useEffect(() => {
    if (!inTauri) return;
    const un = listen<string>("tray://action", (e) => useGame.getState().trayAction(e.payload));
    return () => {
      void un.then((f) => f());
    };
  }, []);

  // Resize the native window to fit the chosen device size.
  useEffect(() => {
    if (!inTauri) return;
    void getCurrentWindow().setSize(new LogicalSize(Math.round(BASE_W * scale), Math.round(BASE_H * scale)));
  }, [scale]);

  const g = useGame.getState();
  return (
    <div className="stage" style={{ zoom: scale }}>
      <Device
        onPress={(k) => (k === "a" ? g.pressA() : k === "b" ? g.pressB() : g.pressC())}
        onDrag={() => {
          if (inTauri) void getCurrentWindow().startDragging();
        }}
      />
    </div>
  );
}
