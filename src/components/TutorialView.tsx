import type { ReactNode } from "react";
import { buildPet, ICONS, ITEMS } from "@/game/sprites";
import { TUTORIAL_PAGES } from "@/store/gameStore";
import { PixelIcon } from "./PixelIcon";

const EGG = buildPet("egg", "normal");
const HOOD = buildPet("hood", "happy");

function Item({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="tut-item">
      <span className="tut-icon">{icon}</span>
      <span>
        <b>{title}</b> {children}
      </span>
    </div>
  );
}

function Key({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="tut-item">
      <span className="tut-key">{k}</span>
      <span>{children}</span>
    </div>
  );
}

const PAGES: { title: string; body: ReactNode }[] = [
  {
    title: "어서 와요!",
    body: (
      <>
        <div className="tut-hero">
          <PixelIcon grid={EGG} scale={1.5} />
        </div>
        <p>1분 뒤 알에서 모찌가 태어나요. 잘 키워 주세요!</p>
      </>
    ),
  },
  {
    title: "버튼",
    body: (
      <>
        <Key k="A">메뉴 열기 · 넘기기</Key>
        <Key k="B">고르기</Key>
        <Key k="C">취소 · 닫기</Key>
      </>
    ),
  },
  {
    title: "돌보기 ①",
    body: (
      <>
        <Item icon={<PixelIcon grid={ICONS.feed!} scale={1.5} />} title="밥">
          배가 불러요
        </Item>
        <Item icon={<PixelIcon grid={ICONS.snack!} scale={1.5} />} title="간식">
          기분↑ 많으면 배탈
        </Item>
        <Item icon={<PixelIcon grid={ICONS.play!} scale={1.5} />} title="놀이">
          볼 방향 맞히기
        </Item>
      </>
    ),
  },
  {
    title: "돌보기 ②",
    body: (
      <>
        <Item icon={<PixelIcon grid={ICONS.clean!} scale={1.5} />} title="청소">
          똥을 두면 아파요
        </Item>
        <Item icon={<PixelIcon grid={ICONS.medicine!} scale={1.5} />} title="약">
          아플 때 먹여요
        </Item>
        <Item icon={<PixelIcon grid={ICONS.lights!} scale={1.5} />} title="불">
          잠들면 꺼 주세요
        </Item>
      </>
    ),
  },
  {
    title: "꿀팁",
    body: (
      <>
        <Item icon={<PixelIcon grid={ITEMS.alert} scale={2} />} title="!">
          깜빡이면 돌봐 줘요
        </Item>
        <Item icon={<PixelIcon grid={ITEMS.smallHeart} scale={2} />} title="화면 클릭">
          쓰다듬기
        </Item>
        <Item icon={<PixelIcon grid={ITEMS.star} scale={1.5} />} title="꺼 둬도">
          천천히 자라요
        </Item>
      </>
    ),
  },
  {
    title: "잘 키우면…",
    body: (
      <>
        <div className="tut-hero">
          <PixelIcon grid={HOOD} scale={1.5} />
        </div>
        <p>정성껏 돌보면 하루 뒤 후드 모찌로 자라요!</p>
      </>
    ),
  },
];

if (PAGES.length !== TUTORIAL_PAGES) console.warn("TUTORIAL_PAGES is out of sync with the tutorial pages");

/** How-to-play pages shown on first launch and from the tray's "사용법 보기". */
export function TutorialView({ page }: { page: number }) {
  const p = PAGES[page] ?? PAGES[0]!;
  const last = page === PAGES.length - 1;
  return (
    <div className="panel tutorial">
      <div className="row title">
        {p.title} <small>{page + 1}/{PAGES.length}</small>
      </div>
      <div className="tut-body">{p.body}</div>
      <div className="hint">{last ? "B 시작하기!" : `${page > 0 ? "A 이전 " : ""}B 다음 C 닫기`}</div>
    </div>
  );
}
