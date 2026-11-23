import { create } from "zustand";
import {
  advance,
  canPlay,
  clean,
  feed,
  finishGame,
  medicine,
  moodOf,
  needsAttention,
  newEgg,
  pat,
  snack,
  toggleLights,
} from "@/game/engine";
import { eventLine, idleLine, patLine } from "@/game/dialogue";
import type { EffectKind } from "@/game/renderer";
import type { ActionId, ActionResult, Expression, PetState } from "@/game/types";
import { loadSave, setTraySound, writeSave } from "@/lib/backend";
import { setSoundEnabled, sfx } from "@/lib/sound";

export type Size = "small" | "normal" | "large";
export const SIZE_SCALE: Record<Size, number> = { small: 0.8, normal: 1, large: 1.3 };

export interface Settings {
  sound: boolean;
  size: Size;
}

export const MENU: { id: ActionId; label: string }[] = [
  { id: "feed", label: "밥 주기" },
  { id: "snack", label: "간식 주기" },
  { id: "play", label: "놀아주기" },
  { id: "clean", label: "청소하기" },
  { id: "medicine", label: "약 주기" },
  { id: "lights", label: "불 켜기/끄기" },
  { id: "status", label: "상태 보기" },
];

const GAME_ROUNDS = 5;

export type View = "home" | "status" | "game" | "confirmReset";

export interface MiniGame {
  round: number; // 1-based
  wins: number;
  phase: "choose" | "reveal";
  look: -1 | 0 | 1;
  lastWin: boolean;
}

interface SaveFile {
  pet: PetState;
  settings: Settings;
}

interface GameStore {
  loaded: boolean;
  pet: PetState;
  settings: Settings;

  view: View;
  menuOpen: boolean;
  menuIndex: number;
  statusPage: number;
  bubble: { text: string; until: number } | null;
  expression: Expression;
  expressionUntil: number;
  effect: { kind: EffectKind; startedAt: number } | null;
  game: MiniGame | null;
  lastPat: number;
  nextChatter: number;

  init(): Promise<void>;
  tick(now: number): void;
  pressA(): void;
  pressB(): void;
  pressC(): void;
  patPet(): void;
  trayAction(action: string): void;
  setSize(size: Size): void;
}

const say = (text: string, ms = 3600) => ({ bubble: { text, until: Date.now() + ms } });

const nextChatterAt = (now: number) => now + 45_000 + Math.random() * 60_000;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(get: () => GameStore, delay = 800) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { pet, settings, loaded } = get();
    if (!loaded) return;
    const file: SaveFile = { pet, settings };
    void writeSave(JSON.stringify(file)).catch((e) => console.error("save failed", e));
  }, delay);
}

function isPetState(v: unknown): v is PetState {
  return !!v && typeof v === "object" && (v as PetState).version === 1 && typeof (v as PetState).lastTick === "number";
}

export const useGame = create<GameStore>((set, get) => {
  /** Apply the result of an engine action with matching feedback. */
  const applyResult = (r: ActionResult, expressionOnOk: Expression = "joy", okMs = 1200) => {
    const now = Date.now();
    if (!r.ok) {
      sfx.no();
      set({ expression: "no", expressionUntil: now + 1200, ...say(r.message, 2600) });
      return;
    }
    sfx.ok();
    const isFood = r.effect === "rice" || r.effect === "pudding";
    set({
      pet: r.state,
      menuOpen: false,
      expression: isFood ? "eat" : expressionOnOk,
      expressionUntil: now + (isFood ? 2400 : okMs),
      effect: r.effect ? { kind: r.effect, startedAt: now } : null,
      ...(r.message ? { bubble: { text: r.message, until: now + (isFood ? 2400 : 0) + 2800 } } : {}),
    });
    scheduleSave(get);
  };

  const runAction = (id: ActionId) => {
    const { pet } = get();
    switch (id) {
      case "feed":
        return applyResult(feed(pet));
      case "snack":
        return applyResult(snack(pet));
      case "clean":
        return applyResult(clean(pet));
      case "medicine":
        return applyResult(medicine(pet));
      case "lights":
        return applyResult(toggleLights(pet), null);
      case "status":
        sfx.button();
        return set({ view: "status", statusPage: 0, menuOpen: false, bubble: null });
      case "play": {
        const r = canPlay(pet);
        if (!r.ok) return applyResult(r);
        sfx.ok();
        return set({
          view: "game",
          menuOpen: false,
          game: { round: 1, wins: 0, phase: "choose", look: 0, lastWin: false },
          bubble: { text: "어느 쪽을 볼까? A ◀  ▶ C", until: Infinity },
        });
      }
    }
  };

  const guess = (dir: -1 | 1) => {
    const g = get().game;
    if (!g || g.phase !== "choose") return;
    const look: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
    const win = look === dir;
    if (win) sfx.ok();
    else sfx.no();
    set({
      game: { ...g, phase: "reveal", look, wins: g.wins + (win ? 1 : 0), lastWin: win },
      expression: win ? "joy" : "no",
      expressionUntil: Date.now() + 1000,
      bubble: { text: win ? "맞았다!" : "아쉽다~", until: Infinity },
    });
    setTimeout(() => {
      const cur = get().game;
      if (!cur) return;
      if (cur.round >= GAME_ROUNDS) {
        const r = finishGame(get().pet, cur.wins, GAME_ROUNDS);
        set({ view: "home", game: null });
        if (cur.wins * 2 > GAME_ROUNDS) sfx.fanfare();
        applyResult(r);
        return;
      }
      set({
        game: { ...cur, round: cur.round + 1, phase: "choose", look: 0 },
        bubble: { text: `${cur.round + 1}번째! A ◀  ▶ C`, until: Infinity },
      });
    }, 1100);
  };

  const startNewEgg = () => {
    const prev = get().pet;
    const pet = newEgg(Date.now(), prev.generation + 1, prev.name);
    sfx.fanfare();
    set({ pet, view: "home", menuOpen: false, game: null, effect: null, ...say("새 알이 찾아왔어요!") });
    scheduleSave(get, 0);
  };

  return {
    loaded: false,
    pet: newEgg(Date.now()),
    settings: { sound: true, size: "normal" },
    view: "home",
    menuOpen: false,
    menuIndex: 0,
    statusPage: 0,
    bubble: null,
    expression: null,
    expressionUntil: 0,
    effect: null,
    game: null,
    lastPat: 0,
    nextChatter: nextChatterAt(Date.now()),

    async init() {
      const now = Date.now();
      let pet: PetState | null = null;
      let settings = get().settings;
      try {
        const raw = await loadSave();
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SaveFile>;
          if (isPetState(parsed.pet)) pet = parsed.pet;
          if (parsed.settings) settings = { ...settings, ...parsed.settings };
        }
      } catch (e) {
        console.error("could not read save", e);
      }
      setSoundEnabled(settings.sound);
      void setTraySound(settings.sound);

      if (!pet) {
        set({ loaded: true, pet: newEgg(now), settings, ...say("알을 하나 주웠어요! 곧 태어날 거예요", 5000) });
        scheduleSave(get, 0);
        return;
      }
      // Catch up on the time the app was closed.
      const away = now - pet.lastTick;
      const { state } = advance(pet, now, { offline: true });
      const greeting = state.gone
        ? null
        : away > 60 * 60_000
          ? `보고 싶었어! ${Math.round(away / 3_600_000)}시간 만이야`
          : "또 왔네! 반가워";
      set({ loaded: true, pet: state, settings, ...(greeting ? say(greeting) : {}) });
      scheduleSave(get, 0);
    },

    tick(now) {
      const s = get();
      if (!s.loaded) return;
      // The pet doesn't get hungry mid-game; the game is short anyway.
      if (s.view === "game") return;
      const { state, events } = advance(s.pet, now);
      const patch: Partial<GameStore> = { pet: state };

      if (events.length) {
        const important = events.find((e) => e !== "needsCare") ?? events[0]!;
        const line = eventLine(important, state);
        if (line) patch.bubble = { text: line, until: now + 4200 };
        if (important === "hatched" || important === "evolved") sfx.fanfare();
        else if (important === "needsCare" || important === "gotSick" || important === "pooped") sfx.alert();
        if (important === "hatched" || important === "evolved") {
          patch.expression = "joy";
          patch.expressionUntil = now + 2000;
        }
        scheduleSave(get, 0);
      } else if (
        now > s.nextChatter &&
        s.view === "home" &&
        !s.menuOpen &&
        !s.bubble &&
        state.stage !== "egg" &&
        !state.gone
      ) {
        patch.bubble = { text: idleLine(moodOf(state), state), until: now + 3800 };
        patch.nextChatter = nextChatterAt(now);
      }

      if (s.bubble && s.bubble.until < now) patch.bubble = patch.bubble ?? null;
      if (s.expression && s.expressionUntil < now) patch.expression = null;
      set(patch);
    },

    pressA() {
      const s = get();
      sfx.button();
      if (s.pet.gone) return;
      switch (s.view) {
        case "status":
          return set({ statusPage: (s.statusPage + 1) % 2 });
        case "game":
          return guess(-1);
        case "confirmReset":
          return;
        default:
          if (!s.menuOpen) return set({ menuOpen: true, menuIndex: s.menuIndex, bubble: null });
          return set({ menuIndex: (s.menuIndex + 1) % MENU.length });
      }
    },

    pressB() {
      const s = get();
      if (s.pet.gone) return startNewEgg();
      switch (s.view) {
        case "status":
          sfx.button();
          return set({ statusPage: (s.statusPage + 1) % 2 });
        case "game":
          return;
        case "confirmReset":
          return startNewEgg();
        default:
          if (s.menuOpen) return runAction(MENU[s.menuIndex]!.id);
          return runAction("status");
      }
    },

    pressC() {
      const s = get();
      sfx.button();
      switch (s.view) {
        case "status":
          return set({ view: "home" });
        case "game":
          return guess(1);
        case "confirmReset":
          return set({ view: "home", bubble: null });
        default:
          if (s.menuOpen) return set({ menuOpen: false });
          if (s.bubble) return set({ bubble: null });
          if (s.pet.stage === "egg" || s.pet.gone) return;
          return set(say(idleLine(moodOf(s.pet), s.pet)));
      }
    },

    patPet() {
      const s = get();
      const now = Date.now();
      if (s.view !== "home" || now - s.lastPat < 1500) return;
      const r = pat(s.pet);
      if (!r.ok) return;
      sfx.button();
      set({
        pet: r.state,
        lastPat: now,
        expression: "joy",
        expressionUntil: now + 1000,
        effect: { kind: "hearts", startedAt: now },
        ...say(patLine(), 1800),
      });
      scheduleSave(get);
    },

    trayAction(action) {
      if (action === "reset") {
        return set({
          view: "confirmReset",
          menuOpen: false,
          game: null,
          bubble: { text: "새 알로 다시 시작할까요? B: 네  C: 아니요", until: Infinity },
        });
      }
      if (action.startsWith("sound:")) {
        const sound = action === "sound:true";
        setSoundEnabled(sound);
        set({ settings: { ...get().settings, sound } });
        return scheduleSave(get, 0);
      }
      if (action.startsWith("size:")) get().setSize(action.slice(5) as Size);
    },

    setSize(size) {
      if (!(size in SIZE_SCALE)) return;
      set({ settings: { ...get().settings, size } });
      scheduleSave(get, 0);
    },
  };
});

export const selectAttention = (s: GameStore) => needsAttention(s.pet);
