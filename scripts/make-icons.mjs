// Renders the app icon and the menu-bar tray icon from the in-game sprites.
// Usage: npm run icons   (then `tauri icon` expands app-icon.png into every size)
import { writeFileSync } from "node:fs";
import { Canvas } from "./png.mjs";
import { buildPet } from "../src/game/sprites.ts";

const out = new URL("../src-tauri/icons/", import.meta.url);

// --- app icon: 1024×1024, rounded tile with the pet ----------------------
{
  const N = 1024;
  const c = new Canvas(N, N);
  const r = 220;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const m = 64; // macOS-style margin
      const cx = Math.min(Math.max(x, m + r), N - m - r);
      const cy = Math.min(Math.max(y, m + r), N - m - r);
      if (x < m || y < m || x >= N - m || y >= N - m) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      // soft vertical gradient: pale sky → pink floor
      const t = y / N;
      const col = t < 0.68 ? mix("#e3f0fb", "#cfe5f7", t / 0.68) : "#f7d9e8";
      c.px(x, y, col);
    }
  const pet = buildPet("hood", "happy");
  const s = 30;
  const w = pet[0].length * s;
  const h = pet.length * s;
  c.grid(pet, Math.round((N - w) / 2), Math.round(N * 0.74 - h), s);
  writeFileSync(new URL("app-icon.png", out), c.png());
}

// --- tray icon: 32×32 template image (black + alpha) ----------------------
{
  const c = new Canvas(32, 32);
  const pet = buildPet("hood", "normal");
  const ox = Math.floor((32 - pet[0].length) / 2);
  const oy = Math.floor((32 - pet.length) / 2) + 1;
  pet.forEach((row, y) =>
    row.forEach((col, x) => {
      if (!col) return;
      // outline + eyes solid, fill semi-transparent so the face reads in a template icon
      const solid = col === "#2b2d4a" || col === "#1f2340";
      c.px(ox + x, oy + y, "#000000", solid ? 255 : 70);
    }),
  );
  writeFileSync(new URL("tray.png", out), c.png());
}

function mix(a, b, t) {
  const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const v = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t));
  return "#" + v.map((n) => n.toString(16).padStart(2, "0")).join("");
}
