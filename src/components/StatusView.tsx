import { ageDays, hearts, STAGE_LABEL } from "@/game/engine";
import { ITEMS } from "@/game/sprites";
import type { PetState } from "@/game/types";
import { PixelIcon } from "./PixelIcon";

const empty = (c: string) => (c === "#f48fb1" ? "#d9d3e4" : c === "#ffc4d8" ? "#ece8f2" : c);

function Hearts({ value }: { value: number }) {
  const n = hearts(value);
  return (
    <span className="hearts">
      {[0, 1, 2, 3].map((i) => (
        <PixelIcon key={i} grid={ITEMS.smallHeart} scale={2} recolor={i < n ? undefined : empty} />
      ))}
    </span>
  );
}

export function StatusView({ pet, page }: { pet: PetState; page: number }) {
  const now = Date.now();
  return (
    <div className="panel">
      {page === 0 ? (
        <>
          <div className="row title">
            {pet.name} <small>{pet.generation}대째</small>
          </div>
          <div className="row">
            <span>단계</span>
            <b>{STAGE_LABEL[pet.stage]}</b>
          </div>
          <div className="row">
            <span>나이</span>
            <b>{ageDays(pet, now)}살</b>
          </div>
          <div className="row">
            <span>몸무게</span>
            <b>{pet.weight}g</b>
          </div>
          <div className="row">
            <span>컨디션</span>
            <b>{pet.sick ? "아파요" : pet.health > 60 ? "튼튼" : "조금 약해요"}</b>
          </div>
        </>
      ) : (
        <>
          <div className="row">
            <span>배부름</span>
            <Hearts value={pet.hunger} />
          </div>
          <div className="row">
            <span>기분</span>
            <Hearts value={pet.happy} />
          </div>
          <div className="row">
            <span>기운</span>
            <Hearts value={pet.energy} />
          </div>
          <div className="row small">
            <span>밥 {pet.stats.fed} · 놀이 {pet.stats.played} · 청소 {pet.stats.cleaned}</span>
          </div>
        </>
      )}
      <div className="hint">
        {page + 1}/2 · A 다음 · C 닫기
      </div>
    </div>
  );
}
