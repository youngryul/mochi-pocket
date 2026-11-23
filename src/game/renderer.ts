/**
 * Draws one frame of the LCD screen (48×48 logical pixels) onto a canvas.
 * The canvas is scaled up with `image-rendering: pixelated` in CSS.
 */
import { isNight } from "./engine";
import { ITEMS, buildPet, type Face, type Grid, type PetForm } from "./sprites";
import type { Expression, Mood, PetState } from "./types";

export const SCREEN = 48;
export const FLOOR_Y = 45; // the row the pet stands on

export type EffectKind = "rice" | "pudding" | "clean" | "pill" | "hearts" | "lights";

export interface SceneInput {
  state: PetState;
  mood: Mood;
  now: number;
  petX: number;
  look: -1 | 0 | 1;
  expression: Expression;
  effect: { kind: EffectKind; startedAt: number } | null;
  game: { look: -1 | 0 | 1 } | null;
  attention: boolean;
}

export const EFFECT_MS: Record<EffectKind, number> = {
  rice: 2400,
  pudding: 2400,
  clean: 1400,
  pill: 1400,
  hearts: 1300,
  lights: 300,
};

const cache = new Map<string, Grid>();
function petGrid(form: PetForm, face: Face, look: -1 | 0 | 1, squish: boolean): Grid {
  const key = `${form}|${face}|${look}|${squish}`;
  let g = cache.get(key);
  if (!g) {
    g = buildPet(form, face, look, squish);
    cache.set(key, g);
  }
  return g;
}

function drawGrid(ctx: CanvasRenderingContext2D, g: Grid, ox: number, oy: number, cropRight = 0) {
  const w = (g[0]?.length ?? 0) - cropRight;
  for (let y = 0; y < g.length; y++) {
    const row = g[y]!;
    for (let x = 0; x < w; x++) {
      const c = row[x];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

export function formOf(s: PetState): PetForm {
  if (s.stage === "adult") return s.form ?? "hood";
  return s.stage;
}

function faceFor(input: SceneInput): Face {
  const { mood, expression, now } = input;
  if (expression === "eat") return Math.floor(now / 300) % 2 ? "eat-open" : "eat-closed";
  if (expression === "joy") return "happy";
  if (expression === "no") return "no";
  // a quick blink every few seconds
  if (mood !== "sleep" && mood !== "sick" && now % 4200 < 140) return "sleep";
  switch (mood) {
    case "happy":
      return "happy";
    case "hungry":
    case "sad":
      return "sad";
    case "sick":
      return "sick";
    case "sleep":
      return "sleep";
    default:
      return "normal";
  }
}

function drawRoom(ctx: CanvasRenderingContext2D, now: number) {
  const night = isNight(now);
  // wall
  ctx.fillStyle = "#e3f0fb";
  ctx.fillRect(0, 0, SCREEN, 35);
  ctx.fillStyle = "#d4e7f7";
  for (let x = 2; x < SCREEN; x += 5) ctx.fillRect(x, 0, 1, 35);
  // window
  ctx.fillStyle = "#8fa3c4";
  ctx.fillRect(4, 4, 14, 12);
  ctx.fillStyle = night ? "#2d3566" : "#bfe6ff";
  ctx.fillRect(5, 5, 12, 10);
  if (night) {
    ctx.fillStyle = "#fff3a6";
    ctx.fillRect(13, 7, 2, 2);
    ctx.fillRect(7, 11, 1, 1);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(7, 8, 4, 2);
    ctx.fillRect(8, 7, 2, 1);
  }
  ctx.fillStyle = "#8fa3c4";
  ctx.fillRect(10, 5, 1, 10);
  ctx.fillRect(5, 10, 12, 1);
  // frame on the wall
  ctx.fillStyle = "#c79bc0";
  ctx.fillRect(36, 6, 8, 7);
  ctx.fillStyle = "#fff4fb";
  ctx.fillRect(37, 7, 6, 5);
  ctx.fillStyle = "#f48fb1";
  ctx.fillRect(39, 9, 2, 2);
  // skirting board
  ctx.fillStyle = "#c6a7c9";
  ctx.fillRect(0, 34, SCREEN, 1);
  // floor
  ctx.fillStyle = "#f7d9e8";
  ctx.fillRect(0, 35, SCREEN, SCREEN - 35);
  ctx.fillStyle = "#efc5da";
  for (let y = 37; y < SCREEN; y += 3) ctx.fillRect(0, y, SCREEN, 1);
}

const POOP_SPOTS: [number, number][] = [
  [40, 40],
  [33, 41],
  [40, 33],
  [26, 41],
];

export function renderScene(ctx: CanvasRenderingContext2D, input: SceneInput) {
  const { state, now } = input;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SCREEN, SCREEN);

  if (state.gone) {
    drawGone(ctx, now);
    return;
  }

  drawRoom(ctx, now);

  const form = formOf(state);
  const frame = Math.floor(now / 600) % 2 === 1;
  const effect = input.effect && now - input.effect.startedAt < EFFECT_MS[input.effect.kind] ? input.effect : null;
  const effectT = effect ? (now - effect.startedAt) / EFFECT_MS[effect.kind] : 0;

  // --- pet -----------------------------------------------------------------
  const look = input.game ? input.game.look : input.look;
  const face = faceFor(input);
  let squish = frame && input.mood !== "sleep";
  let ox = Math.round(input.petX) - 13;
  if (form === "egg") {
    const hatchingSoon = now - state.bornAt > 45_000;
    const wobble = Math.floor(now / (hatchingSoon ? 150 : 500)) % 4;
    ox += wobble === 1 ? -1 : wobble === 3 ? 1 : 0;
    squish = false;
  }
  const grid = petGrid(form, face, form === "egg" ? 0 : look, squish);
  const top = FLOOR_Y - grid.length + 1;
  drawGrid(ctx, grid, ox, top);

  // mini-game: show which way the pet turned
  if (input.game && input.game.look !== 0) {
    const arrow = input.game.look < 0 ? ITEMS.arrowLeft : ITEMS.arrowRight;
    const ax = input.game.look < 0 ? Math.round(input.petX) - 17 : Math.round(input.petX) + 14;
    if (Math.floor(now / 200) % 2) drawGrid(ctx, arrow, ax, top + 10);
  }

  // --- poops (drawn in front) ---------------------------------------------
  const cleaning = effect?.kind === "clean";
  for (let i = 0; i < state.poops && !cleaning; i++) {
    const [px, py] = POOP_SPOTS[i]!;
    drawGrid(ctx, ITEMS.poop, px, py);
    // stink lines
    if (Math.floor(now / 400 + i) % 2) {
      ctx.fillStyle = "#9c8fb5";
      ctx.fillRect(px + 1, py - 3, 1, 2);
      ctx.fillRect(px + 5, py - 4, 1, 2);
    }
  }

  // --- status markers ------------------------------------------------------
  const headX = Math.round(input.petX) + 6;
  const headY = top + 3;
  if (state.sick && !state.asleep) drawGrid(ctx, ITEMS.sick, headX + 2, headY - 2 + (frame ? 1 : 0));

  // --- effects -------------------------------------------------------------
  if (effect) drawEffect(ctx, effect.kind, effectT, input.petX, top, now);

  // --- lights off ----------------------------------------------------------
  if (state.lightsOff) {
    ctx.fillStyle = "rgba(14, 16, 40, 0.84)";
    ctx.fillRect(0, 0, SCREEN, SCREEN);
  }
  if (state.asleep) {
    const zt = Math.floor(now / 500) % 3;
    for (let i = 0; i <= zt; i++) drawGrid(ctx, ITEMS.z, headX + 1 + i * 3, headY - 3 - i * 4);
  }

  if (input.attention && Math.floor(now / 500) % 2 === 0) drawGrid(ctx, ITEMS.alert, 44, 2);
}

function drawEffect(ctx: CanvasRenderingContext2D, kind: EffectKind, t: number, petX: number, petTop: number, now: number) {
  switch (kind) {
    case "rice":
    case "pudding": {
      const item = kind === "rice" ? ITEMS.rice : ITEMS.pudding;
      const bites = Math.min(3, Math.floor(t * 4));
      const x = Math.round(petX) - 14 - 9;
      if (bites < 3) drawGrid(ctx, item, Math.max(0, x), 36, bites * 3);
      else {
        ctx.fillStyle = kind === "rice" ? "#ffffff" : "#ffe08a";
        ctx.fillRect(Math.max(0, x) + 2, 42, 1, 1);
        ctx.fillRect(Math.max(0, x) + 5, 43, 1, 1);
      }
      break;
    }
    case "clean": {
      // a wave of sparkles sweeping left to right
      const sweep = Math.floor(t * 56) - 8;
      for (let i = 0; i < 4; i++) drawGrid(ctx, ITEMS.sparkle, sweep - i * 5, 30 + ((i * 7) % 12));
      break;
    }
    case "pill": {
      if (t < 0.55) drawGrid(ctx, ITEMS.pill, Math.round(petX) - 4, petTop - 6 + Math.floor(t * 18));
      else
        for (const [dx, dy] of [[-12, 2], [10, 0], [-8, -6], [8, -8]] as const)
          if (Math.floor(now / 120 + dx) % 2) drawGrid(ctx, ITEMS.sparkle, Math.round(petX) + dx, petTop + dy + 6);
      break;
    }
    case "hearts": {
      const rise = Math.floor(t * 10);
      drawGrid(ctx, ITEMS.smallHeart, Math.round(petX) - 12, petTop + 2 - rise);
      drawGrid(ctx, ITEMS.heart, Math.round(petX) + 6, petTop - 1 - rise);
      if (t > 0.3) drawGrid(ctx, ITEMS.smallHeart, Math.round(petX) - 4, petTop - 3 - rise);
      break;
    }
    case "lights":
      break;
  }
}

function drawGone(ctx: CanvasRenderingContext2D, now: number) {
  ctx.fillStyle = "#232a57";
  ctx.fillRect(0, 0, SCREEN, SCREEN);
  ctx.fillStyle = "#fff3a6";
  for (const [x, y, p] of [[5, 6, 0], [40, 9, 1], [12, 30, 2], [43, 36, 0], [26, 4, 1], [6, 42, 2]] as const)
    if (Math.floor(now / 400 + p) % 3) ctx.fillRect(x, y, 1, 1);
  // a little planet
  ctx.fillStyle = "#7fb5e6";
  ctx.fillRect(14, 40, 20, 8);
  ctx.fillRect(12, 42, 24, 6);
  ctx.fillStyle = "#b5d6f3";
  ctx.fillRect(16, 41, 5, 1);
  const bob = Math.floor(now / 600) % 2;
  drawGrid(ctx, ITEMS.star, 20, 26 + bob);
}
