# S-021 물고기 목록·속성 패널 섬네일 편집 프리뷰 일치

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 이슈 #15: 물고기 목록 / 물고기 섬네일의 편집 기능(좌우 반전, 상하 반전, 회전)이 "이미지의 원본"이 아닌 "마지막 상태"를 기준으로 동작하는 문제를 해결한다.
- 편집 결과가 사용자가 보는 섬네일(원본 이미지) 위에 직접 반영되도록 하여, 편집 조작이 항상 등록된 원본 이미지를 기준으로 일관되게 보이도록 한다.

## 범위

- 포함할 것:
  - `renderFishList`(`src/features/fish-list/view.js`)의 `.fish-list-thumb` `<img>`에 `flipped`, `flippedY`, `rotation`, `scaleX`, `scaleY` 변환을 인라인 스타일로 적용한다.
  - `renderPanelShell`(`src/features/prop-panel/view.js`)의 `.prop-panel-thumb` `<img>`에 동일한 변환을 인라인 스타일로 적용한다.
  - 변환 인라인 스타일을 일관되게 만들기 위한 헬퍼 함수(예: `getFishThumbTransform(fish)`)를 `src/lib/fishSpriteStyle.js`에 추가한다.
  - 단위 테스트: 헬퍼 함수가 `flipped`/`flippedY`/`rotation`/`scaleX`/`scaleY` 조합을 올바른 CSS `transform` 문자열로 변환하는지 검증.
- 제외할 것:
  - 어항 내 라이브 스프라이트의 동작 변경 (이동 방향 기반 자동 반전 로직은 그대로 유지).
  - `headDirection` 토글, 이름·움직임 토글 등 이미지 변환과 무관한 컨트롤.
  - 신규 컨트롤 추가, UI 레이아웃 변경.

## 사용자 흐름

1. 사용자가 물고기 목록(`aquarium-status`)을 펼친다.
2. 어떤 물고기의 편집 버튼(✏️)을 눌러 속성 패널을 연다.
3. 속성 패널에서 좌우 반전(↔️), 상하 반전(↕️) 또는 고급 설정의 회전 슬라이더를 조작한다.
4. 즉시 다음 두 위치의 섬네일이 동시에 같은 변환 결과로 갱신된다.
   - 물고기 목록 항목의 `.fish-list-thumb`
   - 속성 패널 헤더의 `.prop-panel-thumb`
5. 어항 내 스프라이트는 이동 방향 기반 자동 반전과 합성되어 그대로 동작한다.
6. 초기화(🔄) 버튼을 누르면 두 섬네일이 즉시 원본 상태(변환 없음)로 돌아간다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - `.fish-list-thumb`와 `.prop-panel-thumb`에 인라인 `style="transform: ...; transform-origin: center;"` 적용.
  - 변환 순서: `rotate(${rotation}deg) scale(${scaleX * (flipped ? -1 : 1)}, ${scaleY * (flippedY ? -1 : 1)})`.
- 필요한 상태:
  - 기존 `fish` 모델 필드(`flipped`, `flippedY`, `rotation`, `scaleX`, `scaleY`)만 사용. 신규 상태 없음.
- 오류 또는 빈 상태:
  - 값이 누락된 경우 안전한 기본값(`flipped=false`, `flippedY=false`, `rotation=0`, `scaleX=1`, `scaleY=1`)을 사용한다.

## 구현 메모

- 관련 파일:
  - `src/lib/fishSpriteStyle.js` — `getFishThumbTransform(fish)` 헬퍼 추가.
  - `src/lib/fishSpriteStyle.test.js` — 헬퍼 단위 테스트 추가.
  - `src/features/fish-list/view.js` — 섬네일 `<img>`에 인라인 transform 스타일 적용.
  - `src/features/prop-panel/view.js` — 패널 헤더 섬네일 `<img>`에 인라인 transform 스타일 적용.
- `ARCHITECTURE.md` 기준으로 새 파일이나 디렉터리는 필요하지 않다.
- 라이브 스프라이트 렌더링 경로(`getFishSpriteStyleVars`, `shouldFlipFishForMovement`)는 변경하지 않는다.

## 검증 기준

- [ ] 좌우 반전(↔️)을 누르면 두 섬네일이 좌우로 뒤집힌다.
- [ ] 상하 반전(↕️)을 누르면 두 섬네일이 상하로 뒤집힌다.
- [ ] 회전 슬라이더를 조작하면 두 섬네일이 같은 각도로 회전한다.
- [ ] 스케일 X/Y 슬라이더를 조작하면 두 섬네일이 같은 비율로 변형된다.
- [ ] 초기화(🔄) 버튼을 누르면 두 섬네일이 변환 없는 원본 상태로 돌아간다.
- [ ] 어항 내 라이브 스프라이트의 자동 이동·반전 동작이 그대로 유지된다.
- [ ] `npm run lint`, `npm run test`, `npm run build`가 모두 통과한다.
- [ ] 브라우저 콘솔 오류가 없다.
