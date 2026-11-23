import { useEffect, useRef } from "react";
import type { Grid } from "@/game/sprites";

/** Renders a sprite grid into a tiny canvas, scaled up crisply by CSS. */
export function PixelIcon({ grid, scale = 2, recolor }: { grid: Grid; scale?: number; recolor?: (c: string) => string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c) return;
        ctx.fillStyle = recolor ? recolor(c) : c;
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  }, [grid, w, h, recolor]);
  return <canvas ref={ref} width={w} height={h} className="pixel" style={{ width: w * scale, height: h * scale }} />;
}
