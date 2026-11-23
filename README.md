# Mochi Pocket 🥚

바탕화면 위에 떠 있는 작은 다마고치풍 육성 게임입니다.
하트 버튼 세 개가 달린 고양이 귀 기기 안에서 하얀 찹쌀떡 같은 펫 **모찌**를 알부터 키워요.

Tauri 2 + React + TypeScript로 만들었습니다.

## 기능

- **성장 단계**: 알 → 아기(1분 뒤 부화) → 어린이(부화 1시간 뒤) → 어른(부화 24시간 뒤)
  - 어른이 될 때 돌봄 실수가 3번 이하면 **후드 모찌**, 그보다 많으면 **그냥 모찌**로 자라요.
- **돌보기 메뉴**: 밥 / 간식 / 놀아주기(좌우 맞히기 미니게임) / 청소 / 약 / 불 켜기·끄기 / 상태 보기
- **시간에 따라 변하는 상태**: 배부름, 기분, 기운이 줄어들고, 똥을 싸고, 방치하면 아파요.
  - 간식을 한꺼번에 많이 주면 배탈이 나요.
  - 밤(23시~7시)에는 졸려하고, 불을 꺼주면 더 빨리 기운을 회복해요.
  - 체력이 0이 되면 별나라로 여행을 떠나고 새 알을 받을 수 있어요.
- **앱을 꺼둔 동안**: 시간이 절반 속도로 흐르고(최대 12시간), 꺼둔 사이에는 떠나지 않아요.
- 화면을 클릭하면 쓰다듬어 줄 수 있어요.
- **처음 실행하면 사용법 안내(6쪽)**가 나와요. 나중에 메뉴 막대의 "사용법 보기"로 다시 볼 수 있어요.
- 항상 위에 떠 있는 투명 창, 드래그로 이동, 메뉴 막대(트레이) 메뉴, 창 위치 기억.

## 조작

| 버튼 | 키보드 | 평소 | 메뉴가 열렸을 때 | 미니게임 |
| --- | --- | --- | --- | --- |
| 왼쪽 하트 (A) | `←` `1` `A` | 메뉴 열기 | 다음 아이콘 | 왼쪽 |
| 가운데 하트 (B) | `Enter` `Space` `2` `S` | 상태 보기 | 선택 | — |
| 오른쪽 하트 (C) | `Esc` `→` `3` `D` | 말 걸기 | 닫기 | 오른쪽 |

메뉴 막대의 아이콘에서 보이기/숨기기, 항상 위에, 효과음, 크기(작게·보통·크게), 사용법 보기, 새 알로 다시 시작, 종료를 할 수 있어요.

## 개발

필요한 것: Node 20+, Rust (stable), [Tauri 2 사전 준비물](https://v2.tauri.app/start/prerequisites/)

```bash
npm install
npm run tauri:dev      # 데스크톱 앱으로 실행
npm run dev            # 브라우저에서 UI만 실행 (http://localhost:1430, 저장은 localStorage)
npm test               # 게임 규칙 단위 테스트
npm run tauri:build    # 배포용 앱 빌드 (.app / .dmg / .msi)
npm run icons          # 스프라이트로 앱 아이콘·트레이 아이콘 다시 만들기
```

세이브 파일은 OS의 앱 데이터 폴더에 `save.json`으로 저장됩니다
(macOS: `~/Library/Application Support/dev.youngryul.mochipocket/`).

## 구조

```
src/
  game/
    engine.ts       게임 규칙 (순수 함수: 시간 경과, 행동, 진화) + engine.test.ts
    sprites.ts      도트 캐릭터를 코드로 생성 (몸통·귀·후드 → 자동 외곽선 → 표정)
    renderer.ts     48×48 LCD 화면 그리기 (방, 펫, 똥, 효과)
    dialogue.ts     말풍선 대사
  store/gameStore.ts  버튼 입력·미니게임·저장을 묶는 zustand 스토어
  components/       기기 외형(SVG), 화면, 상태창
  lib/              Tauri 호출(세이브), 효과음
src-tauri/
  src/lib.rs        창·플러그인 설정, 세이브 명령
  src/save.rs       save.json 읽기/쓰기 (임시 파일 → rename)
  src/tray.rs       메뉴 막대 메뉴
scripts/            아이콘 생성 스크립트
```

게임 규칙의 수치는 `src/game/engine.ts`의 `RULES`에 모여 있어서 난이도 조절이 쉬워요.

## 크레딧

- 폰트: [Galmuri](https://github.com/quiple/galmuri) by Lee Minseo — SIL Open Font License 1.1
- 캐릭터와 기기 디자인은 이 프로젝트를 위해 새로 그린 것입니다.
