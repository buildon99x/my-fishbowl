# S-018 ARCHITECTURE.md / SPEC.md 동기화

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- `ARCHITECTURE.md`와 `SPEC.md`가 실제 저장소 상태(디렉터리 구조, 스펙 인덱스)와 어긋나지 않도록 한다.
- 스펙 작업 시 두 문서 갱신 책임을 **검증 기준 형태로 강제**하고, 누락은 **드리프트 감지 스크립트**로 조기에 발견한다.
- 문서 자동 편집(자동 패치)은 도입하지 않는다. 노이즈와 부정확한 편집 위험이 크기 때문이다.

## 범위

- 포함:
  - 모든 신규/변경 스펙(`docs/spec/S-*.md`)이 따라야 하는 "ARCHITECTURE.md / SPEC.md 갱신 체크리스트"를 정의한다.
  - `docs/spec/_template.md`에 위 체크리스트 항목을 반영한다.
  - 저장소 상태와 두 문서의 드리프트를 감지하는 스크립트(`scripts/check-docs-drift.mjs` 또는 동등한 위치)를 추가한다.
  - 위 스크립트를 `.claude/hooks/session-start.sh`에서 **경고 모드**로 실행한다(실패가 아닌 stderr 경고).
  - npm script(`npm run check:docs`)로도 수동 실행할 수 있게 한다.
- 제외:
  - 두 문서의 자동 편집(파싱 후 PR/commit 자동 생성).
  - PostToolUse hook으로 매 편집 시 검증.
  - 다른 마크다운 문서(`Claude.md`, `DESIGN.md`, `README.md`)의 드리프트 감지.
  - 기존 드리프트(현 시점 누락 항목)의 일괄 수정 — 이는 본 스펙 구현과 별개의 PR로 진행한다.

## 사용자 흐름

1. 작성자가 새 스펙(S-xxx)을 만들거나 기존 스펙을 `done` 상태로 옮긴다.
2. 작성자는 S-018에서 정의한 체크리스트를 따라 `ARCHITECTURE.md`와 `SPEC.md`를 함께 갱신한다.
3. 원격 세션 시작 시 SessionStart 훅이 드리프트 검증을 실행한다.
4. 드리프트가 있으면 stderr에 누락 항목을 출력한다(세션은 계속 진행).
5. 작성자는 경고를 보고 두 문서를 갱신하거나 후속 PR을 만든다.
6. 로컬에서도 `npm run check:docs`로 동일 검증을 수동 실행할 수 있다.

## UI/상태 요구사항

- 필요한 화면 요소: 없음. 본 스펙은 문서/도구 작업이며 런타임 UI를 변경하지 않는다.
- 필요한 상태: 없음.
- 오류 또는 빈 상태: 검증 스크립트는 드리프트가 없으면 무출력으로 종료한다.

## 구현 메모

### A. 스펙 작업 시 문서 갱신 체크리스트

신규/변경 스펙은 본문 "검증 기준" 절에 다음 항목을 포함한다.

- [ ] `src/` 디렉터리 구조가 변경된 경우 `ARCHITECTURE.md`의 디렉터리 트리 섹션을 갱신한다.
- [ ] 새 파일/모듈이 도입된 경우 `ARCHITECTURE.md`의 "파일 책임" 또는 "기능 모듈 경계" 섹션에 한 줄 추가한다.
- [ ] CSS 파일이 추가/분할/삭제된 경우 `ARCHITECTURE.md`의 "CSS 분리 기준"과 디렉터리 트리를 갱신한다.
- [ ] 스펙 상태(`draft`/`ready`/`done`)·구현 여부·검증 여부가 변경된 경우 `SPEC.md` 표의 해당 행을 갱신한다.
- [ ] 새 스펙 파일을 추가한 경우 `SPEC.md` 표에 행을 추가한다.
- [ ] 스펙이 `done` 상태로 전환된 경우 `SPEC.md`의 "완료 기록" 표에 행을 추가한다.
- [ ] "현재 작업" 목록이 바뀐 경우 `SPEC.md` "현재 작업" 섹션을 갱신한다.

본 체크리스트는 `docs/spec/_template.md`의 "검증 기준" 절에도 동일하게 반영한다(추가 시 한 번만 정의).

### B. 드리프트 감지 스크립트 (`scripts/check-docs-drift.mjs`)

다음 4가지 검사만 수행한다. 각 항목은 누락만 출력하고 자동 수정은 하지 않는다.

1. **스펙 ID 집합 일치**
   - 입력: `docs/spec/S-*.md` 파일 목록(파일명에서 ID 추출)
   - 비교: `SPEC.md`의 "스펙 조각 목록" 표 행에서 추출한 ID 집합
   - 출력: 표에만 있는 ID, 파일에만 있는 ID
2. **`docs/spec/` 트리 일치**
   - 입력: 실제 `docs/spec/` 하위 `*.md` 파일명 집합
   - 비교: `ARCHITECTURE.md`의 디렉터리 트리 코드블록에서 `docs/spec/` 하위로 나열된 파일명 집합
   - 출력: 트리에 없는 실제 파일, 트리에만 있는 파일
3. **`src/` 1~2 depth 디렉터리 일치**
   - 입력: `src/`의 1~2 depth 디렉터리(예: `src/features/algae`, `src/styles`)
   - 비교: `ARCHITECTURE.md` 디렉터리 트리에 등장하는 동일 depth 노드 집합
   - 출력: 트리에 없는 실제 디렉터리만(트리는 요약이므로 트리에만 있는 항목은 무시)
4. **`src/styles/*.css` 파일 일치**
   - 입력: 실제 `src/styles/`(필요 시 `src/styles/components/`까지) `.css` 파일 목록
   - 비교: `ARCHITECTURE.md` 트리의 동일 위치 파일 집합
   - 출력: 트리에 없는 실제 파일

비교는 **단순 텍스트 토큰 매칭**으로 충분하다. 마크다운 트리 코드블록을 정규식으로 파싱하고 스펙 표는 ` | ` 구분으로 ID 컬럼만 추출한다. 파서가 깨질 수 있으니 깨졌을 때는 명시적으로 "파서 영역을 찾지 못함" 메시지를 stderr에 출력하고 비교를 건너뛴다(스크립트는 0으로 종료).

스크립트는 항상 exit code 0으로 종료한다(경고 모드). CI에서 strict 모드를 원하면 `--strict` 플래그로 누락 시 1을 반환하도록 한다. 본 스펙에서는 strict 모드를 기본값으로 사용하지 않는다.

### C. 실행 통합

- `package.json`의 `scripts`에 `"check:docs": "node scripts/check-docs-drift.mjs"`를 추가한다.
- `.claude/hooks/session-start.sh`에서 lint/test 실행 이후 `npm run check:docs`를 호출한다. 실패해도 세션은 진행되므로 명령 실패를 무시하도록 `npm run check:docs || true`로 감싼다.
- ESLint/Vitest 설정은 변경하지 않는다.

### D. 관련 파일

- 신규: `scripts/check-docs-drift.mjs`
- 수정: `package.json`(scripts 1줄), `.claude/hooks/session-start.sh`(1~2줄), `docs/spec/_template.md`(검증 기준 항목 추가)
- 영향 없음: 기존 `src/` 코드, 런타임 동작.

### E. 비포함 결정 사항

- 자동 편집(파싱 후 PR/commit 생성)은 도입하지 않는다. 서술형 섹션의 의미를 보존하지 못하고, diff 노이즈가 크다.
- PostToolUse hook으로 매 편집 시 검증하지 않는다. 짧은 편집 루프 동안 반복 출력되어 작업을 방해한다.

## 검증 기준

- [ ] `docs/spec/_template.md`의 "검증 기준" 절에 본 스펙 A항의 체크리스트가 반영되어 있다.
- [ ] `scripts/check-docs-drift.mjs`가 존재하고 4가지 검사를 수행한다.
- [ ] `npm run check:docs`가 정의되어 있고 동일 스크립트를 실행한다.
- [ ] `.claude/hooks/session-start.sh`에서 `npm run check:docs`가 실패에 무관하게 호출된다.
- [ ] 스크립트는 기본 모드에서 exit code 0으로 종료한다.
- [ ] `--strict` 플래그가 동작하며 드리프트 발견 시 exit code 1을 반환한다.
- [ ] 현 시점 저장소에 대해 스크립트를 실행하면 알려진 드리프트(예: ARCHITECTURE.md 트리에 누락된 S-013/S-016/S-017 등)가 stderr에 출력된다.
- [ ] `npm test`와 `npm run build`가 통과한다.
