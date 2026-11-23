import { describe, expect, it } from "vitest";
import {
  HOUR,
  MINUTE,
  RULES,
  advance,
  clean,
  feed,
  finishGame,
  hearts,
  medicine,
  moodOf,
  newEgg,
  snack,
  toggleLights,
} from "./engine";

// Noon local time, so night-time sleeping doesn't interfere unless a test wants it.
const NOON = new Date(2026, 0, 10, 12, 0, 0).getTime();
const never = () => 1;
const always = () => 0;

function hatched(now = NOON) {
  const egg = newEgg(now - 2 * MINUTE);
  return advance(egg, now, { rng: never }).state;
}

describe("growing up", () => {
  it("hatches after a minute", () => {
    const egg = newEgg(NOON);
    expect(advance(egg, NOON + 30_000).state.stage).toBe("egg");
    const r = advance(egg, NOON + MINUTE, { rng: never });
    expect(r.state.stage).toBe("baby");
    expect(r.events).toContain("hatched");
  });

  it("becomes a child after an hour and a hooded adult when well cared for", () => {
    let s = hatched();
    s = advance(s, NOON + HOUR + MINUTE, { rng: never }).state;
    expect(s.stage).toBe("child");
    s = { ...s, careMistakes: 0, hatchedAt: NOON - 24 * HOUR };
    s = advance(s, s.lastTick + MINUTE, { rng: never }).state;
    expect(s.stage).toBe("adult");
    expect(s.form).toBe("hood");
  });

  it("becomes the plain form after many care mistakes", () => {
    const s = { ...hatched(), stage: "child" as const, careMistakes: RULES.maxMistakesForHood + 1, hatchedAt: NOON - 24 * HOUR };
    expect(advance(s, NOON + MINUTE, { rng: never }).state.form).toBe("plain");
  });
});

describe("needs", () => {
  it("gets hungry over time while awake", () => {
    const s = hatched();
    const later = advance({ ...s, hunger: 100 }, NOON + 3 * HOUR, { rng: never }).state;
    expect(later.hunger).toBeCloseTo(50, 0);
  });

  it("poops on a timer", () => {
    const s = hatched();
    const r = advance(s, NOON + RULES.poopEveryMs + MINUTE, { rng: never });
    expect(r.state.poops).toBe(1);
    expect(r.events).toContain("pooped");
  });

  it("counts a care mistake once per neglect episode", () => {
    const s = { ...hatched(), hunger: 0 };
    const r = advance(s, NOON + 2 * HOUR, { rng: never }).state;
    expect(r.careMistakes).toBe(1);
  });

  it("falls asleep when exhausted and recovers faster with lights off", () => {
    const s = { ...hatched(), energy: 10 };
    const asleep = advance(s, NOON + MINUTE, { rng: never }).state;
    expect(asleep.asleep).toBe(true);
    const dark = advance({ ...asleep, lightsOff: true }, NOON + 2 * HOUR, { rng: never }).state;
    const light = advance({ ...asleep, lightsOff: false }, NOON + 2 * HOUR, { rng: never }).state;
    expect(dark.energy).toBeGreaterThan(light.energy);
  });

  it("can get sick from dirt and be cured", () => {
    const s = { ...hatched(), poops: 3 };
    const sick = advance(s, NOON + 10 * MINUTE, { rng: always }).state;
    expect(sick.sick).toBe(true);
    expect(moodOf(sick)).toBe("sick");
    const cured = medicine(sick);
    expect(cured.ok).toBe(true);
    expect(cured.state.sick).toBe(false);
  });

  it("leaves for the star planet when health runs out, but never while offline", () => {
    const s = { ...hatched(), hunger: 0, happy: 0, sick: true, health: 5 };
    expect(advance(s, NOON + 2 * HOUR, { rng: never }).state.gone).toBe(true);
    expect(advance(s, NOON + 48 * HOUR, { rng: never, offline: true }).state.gone).toBe(false);
  });
});

describe("actions", () => {
  it("feeding fills the stomach and refuses when full", () => {
    const s = { ...hatched(), hunger: 30 };
    const r = feed(s);
    expect(r.ok).toBe(true);
    expect(r.state.hunger).toBe(55);
    expect(feed({ ...s, hunger: 100 }).ok).toBe(false);
  });

  it("too many snacks cause a tummy ache", () => {
    let s = hatched();
    for (let i = 0; i < RULES.snackSickAt; i++) s = snack(s).state;
    expect(s.sick).toBe(true);
  });

  it("cleaning removes poops", () => {
    const r = clean({ ...hatched(), poops: 2 });
    expect(r.state.poops).toBe(0);
    expect(clean(hatched()).ok).toBe(false);
  });

  it("lights put a sleepy pet to bed but not an energetic one", () => {
    expect(toggleLights({ ...hatched(), energy: 100 }).ok).toBe(false);
    const bed = toggleLights({ ...hatched(), energy: 50 });
    expect(bed.state.asleep && bed.state.lightsOff).toBe(true);
    expect(feed(bed.state).ok).toBe(false);
  });

  it("winning the mini-game makes the pet happier than losing", () => {
    const s = { ...hatched(), happy: 20 };
    expect(finishGame(s, 4, 5).state.happy).toBeGreaterThan(finishGame(s, 1, 5).state.happy);
  });

  it("maps values to 0..4 hearts", () => {
    expect([0, 1, 25, 26, 75, 100].map(hearts)).toEqual([0, 1, 1, 2, 3, 4]);
  });
});
