/**
 * Pixel art, generated in code.
 *
 * The pet is built from simple shapes (a squishy "mochi" body, a blue cat-ear
 * hood, a jacket) and then outlined automatically, so every growth stage and
 * every facial expression stays consistent without hand-drawing each frame.
 *
 * This file has no imports on purpose: `scripts/make-icons.mjs` reuses it to
 * render the app icon.
 */

export type Pixel = string | null;
export type Grid = Pixel[][];

export const PAL = {
  outline: "#2b2d4a",
  white: "#ffffff",
  shade: "#e3eaf4",
  hood: "#7fb5e6",
  hoodDark: "#4f8cc9",
  hoodLight: "#b5d6f3",
  jacket: "#bcdcf5",
  jacketLine: "#7fa6cc",
  blush: "#f6a9bd",
  eye: "#1f2340",
  mouth: "#e2577a",
  tear: "#7cc4f2",
} as const;

export type PetForm = "egg" | "baby" | "child" | "hood" | "plain";
export type Face = "normal" | "happy" | "sad" | "sleep" | "sick" | "eat-open" | "eat-closed" | "no";

const W = 27;
const H = 24;
const CX = 13.5; // centre of column 13 → odd-width features are symmetric

function emptyGrid(w = W, h = H): Grid {
  return Array.from({ length: h }, () => Array<Pixel>(w).fill(null));
}

/** Squared-off ellipse — rounder than a circle, like a rice cake. */
function inBlob(x: number, y: number, cx: number, cy: number, rx: number, ry: number, n = 2.4) {
  const dx = Math.abs(x + 0.5 - cx) / rx;
  const dy = Math.abs(y + 0.5 - cy) / ry;
  return dx ** n + dy ** n <= 1;
}

function inEar(x: number, y: number, ex: number, baseY: number, height: number, halfW: number) {
  const apex = baseY - height;
  if (y > baseY || y < apex) return false;
  const progress = (y - apex + 0.5) / height; // 0 at the tip, 1 at the base
  return Math.abs(x + 0.5 - ex) <= halfW * progress + 0.2;
}

/** Paint an outline around every filled pixel (4-neighbour). */
function outline(g: Grid, color: string = PAL.outline) {
  const h = g.length;
  const w = g[0]!.length;
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && g[y]![x] !== null;
  const edge: [number, number][] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)))
        edge.push([x, y]);
  for (const [x, y] of edge) g[y]![x] = color;
}

function set(g: Grid, x: number, y: number, c: string) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0]!.length) g[y]![x] = c;
}

interface Body {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  eyeY: number;
  eyeGap: number; // columns between the centre column and the inner edge of each eye
  eyeH: number;
  ears: boolean;
}

const BODIES: Record<Exclude<PetForm, "egg">, Body> = {
  baby: { cx: CX, cy: 18.5, rx: 6, ry: 5, eyeY: 17, eyeGap: 2, eyeH: 2, ears: false },
  child: { cx: CX, cy: 16, rx: 8, ry: 7, eyeY: 15, eyeGap: 2, eyeH: 2, ears: true },
  hood: { cx: CX, cy: 14.5, rx: 10.5, ry: 8.5, eyeY: 13, eyeGap: 3, eyeH: 3, ears: true },
  plain: { cx: CX, cy: 14.5, rx: 10.5, ry: 8.5, eyeY: 13, eyeGap: 3, eyeH: 3, ears: true },
};

/**
 * Build the pet sprite. `look` shifts the pupils (-1 left, 1 right) for the
 * left/right mini-game; `squish` flattens the body for a bounce frame.
 */
export function buildPet(form: PetForm, face: Face, look: -1 | 0 | 1 = 0, squish = false): Grid {
  if (form === "egg") return buildEgg(squish);
  const g = emptyGrid();
  const b = { ...BODIES[form] };
  if (squish) {
    b.ry -= 0.5;
    b.rx += 0.5;
    b.cy += 0.5;
    b.eyeY += 1;
  }

  // Body
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (inBlob(x, y, b.cx, b.cy, b.rx, b.ry)) g[y]![x] = PAL.white;

  // Soft shading on the lower rim
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y]![x] !== PAL.white || y < b.cy + 1) continue;
      const below = g[y + 1]?.[x] ?? null;
      const right = g[y]![x + 1] ?? null;
      if (below === null || (right === null && x > b.cx)) g[y]![x] = PAL.shade;
    }

  // Ears
  if (b.ears) {
    const earH = form === "child" ? 4 : 6;
    const halfW = form === "child" ? 2.4 : 3.4;
    const baseY = Math.round(b.cy - b.ry * 0.8);
    const offset = b.rx * 0.6;
    for (const ex of [b.cx - offset, b.cx + offset])
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!inEar(x, y, ex, baseY, earH, halfW)) continue;
          const inner = inEar(x, y, ex, baseY, earH - 1.5, halfW - 1.4);
          g[y]![x] = inner && y > baseY - earH + 1 ? PAL.hoodDark : PAL.hood;
        }
  }

  // Hood (with a little peak in the middle of the forehead, like the device's cap)
  if (form === "hood" || form === "child") {
    const sideY = form === "hood" ? b.cy - 2 : b.cy - b.ry * 0.45;
    const peak = form === "hood" ? 3.5 : 2;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (g[y]![x] === null) continue;
        const dx = Math.abs(x + 0.5 - b.cx);
        const edge = sideY - Math.max(0, peak - dx * 0.75);
        // fluffy sides of the hood frame the cheeks
        const cheek = form === "hood" && dx > b.rx - 2.2 && y < b.cy + 3;
        if (y < edge || cheek) g[y]![x] = g[y]![x] === PAL.hoodDark ? PAL.hoodDark : PAL.hood;
      }
    // darker rim where hood meets face
    for (let y = 1; y < H; y++)
      for (let x = 0; x < W; x++)
        if (g[y]![x] === PAL.hood && (g[y + 1]?.[x] === PAL.white || g[y]![x + 1] === PAL.white || g[y]![x - 1] === PAL.white))
          g[y]![x] = PAL.hoodDark;
    // a highlight on the hood
    if (form === "hood") {
      set(g, Math.floor(b.cx - 6), Math.floor(b.cy - b.ry + 2), PAL.hoodLight);
      set(g, Math.floor(b.cx - 5), Math.floor(b.cy - b.ry + 2), PAL.hoodLight);
      set(g, Math.floor(b.cx - 6), Math.floor(b.cy - b.ry + 3), PAL.hoodLight);
    }
  }

  // Plain form: just a little blue tuft between the ears
  if (form === "plain") {
    const top = Math.round(b.cy - b.ry);
    for (const [dx, dy] of [[-1, 1], [0, 1], [1, 1], [0, 2], [-1, 0], [0, 0], [1, 0]] as const)
      set(g, Math.floor(b.cx) + dx, top + dy, PAL.hood);
  }

  // Puffy jacket for the grown-up hood form
  if (form === "hood") {
    const top = Math.round(b.cy + b.ry * 0.5);
    for (let y = top; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (g[y]![x] === null) continue;
        g[y]![x] = y === top + 2 ? PAL.jacketLine : PAL.jacket;
      }
    for (let y = top; y < H; y++) if (g[y]![Math.floor(b.cx)] !== null) g[y]![Math.floor(b.cx)] = PAL.jacketLine;
  }

  outline(g);
  drawFace(g, b, form, face, look);
  return g;
}

function drawFace(g: Grid, b: Body, form: PetForm, face: Face, look: number) {
  const c = Math.floor(b.cx); // centre column
  const ew = form === "baby" ? 1 : 2; // eye width
  const lx = c - b.eyeGap - ew + 1 + look; // left eye x
  const rx = c + b.eyeGap + look; // right eye x
  const ey = b.eyeY;
  const eh = form === "baby" ? 2 : b.eyeH;

  const eye = (x0: number) => {
    switch (face) {
      case "happy":
      case "eat-closed":
        // ^ ^
        set(g, x0 - 1 + (ew === 1 ? 1 : 0), ey + 1, PAL.eye);
        set(g, x0 + (ew === 1 ? 0 : 0), ey, PAL.eye);
        if (ew === 2) set(g, x0 + 1, ey, PAL.eye);
        set(g, x0 + ew, ey + 1, PAL.eye);
        break;
      case "sleep":
        for (let i = -1; i <= ew; i++) set(g, x0 + i, ey + 1, PAL.eye);
        break;
      case "sick":
        set(g, x0 - 1, ey, PAL.eye);
        set(g, x0 + ew, ey, PAL.eye);
        set(g, x0, ey + 1, PAL.eye);
        if (ew === 2) set(g, x0 + 1, ey + 1, PAL.eye);
        set(g, x0 - 1, ey + 2, PAL.eye);
        set(g, x0 + ew, ey + 2, PAL.eye);
        break;
      case "no":
        // > <
        break;
      default:
        for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) set(g, x0 + x, ey + y, PAL.eye);
        if (ew === 2) set(g, x0 + (look > 0 ? 1 : 0), ey, PAL.white);
    }
  };

  if (face === "no") {
    // squeezed >< eyes
    set(g, lx, ey, PAL.eye);
    set(g, lx + 1, ey + 1, PAL.eye);
    set(g, lx, ey + 2, PAL.eye);
    set(g, rx + ew - 1, ey, PAL.eye);
    set(g, rx + ew - 2, ey + 1, PAL.eye);
    set(g, rx + ew - 1, ey + 2, PAL.eye);
  } else {
    eye(lx);
    eye(rx);
  }

  // blush
  if (form !== "baby" && face !== "sick") {
    const by = ey + eh;
    for (const x of [lx - 2, lx - 1, rx + ew, rx + ew + 1]) set(g, x, by, PAL.blush);
  } else if (form === "baby") {
    set(g, lx - 2, ey + 2, PAL.blush);
    set(g, rx + 2, ey + 2, PAL.blush);
  }

  // tear for sad / hungry
  if (face === "sad") {
    set(g, lx - 1, ey + eh, PAL.tear);
    set(g, lx - 1, ey + eh + 1, PAL.tear);
  }

  // mouth
  const my = ey + eh + (form === "baby" ? 0 : 1);
  const m = c + look;
  switch (face) {
    case "happy":
      set(g, m - 1, my, PAL.outline);
      set(g, m, my, PAL.mouth);
      set(g, m + 1, my, PAL.outline);
      set(g, m, my + 1, PAL.outline);
      break;
    case "eat-open":
      set(g, m, my - 1 < ey + eh ? my : my - 1, PAL.outline);
      set(g, m - 1, my, PAL.outline);
      set(g, m, my, PAL.mouth);
      set(g, m + 1, my, PAL.outline);
      set(g, m, my + 1, PAL.outline);
      break;
    case "sad":
    case "sick":
    case "no":
      set(g, m - 1, my + 1, PAL.outline);
      set(g, m, my, PAL.outline);
      set(g, m + 1, my + 1, PAL.outline);
      break;
    case "sleep":
      set(g, m, my, PAL.outline);
      break;
    default:
      // ω
      if (form === "baby") {
        set(g, m, my, PAL.outline);
      } else {
        set(g, m - 1, my, PAL.outline);
        set(g, m, my + 1, PAL.outline);
        set(g, m + 1, my, PAL.outline);
      }
  }
}

function buildEgg(tilt: boolean): Grid {
  const g = emptyGrid();
  const cx = CX + (tilt ? 0.6 : 0);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const yy = y + 0.5;
      // narrower at the top
      const rx = 6.5 - Math.max(0, (16 - yy) * 0.12);
      if (inBlob(x, y, cx, 16, rx, 7.5, 2.1)) g[y]![x] = PAL.white;
    }
  // blue spots
  for (const [x, y] of [[11, 12], [12, 12], [11, 13], [15, 15], [16, 15], [16, 16], [12, 19], [13, 19], [17, 11]] as const)
    if (g[y]![x]) g[y]![x] = PAL.hood;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (g[y]![x] === PAL.white && g[y + 1]?.[x] === null) g[y]![x] = PAL.shade;
  outline(g);
  return g;
}

// ---------------------------------------------------------------------------
// Small item sprites, written as text. Letters map to colours below.
// ---------------------------------------------------------------------------

const ITEM_COLORS: Record<string, string> = {
  O: PAL.outline,
  W: "#ffffff",
  N: "#2f4a3a", // nori
  C: "#b98256", // poop
  c: "#d9a77a",
  Y: "#ffe08a", // pudding
  y: "#f3b960",
  R: "#e5546b",
  P: "#f48fb1",
  p: "#ffc4d8",
  B: PAL.hood,
  b: PAL.hoodDark,
  L: "#fff3a6",
  E: PAL.eye,
  G: "#9be3c0",
  S: "#c9b8ff",
};

export function parseSprite(rows: string[]): Grid {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => Array.from({ length: w }, (_, i) => ITEM_COLORS[r[i] ?? "."] ?? null));
}

export const ITEMS = {
  rice: parseSprite([
    "....O....",
    "...OWO...",
    "..OWWWO..",
    ".OWWWWWO.",
    ".OWWWWWO.",
    "OWNNNNNWO",
    "ONNNNNNNO",
    ".OOOOOOO.",
  ]),
  pudding: parseSprite([
    "...OOO...",
    "...ORO...",
    "..OyyyO..",
    ".OyyyyyO.",
    ".OYYYYYO.",
    "OYYYYYYYO",
    "OYYYYYYYO",
    "OOOOOOOOO",
  ]),
  poop: parseSprite([
    "...O...",
    "..OcO..",
    ".OCCcO.",
    ".OCCCO.",
    "OCcCCCO",
    "OCCCCcO",
    ".OOOOO.",
  ]),
  heart: parseSprite([".PP.PP.", "PpPPPPP", "PPPPPPP", ".PPPPP.", "..PPP..", "...P..."]),
  smallHeart: parseSprite([".P.P.", "PPPPP", ".PPP.", "..P.."]),
  z: parseSprite(["EEEE", "..E.", ".E..", "EEEE"]),
  pill: parseSprite([".OOOOOO.", "OBBBWWWO", "OBBBWWWO", ".OOOOOO."]),
  sparkle: parseSprite(["..L..", "..L..", "LLWLL", "..L..", "..L.."]),
  sick: parseSprite([".SSS.", "S...S", "S.S.S", "S..S.", ".S..."]),
  star: parseSprite(["...L...", "...L...", "..LLL..", "LLLWLLL", "..LLL..", ".LL.LL.", ".L...L."]),
  arrowLeft: parseSprite(["..E", ".EE", "EEE", ".EE", "..E"]),
  arrowRight: parseSprite(["E..", "EE.", "EEE", "EE.", "E.."]),
  alert: parseSprite(["RR", "RR", "RR", "..", "RR"]),
};

// Icons for the menu bar (9×9)
export const ICONS: Record<string, Grid> = {
  feed: ITEMS.rice,
  snack: ITEMS.pudding,
  play: parseSprite([
    "...OOO...",
    "..OBBBO..",
    ".OBWBBBO.",
    "OBWBBBBBO",
    "OBBBBBBBO",
    "OBBBBBBbO",
    ".OBBBBbO.",
    "..ObbbO..",
    "...OOO...",
  ]),
  clean: parseSprite([
    "......OO.",
    ".....OyO.",
    "....OyO..",
    "...OyO...",
    "..OOOO...",
    ".OYYYYO..",
    "OYYYYYO..",
    "OYOYOYO..",
    "OOOOOOO..",
  ]),
  medicine: parseSprite([
    ".........",
    "..OOOOO..",
    ".OBBBWWO.",
    "OBBBBWWWO",
    "OBBBBWWWO",
    ".OBBBWWO.",
    "..OOOOO..",
    ".........",
  ]),
  lights: parseSprite([
    "...OOO...",
    "..OLLLO..",
    ".OLLWLLO.",
    ".OLLLLLO.",
    ".OLLLLLO.",
    "..OLLLO..",
    "...OOO...",
    "...OBO...",
    "...OOO...",
  ]),
  status: parseSprite([
    "OOOOOOOOO",
    "OWWWWWWWO",
    "OWPPWPPWO",
    "OWPPPPPWO",
    "OWWPPPWWO",
    "OWWWPWWWO",
    "OWWWWWWWO",
    "OOOOOOOOO",
  ]),
};
