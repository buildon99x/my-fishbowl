# S-032 토큰 축소 + Chrome Idle Auto-fade + Focus-visible

## 상태

- 상태: done
- 구현 여부: done
- 검증 여부: tested

## 목표

- radius/accent 색상 토큰을 축소해 일관성과 미학을 강화한다.
- 비활동 시(idle) chrome(dock, drawer 핸들, 음소거 버튼)을 자동으로 페이드해 어항을 시각적 영웅으로 만든다.
- 모든 dock/drawer 버튼에 `:focus-visible` outline을 추가해 키보드/포인터/스위치 컨트롤 사용자가 현재 포커스를 인지하게 한다.

## 범위

- 포함할 것:
  - radius 토큰 축소: `--radius-xl`/`--radius-sm`을 `--radius-lg`/`--radius-md`로 흡수(또는 alias).
  - accent 컬러 축소: `--color-brand-pink` 사용처를 `--color-brand-teal`로 통합(슬라이더 `accent-color`, prop-control-value 등). 2색(teal + ochre) 체계로 정리.
  - idle auto-fade: `body`에 `data-activity` 속성, 3초 무동작 시 `chrome` 요소들이 `opacity: 0.45`로 페이드, pointer/touch 발생 즉시 `opacity: 0.92` 복구.
  - `:focus-visible` 스타일: `.prop-btn`, `.prop-action-btn`, drawer 항목, dock 버튼 등에 3px outline.
- 제외할 것:
  - 레이아웃 구조 변경 → S-028 선행 의존.
  - 아이콘 변경 → S-031 등 별도.

## 사용자 흐름

1. 사용자가 3초간 아무 입력도 하지 않으면 dock과 우상단 음소거 버튼이 부드럽게 옅어진다.
2. 사용자가 화면을 터치하거나 마우스를 움직이면 즉시 원래 불투명도로 돌아온다.
3. 키보드 Tab으로 dock 버튼 사이를 이동하면 각 버튼에 명확한 outline이 표시된다.
4. 슬라이더와 강조 색상이 청록(teal) 계열로 일관되게 보인다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - chrome 요소에 공통 `.chrome` 클래스(또는 selector list).
  - `:focus-visible` outline 스타일.
- 필요한 상태:
  - `document.body[data-activity="idle"|"active"]`.
  - 마지막 활동 timestamp(JS in-memory).
- 오류 또는 빈 상태:
  - `prefers-reduced-motion: reduce` 시 fade transition 비활성(즉시 전환).

## 구현 메모

- 관련 파일:
  - `src/styles/tokens.css` — radius/color 토큰 정리.
  - `src/styles/components/*.css` — focus-visible 추가, accent 변경 반영.
  - 신규: `src/features/chrome-idle/index.js` — idle watcher(또는 `src/main.js` 안 간단한 hook).
- knip 통과를 위해 alias로만 남길 토큰은 사용처 갱신 필요.

## 검증 기준

- [ ] radius 토큰 사용처가 3종 이하로 축소되었다.
- [ ] 슬라이더/강조 텍스트의 분홍색이 사라지고 청록 또는 oker로 통합되었다.
- [ ] 3초 무동작 시 chrome이 페이드, 활동 즉시 복구된다.
- [ ] 키보드 Tab으로 dock/drawer 버튼이 명확한 focus outline을 보여준다.
- [ ] `prefers-reduced-motion: reduce` 환경에서 transition이 비활성된다.
- [ ] 콘솔 오류 없음, `npm run build`/`npm test` 통과.
