import type { GameEvent, Mood, PetState } from "./types";

const pick = <T,>(xs: readonly T[], rng = Math.random): T => xs[Math.floor(rng() * xs.length)]!;

const IDLE: Record<Mood, readonly string[]> = {
  happy: ["오늘 기분 최고야!", "같이 있어서 좋아", "히히, 간지러워", "콧노래가 절로 나와~", "우리 내일도 놀자!"],
  normal: ["뭐 하고 있어?", "심심한데…", "오늘 하루는 어땠어?", "물 한 잔 마셨어?", "잠깐 스트레칭 할까?"],
  hungry: ["배고파…", "꼬르륵 소리 들려?", "밥 주세요…!"],
  sad: ["놀아줘…", "나 좀 봐줘", "조금 외로워…"],
  sick: ["몸이 안 좋아…", "으슬으슬해… 약 줘"],
  sleep: ["쿨쿨…", "음냐음냐…"],
  gone: ["…"],
};

export function idleLine(mood: Mood, s: PetState): string {
  if (s.poops >= 2 && mood !== "sleep") return "방이 좀 지저분해…";
  return pick(IDLE[mood]);
}

export function eventLine(e: GameEvent, s: PetState): string | null {
  switch (e) {
    case "hatched":
      return `알에서 태어났어! 나는 ${s.name}야`;
    case "evolved":
      if (s.stage === "child") return "쑥쑥! 조금 컸어요";
      if (s.form === "hood") return "어른이 됐어! 후드가 잘 어울리지?";
      return "어른이 됐어!";
    case "pooped":
      return "끙… 치워줄래?";
    case "gotSick":
      return "몸이 안 좋아…";
    case "fellAsleep":
      return "하암… 졸려. 불 꺼줘";
    case "wokeUp":
      return "잘 잤다! 좋은 아침";
    case "needsCare":
      return "나 좀 봐줘!";
    case "gone":
      return `${s.name}는 별나라로 여행을 떠났어요`;
  }
}

export const PAT_LINES = ["헤헤", "좋아!", "더 쓰다듬어줘", "♪", "부드럽지?"] as const;
export const patLine = () => pick(PAT_LINES);
