# S-016 Dev Harness Improve

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- Claude가 같은 스펙 작성 흐름을 반복해서 따르고, 이전 실행착오를 작업 전에 확인하며, 코드 수정 위치를 더 정확히 찾도록 개발 하네스를 개선한다.
- 이번 스펙은 대규모 리팩터링보다 문서와 작업 절차 정비를 우선한다.

## 범위

- 포함:
  - 스펙 작성 명령 패턴을 별도 Markdown 문서로 분리한다.
  - `Claude.md`는 긴 명령 예시를 직접 보유하지 않고, 별도 명령 패턴 문서를 참조한다.
  - `docs/learn/` 실행착오 기록을 작업 전 체크리스트로 연결한다.
  - 향후 실행착오 기록을 위한 `docs/learn/_template.md`를 추가한다.
  - Claude가 자주 수정하는 코드 위치를 찾을 수 있도록 코드 수정 위치 맵을 문서화한다.
  - 브라우저 검증 전에 현재 worktree의 실제 dev server URL을 확인하는 절차를 문서화한다.
  - UI 진입점 변경 시 중복 컨트롤, 기존 진입점 제거, 상태 전환 중 레이아웃 이동 여부를 확인하는 절차를 문서화한다.
- 제외:
  - CSS `@media` 닫힘 수정과 깨진 문구/주석 복구. 해당 항목은 이미 처리된 것으로 간주한다.
  - `src/main.js` 대규모 파일 분리.
  - CSS 파일 대규모 분리.
  - 문서/하네스 개선을 넘어서는 기능 UI 변경.

## 사용자 흐름

1. 사용자가 Claude에게 스펙 작성, 스펙 검토, 스펙 구현, 또는 완료 기록을 요청한다.
2. Claude는 `Claude.md`에서 작업 라우팅 규칙을 확인한다.
3. Claude는 `SPEC.md`, `ARCHITECTURE.md`, `docs/spec/`, `docs/spec-command-patterns.md`, 관련 `docs/learn/` 기록을 확인한다.
4. Claude는 요청 유형에 맞는 명령 패턴을 사용한다.
5. 브라우저 검증이 필요한 경우, 이미 열린 브라우저 탭을 신뢰하지 않고 현재 worktree에서 실행 중인 실제 Vite URL을 확인한다.
6. UI 진입점이 바뀌는 경우, 새 진입점 추가와 기존 진입점 제거를 함께 검토한다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 없음. 이 스펙은 사용자-facing UI를 추가하지 않는다.
- 필요한 상태:
  - 앱 런타임 상태 변경 없음.
- 오류 또는 빈 상태:
  - 잘못된 dev server URL을 보고 검증하지 않도록 확인 절차를 문서화한다.
  - 기존 UI 진입점이 남아 중복 버튼이나 중복 패널이 생기지 않도록 확인 절차를 문서화한다.

## 구현 메모

- 관련 파일:
  - `Claude.md`
  - `SPEC.md`
  - `docs/spec-command-patterns.md`
  - `docs/learn/_template.md`
  - `docs/learn/*.md`
  - `docs/spec/S-016-dev-harness_improve.md`
- `docs/spec-command-patterns.md`에는 다음 항목을 포함한다.
  - 새 스펙 조각 작성 명령 패턴
  - 스펙 검토 명령 패턴
  - 스펙 구현 명령 패턴
  - 스펙 완료 기록 명령 패턴
  - dev server URL 확인 체크리스트
  - UI 진입점 변경 체크리스트
- `Claude.md`는 짧은 라우터 역할로 유지한다.
  - source-of-truth 문서를 안내한다.
  - 스펙 명령 패턴은 `docs/spec-command-patterns.md`를 참조한다.
  - 반복 실수 방지는 `docs/learn/`을 참조한다.
- 코드 수정 위치 맵은 현재 구조를 기준으로 작성한다.
  - 물고기 표시/transform: `src/main.js`의 `renderFishes`, `src/styles/components.css`의 `.fish-sprite`
  - 물고기 편집 UI: `src/main.js`의 `renderFishEditor`, `bindAquariumControls`
  - 청소 UI: `src/main.js`의 `renderCleanButton`, `renderCleaningOverlay`, `bindCleaningEvents`
  - 저장/복원: `src/main.js`의 `normalizeAquarium`, `loadAquarium`, `saveAquarium`
  - prop panel: `src/features/prop-panel/`, `src/styles/components.css`의 `.prop-panel`
- 향후 코드 리팩터링은 이 하네스 개선 후 별도 스펙으로 다룬다.

## 검증 기준

- [ ] `docs/spec-command-patterns.md`가 존재하고, 스펙 작성/검토/구현/완료 기록 명령 패턴을 분리해서 포함한다.
- [ ] `docs/spec-command-patterns.md`가 dev server URL 확인 절차를 포함한다.
- [ ] `docs/spec-command-patterns.md`가 UI 진입점 변경 시 중복 컨트롤과 레이아웃 이동을 확인하는 절차를 포함한다.
- [ ] `Claude.md`가 `docs/spec-command-patterns.md`를 참조한다.
- [ ] `Claude.md`가 관련 작업 전 `docs/learn/*.md` 확인을 안내한다.
- [ ] `docs/learn/_template.md`가 존재하고 `Symptom`, `Root Cause`, `Fix`, `Prevention Rule`, `Related Files` 항목을 포함한다.
- [ ] 코드 수정 위치 맵이 문서에 존재하고, 현재 고변경 영역의 파일/함수를 가리킨다.
- [ ] 문서 변경 후 `npm run build`가 통과한다.
