// Dev helper: renders every pet form × face to a sprite sheet PNG.
import { writeFileSync } from "node:fs";
import { Canvas } from "./png.mjs";
import { buildPet, ITEMS, ICONS } from "../src/game/sprites.ts";

const forms = ["egg", "baby", "child", "hood", "plain"];
const faces = ["normal", "happy", "sad", "sleep", "sick", "eat-open", "no"];
const S = 6, CW = 28 * S, CH = 25 * S;
const c = new Canvas(CW * faces.length, CH * forms.length + 12 * S);
for (let i = 0; i < c.data.length; i += 4) c.data.set([220, 236, 248, 255], i);
forms.forEach((f, r) => faces.forEach((face, col) => c.grid(buildPet(f, face, 0, false), col * CW, r * CH, S)));
let x = 0;
for (const g of [...Object.values(ITEMS), ...Object.values(ICONS)]) {
  c.grid(g, x, CH * forms.length, S);
  x += (g[0].length + 1) * S;
}
writeFileSync(process.argv[2], c.png());
