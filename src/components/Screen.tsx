import { useEffect, useRef } from "react";
import { moodOf, needsAttention } from "@/game/engine";
import { formOf, renderScene, SCREEN } from "@/game/renderer";
import { ICONS } from "@/game/sprites";
import { MENU, useGame } from "@/store/gameStore";
import { PixelIcon } from "./PixelIcon";
import { StatusView } from "./StatusView";
import { TutorialView } from "./TutorialView";

const HALF_WIDTH = { egg: 7, baby: 7, child: 9, hood: 11, plain: 11 } as const;

/** The LCD: an animated canvas plus DOM overlays for text (bubble, menu, status). */
export function Screen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubble = useGame((s) => s.bubble);
  const menuOpen = useGame((s) => s.menuOpen);
  const menuIndex = useGame((s) => s.menuIndex);
  const view = useGame((s) => s.view);
  const statusPage = useGame((s) => s.statusPage);
  const tutorialPage = useGame((s) => s.tutorialPage);
  const pet = useGame((s) => s.pet);
  const patPet = useGame((s) => s.patPet);

  // Animation loop (~12 fps is plenty for pixel art) with a wandering pet.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let x = SCREEN / 2;
    let target = x;
    let look: -1 | 0 | 1 = 0;
    let nextMove = 0;
    let raf = 0;
    let last = 0;

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 80) return;
      last = t;
      const s = useGame.getState();
      const now = Date.now();
      const form = formOf(s.pet);
      const half = HALF_WIDTH[form];
      const moving = !s.pet.asleep && !s.pet.gone && form !== "egg" && s.view === "home" && !s.expression;

      if (s.view === "game" || form === "egg") {
        target = SCREEN / 2;
        x = target;
      } else if (moving) {
        if (now > nextMove) {
          const maxX = SCREEN - half - 1 - Math.min(s.pet.poops, 2) * 6;
          target = Math.max(half, Math.min(maxX, half + Math.random() * (maxX - half)));
          nextMove = now + 2500 + Math.random() * 4000;
        }
        if (Math.abs(target - x) >= 1) {
          x += Math.sign(target - x) * 0.5;
          look = target > x ? 1 : -1;
        } else look = 0;
      }

      renderScene(ctx, {
        state: s.pet,
        mood: moodOf(s.pet),
        now,
        petX: x,
        look,
        expression: s.expression,
        effect: s.effect,
        game: s.game ? { look: s.game.look } : null,
        attention: needsAttention(s.pet),
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const caption = menuOpen ? MENU[menuIndex]!.label : bubble?.text;
  const gone = pet.gone;

  return (
    <div className="screen" onClick={patPet}>
      <canvas ref={canvasRef} width={SCREEN} height={SCREEN} className="pixel lcd" />

      {view === "tutorial" ? (
        <TutorialView page={tutorialPage} />
      ) : view === "status" ? (
        <StatusView pet={pet} page={statusPage} />
      ) : (
        <>
          {(caption || gone) && (
            <div className={`bubble ${menuOpen ? "menu-caption" : ""}`}>
              {gone ? `${pet.name}는 별나라로 떠났어요. B로 새 알 받기` : caption}
            </div>
          )}
          {menuOpen && (
            <div className="menu">
              {MENU.map((m, i) => (
                <span key={m.id} className={i === menuIndex ? "on" : ""}>
                  <PixelIcon grid={ICONS[m.id]!} scale={1.5} />
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {view === "game" && <GameHud />}
    </div>
  );
}

function GameHud() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  return (
    <div className="game-hud">
      {game.round}/5 · ♥{game.wins}
    </div>
  );
}
