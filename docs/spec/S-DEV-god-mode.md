# S-DEV God Mode (개발 전용)

## 상태

- 상태: done
- 구현 여부: done
- 검증 여부: tested

## 목표

- 개발 환경(`import.meta.env.DEV`)에서만 활성화되는 디버그 패널로, `calcAlgaeLevel`의 시간 임계값을 런타임에 조정해 이끼 시스템을 빠르게 테스트할 수 있다.
- 프로덕션 빌드에는 관련 코드가 포함되지 않는다.

## 범위

- 포함할 것:
  - DEV 전용 헤더 버튼
  - 플로팅 패널 (임계값 숫자 입력)
  - `calcAlgaeLevel` light/medium/heavy 임계값 실시간 조정
- 제외할 것:
  - 프로덕션 빌드에서의 활성화
  - 물고기/먹이/기타 시스템 디버그 도구
  - 키보드 단축키 (Shift+Ctrl+G 등)

## 사용자 흐름

1. 개발자가 DEV 빌드(`npm run dev`)에서 앱을 실행한다.
2. 헤더에 "God Mode" 버튼이 표시된다.
3. 버튼 클릭 시 God Mode 패널이 열린다.
4. 패널에서 light/medium/heavy 임계값(시간)을 조정한다.
5. 입력 변경 즉시 이끼 단계가 재계산되어 화면에 반영된다.
6. 버튼 재클릭으로 패널을 닫는다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 헤더의 "God Mode" 버튼 — DEV 빌드에서만 렌더링
  - 플로팅 패널 (dark 테마, 노란 accent)
  - `light (h)`, `medium (h)`, `heavy (h)` 숫자 입력 3개
- 필요한 상태 (`appState.godModeState`):
  ```js
  // DEV 빌드
  godModeState = { visible: false, thresholds: { light: 12, medium: 24, heavy: 48 } }
  // 프로덕션 빌드
  godModeState = null
  ```
- 오류 또는 빈 상태:
  - `godModeState`가 `null`이면 God Mode 버튼과 패널을 렌더링하지 않는다.

## 처리 요구사항

- `IS_DEV = import.meta.env.DEV` 상수로 DEV 환경 판별; Vite 빌드 시 트리쉐이킹됨.
- `[data-toggle-god-mode]` 버튼 클릭 시 `godModeState.visible` 토글 후 `renderApp()` 재호출.
- `[data-threshold]` 입력 변경 시:
  1. `godModeState.thresholds[name]`을 입력값(숫자)으로 갱신
  2. `restoreAlgaeState(aquarium, godModeState.thresholds)` 재호출
  3. `renderApp()` 재호출

## 구현 메모

- 관련 파일:
  - `src/main.js` — `renderGodModePanel(godModeState, aquarium)`, `bindGodModeEvents(root, aquarium, appState, render)`
  - `src/features/algae/state.js` — `DEFAULT_ALGAE_THRESHOLDS` export, `restoreAlgaeState(aquarium, thresholds?)` 시그니처
  - `src/styles/components.css` — `.god-mode-panel`, `.god-mode-header`, `.god-mode-title`, `.god-mode-button`
- `calcAlgaeLevel`과 `restoreAlgaeState`는 `thresholds` 파라미터를 선택적으로 받아 God Mode 오버라이드를 지원한다.

## 검증 기준

- [x] DEV 빌드에서 헤더에 "God Mode" 버튼이 표시된다.
- [x] 프로덕션 빌드(`npm run build`)에서 God Mode 관련 코드가 번들에 포함되지 않는다.
- [x] 버튼 클릭 시 패널이 열리고, 재클릭 시 닫힌다.
- [x] 임계값 입력 변경 시 이끼 단계가 즉시 재계산되어 화면에 반영된다.
- [x] 패널 외부 클릭으로 닫히지 않으며, 버튼 재클릭으로만 닫힌다.
- [x] 브라우저 콘솔 오류가 없다.
