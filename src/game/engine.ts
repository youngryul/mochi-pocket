/**
 * Pure game rules. Nothing here touches the DOM, timers or storage, so every
 * rule can be unit-tested by feeding a state, a clock and a random source.
 */
import type { ActionResult, GameEvent, Mood, PetState } from "./types";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

export const RULES = {
  hatchAfterMs: MINUTE,
  childAfterMs: HOUR, // measured from hatching
  adultAfterMs: 24 * HOUR,

  hungerPerHour: 100 / 6,
  hungerPerHourAsleep: 100 / 24,
  happyPerHour: 100 / 8,
  happyPerHourAsleep: 100 / 32,
  energyPerHour: 100 / 14,
  energyRecoverDark: 100 / 7,
  energyRecoverLight: 100 / 12,

  poopEveryMs: 100 * MINUTE,
  maxPoops: 4,

  sleepBelowEnergy: 15,
  nightSleepBelowEnergy: 70,
  nightStartHour: 23,
  nightEndHour: 7,

  mistakeAfterMs: 30 * MINUTE,
  sickMistakeAfterMs: 2 * HOUR,
  maxMistakesForHood: 3,

  healthLossPerProblemPerHour: 10,
  healthLossPerPoopPerHour: 3,
  healthRegenPerHour: 6,
  sickChancePerPoopPerHour: 0.08,
  sickChanceStarvingPerHour: 0.1,

  snackDecayPerHour: 1,
  snackSickAt: 4,

  /** While the app is closed time passes at half speed, capped, and never fatally. */
  offlineCapMs: 12 * HOUR,
  offlineRate: 0.5,
  offlineHealthFloor: 25,
} as const;

export type Rng = () => number;

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

export function newEgg(now: number, generation = 1, name = "모찌"): PetState {
  return {
    version: 1,
    name,
    generation,
    bornAt: now,
    hatchedAt: null,
    stage: "egg",
    form: null,
    hunger: 80,
    happy: 80,
    energy: 100,
    health: 100,
    weight: 5,
    poops: 0,
    sick: false,
    asleep: false,
    lightsOff: false,
    careMistakes: 0,
    snackStreak: 0,
    poopTimer: 0,
    zeroHungerMs: 0,
    zeroHappyMs: 0,
    sickMs: 0,
    hungerMistakeCounted: false,
    happyMistakeCounted: false,
    sickMistakeCounted: false,
    gone: false,
    lastTick: now,
    stats: { fed: 0, snacks: 0, played: 0, cleaned: 0, healed: 0 },
  };
}

const clone = (s: PetState): PetState => ({ ...s, stats: { ...s.stats } });

export function isNight(t: number): boolean {
  const h = new Date(t).getHours();
  return h >= RULES.nightStartHour || h < RULES.nightEndHour;
}

export interface AdvanceOptions {
  rng?: Rng;
  /** True when catching up on time that passed while the app was closed. */
  offline?: boolean;
}

/** Move the simulation forward to `now`, in steps of at most one minute. */
export function advance(
  prev: PetState,
  now: number,
  { rng = Math.random, offline = false }: AdvanceOptions = {},
): { state: PetState; events: GameEvent[] } {
  const s = clone(prev);
  const events: GameEvent[] = [];
  if (now <= s.lastTick) return { state: s, events };

  let t = s.lastTick;
  if (offline && now - t > RULES.offlineCapMs) t = now - RULES.offlineCapMs;

  while (t < now) {
    const dt = Math.min(MINUTE, now - t);
    t += dt;
    stepOnce(s, dt, t, rng, offline, events);
  }
  s.lastTick = now;
  return { state: s, events: dedupe(events) };
}

function dedupe(events: GameEvent[]): GameEvent[] {
  return [...new Set(events)];
}

function stepOnce(s: PetState, dt: number, t: number, rng: Rng, offline: boolean, events: GameEvent[]) {
  if (s.gone) return;

  if (s.stage === "egg") {
    if (t - s.bornAt >= RULES.hatchAfterMs) {
      s.stage = "baby";
      s.hatchedAt = t;
      events.push("hatched");
    }
    return;
  }

  const rate = offline ? RULES.offlineRate : 1;
  const h = (dt / HOUR) * rate;
  const before = { hunger: s.hunger, happy: s.happy, poops: s.poops };

  // --- needs decay -------------------------------------------------------
  if (s.asleep) {
    s.hunger = clamp(s.hunger - RULES.hungerPerHourAsleep * h);
    s.happy = clamp(s.happy - RULES.happyPerHourAsleep * h);
    s.energy = clamp(s.energy + (s.lightsOff ? RULES.energyRecoverDark : RULES.energyRecoverLight) * h);
  } else {
    s.hunger = clamp(s.hunger - RULES.hungerPerHour * h);
    s.happy = clamp(s.happy - RULES.happyPerHour * h);
    s.energy = clamp(s.energy - RULES.energyPerHour * h);

    s.poopTimer += dt * rate;
    if (s.poopTimer >= RULES.poopEveryMs) {
      s.poopTimer = 0;
      if (s.poops < RULES.maxPoops) {
        s.poops += 1;
        events.push("pooped");
      }
    }
  }
  s.snackStreak = Math.max(0, s.snackStreak - RULES.snackDecayPerHour * h);

  // --- neglect → care mistakes -------------------------------------------
  if (s.hunger <= 0) {
    s.zeroHungerMs += dt;
    if (s.zeroHungerMs >= RULES.mistakeAfterMs && !s.hungerMistakeCounted) {
      s.careMistakes += 1;
      s.hungerMistakeCounted = true;
    }
  } else {
    s.zeroHungerMs = 0;
    s.hungerMistakeCounted = false;
  }
  if (s.happy <= 0) {
    s.zeroHappyMs += dt;
    if (s.zeroHappyMs >= RULES.mistakeAfterMs && !s.happyMistakeCounted) {
      s.careMistakes += 1;
      s.happyMistakeCounted = true;
    }
  } else {
    s.zeroHappyMs = 0;
    s.happyMistakeCounted = false;
  }
  if (s.sick) {
    s.sickMs += dt;
    if (s.sickMs >= RULES.sickMistakeAfterMs && !s.sickMistakeCounted) {
      s.careMistakes += 1;
      s.sickMistakeCounted = true;
    }
  } else {
    s.sickMs = 0;
    s.sickMistakeCounted = false;
  }

  // --- getting sick --------------------------------------------------------
  if (!s.sick) {
    const perHour =
      (s.poops >= 2 ? RULES.sickChancePerPoopPerHour * s.poops : 0) +
      (s.hunger <= 0 ? RULES.sickChanceStarvingPerHour : 0);
    if (perHour > 0 && rng() < perHour * h) {
      s.sick = true;
      events.push("gotSick");
    }
  }

  // --- health --------------------------------------------------------------
  const problems = (s.hunger <= 0 ? 1 : 0) + (s.happy <= 0 ? 1 : 0) + (s.sick ? 1 : 0);
  if (problems === 0 && s.poops === 0) {
    s.health = clamp(s.health + RULES.healthRegenPerHour * h);
  } else {
    s.health = clamp(
      s.health - RULES.healthLossPerProblemPerHour * problems * h - RULES.healthLossPerPoopPerHour * s.poops * h,
    );
  }
  if (offline) s.health = Math.max(s.health, RULES.offlineHealthFloor);
  if (s.health <= 0) {
    s.gone = true;
    s.asleep = false;
    s.lightsOff = false;
    events.push("gone");
    return;
  }

  if (
    (before.hunger >= 25 && s.hunger < 25) ||
    (before.happy >= 25 && s.happy < 25) ||
    (before.poops < 2 && s.poops >= 2)
  ) {
    events.push("needsCare");
  }

  // --- sleep cycle ---------------------------------------------------------
  const night = isNight(t);
  if (!s.asleep) {
    if (s.energy <= RULES.sleepBelowEnergy || (night && s.energy < RULES.nightSleepBelowEnergy)) {
      s.asleep = true;
      events.push("fellAsleep");
    }
  } else if (s.energy >= 100 && !night) {
    s.asleep = false;
    s.lightsOff = false;
    events.push("wokeUp");
  }

  // --- growing up ----------------------------------------------------------
  const sinceHatch = t - (s.hatchedAt ?? t);
  if (s.stage === "baby" && sinceHatch >= RULES.childAfterMs) {
    s.stage = "child";
    events.push("evolved");
  } else if (s.stage === "child" && sinceHatch >= RULES.adultAfterMs) {
    s.stage = "adult";
    s.form = s.careMistakes <= RULES.maxMistakesForHood ? "hood" : "plain";
    events.push("evolved");
  }
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

function blocked(s: PetState, allowWhileAsleep = false): string | null {
  if (s.gone) return "별나라로 떠났어요…";
  if (s.stage === "egg") return "아직 알이에요. 조금만 기다려요!";
  if (s.asleep && !allowWhileAsleep) return "쿨쿨… 자고 있어요";
  return null;
}

const fail = (s: PetState, message: string): ActionResult => ({ state: s, ok: false, message });

export function feed(prev: PetState): ActionResult {
  const why = blocked(prev);
  if (why) return fail(prev, why);
  if (prev.hunger >= 95) return fail(prev, "배불러! 더는 못 먹어");
  const s = clone(prev);
  s.hunger = clamp(s.hunger + 25);
  s.weight += 1;
  s.stats.fed += 1;
  return { state: s, ok: true, message: "냠냠! 맛있다", effect: "rice" };
}

export function snack(prev: PetState): ActionResult {
  const why = blocked(prev);
  if (why) return fail(prev, why);
  const s = clone(prev);
  s.happy = clamp(s.happy + 15);
  s.hunger = clamp(s.hunger + 5);
  s.weight += 2;
  s.snackStreak += 1;
  s.stats.snacks += 1;
  if (s.snackStreak >= RULES.snackSickAt && !s.sick) {
    s.sick = true;
    return { state: s, ok: true, message: "간식을 너무 먹었나 봐… 배가 아파", effect: "pudding" };
  }
  return { state: s, ok: true, message: "달콤해! 최고야", effect: "pudding" };
}

/** Checks whether a play session may start; the game itself runs in the UI. */
export function canPlay(s: PetState): ActionResult {
  const why = blocked(s);
  if (why) return fail(s, why);
  if (s.sick) return fail(s, "몸이 안 좋아서 못 놀겠어…");
  if (s.energy < RULES.sleepBelowEnergy + 5) return fail(s, "너무 졸려…");
  return { state: s, ok: true, message: "" };
}

export function finishGame(prev: PetState, wins: number, rounds: number): ActionResult {
  const s = clone(prev);
  const won = wins * 2 > rounds;
  s.happy = clamp(s.happy + (won ? 40 : 10));
  s.energy = clamp(s.energy - 8);
  s.weight = Math.max(1, s.weight - 1);
  s.stats.played += 1;
  return {
    state: s,
    ok: true,
    message: won ? `${wins}/${rounds} 맞췄다! 신난다!` : `${wins}/${rounds}… 그래도 재밌었어!`,
    effect: "hearts",
  };
}

export function clean(prev: PetState): ActionResult {
  const why = blocked(prev, true);
  if (why) return fail(prev, why);
  if (prev.poops === 0) return fail(prev, "이미 깨끗해!");
  const s = clone(prev);
  s.poops = 0;
  s.stats.cleaned += 1;
  return { state: s, ok: true, message: "반짝반짝 깨끗해졌다!", effect: "clean" };
}

export function medicine(prev: PetState): ActionResult {
  const why = blocked(prev, true);
  if (why) return fail(prev, why);
  if (!prev.sick) return fail(prev, "아프지 않은걸?");
  const s = clone(prev);
  s.sick = false;
  s.snackStreak = 0;
  s.health = clamp(s.health + 10);
  s.stats.healed += 1;
  return { state: s, ok: true, message: "약 먹었다… 이제 괜찮아!", effect: "pill" };
}

export function toggleLights(prev: PetState): ActionResult {
  const why = blocked(prev, true);
  if (why) return fail(prev, why);
  const s = clone(prev);
  if (s.lightsOff) {
    s.lightsOff = false;
    return { state: s, ok: true, message: s.asleep ? "눈부셔… 쿨쿨" : "불을 켰어요", effect: "lights" };
  }
  if (s.asleep) {
    s.lightsOff = true;
    return { state: s, ok: true, message: "잘 자, 좋은 꿈 꿔", effect: "lights" };
  }
  if (s.energy < 80) {
    s.asleep = true;
    s.lightsOff = true;
    return { state: s, ok: true, message: "하암… 잘 자요", effect: "lights" };
  }
  return fail(s, "아직 하나도 안 졸려!");
}

export function pat(prev: PetState): ActionResult {
  const why = blocked(prev);
  if (why) return fail(prev, why);
  const s = clone(prev);
  s.happy = clamp(s.happy + 3);
  return { state: s, ok: true, message: "", effect: "hearts" };
}

// ---------------------------------------------------------------------------
// Derived values for the UI
// ---------------------------------------------------------------------------

export function moodOf(s: PetState): Mood {
  if (s.gone) return "gone";
  if (s.asleep) return "sleep";
  if (s.sick) return "sick";
  if (s.hunger < 25) return "hungry";
  if (s.happy < 25) return "sad";
  if (s.happy >= 70 && s.hunger >= 50) return "happy";
  return "normal";
}

export const hearts = (v: number) => Math.max(0, Math.min(4, Math.ceil(v / 25)));

export function needsAttention(s: PetState): boolean {
  if (s.gone || s.stage === "egg") return false;
  if (s.asleep) return !s.lightsOff || s.sick;
  return s.hunger < 25 || s.happy < 25 || s.poops >= 2 || s.sick;
}

/** Age in whole days since hatching (Tamagotchi-style "years"). */
export function ageDays(s: PetState, now: number): number {
  if (!s.hatchedAt) return 0;
  return Math.floor((now - s.hatchedAt) / (24 * HOUR));
}

export const STAGE_LABEL: Record<PetState["stage"], string> = {
  egg: "알",
  baby: "아기",
  child: "어린이",
  adult: "어른",
};
