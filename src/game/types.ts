export type Stage = "egg" | "baby" | "child" | "adult";

/** Adult look depends on how well the pet was cared for while growing up. */
export type AdultForm = "hood" | "plain";

export interface PetState {
  version: 1;
  name: string;
  generation: number;
  /** When the egg appeared (ms epoch). */
  bornAt: number;
  hatchedAt: number | null;
  stage: Stage;
  form: AdultForm | null;

  /** 0..100 — shown to the player as 4 hearts. */
  hunger: number;
  happy: number;
  energy: number;
  /** Hidden 0..100. Reaching 0 sends the pet off to the star planet. */
  health: number;

  weight: number;
  poops: number;
  sick: boolean;
  asleep: boolean;
  lightsOff: boolean;

  careMistakes: number;
  /** Rises with each snack, falls over time. Too many snacks → tummy ache. */
  snackStreak: number;

  /** Internal timers (ms). */
  poopTimer: number;
  zeroHungerMs: number;
  zeroHappyMs: number;
  sickMs: number;
  /** Mistake flags so a single neglect episode only counts once. */
  hungerMistakeCounted: boolean;
  happyMistakeCounted: boolean;
  sickMistakeCounted: boolean;

  gone: boolean;
  lastTick: number;

  stats: { fed: number; snacks: number; played: number; cleaned: number; healed: number };
}

export type GameEvent =
  | "hatched"
  | "evolved"
  | "pooped"
  | "gotSick"
  | "fellAsleep"
  | "wokeUp"
  | "needsCare"
  | "gone";

export type Mood = "happy" | "normal" | "hungry" | "sad" | "sick" | "sleep" | "gone";

/** Short-lived expressions the UI plays on top of the mood. */
export type Expression = "eat" | "joy" | "no" | "look-left" | "look-right" | null;

export type ActionId = "feed" | "snack" | "play" | "clean" | "medicine" | "lights" | "status";

export interface ActionResult {
  state: PetState;
  ok: boolean;
  message: string;
  effect?: "rice" | "pudding" | "clean" | "pill" | "hearts" | "lights";
}
