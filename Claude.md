# Claude.md

간단한 웹앱 구현 시 아래 기준을 기본 하네스로 사용한다.

## 문서 참조 규칙
- 디렉터리 구조, 파일 역할, 기능 배치 기준을 판단해야 할 때는 먼저 `ARCHITECTURE.md`를 확인한다.
- 새 파일이나 새 디렉터리를 추가하기 전에는 `ARCHITECTURE.md`의 배치 기준과 분할 기준을 따른다.
- 구현 전 기능 목표, 범위, 검증 기준을 정리해야 할 때는 `SPEC.md`에서 스펙 목록을 확인하고 `docs/spec/` 하위 상세 문서를 사용한다.
- 스펙 작성/검토/구현/완료 기록 명령 패턴, dev server URL 확인 체크리스트, UI 진입점 변경 체크리스트, 코드 수정 위치 맵은 `docs/spec-command-patterns.md`를 참조한다.
- 작업 시작 전에는 작업과 관련된 `docs/learn/*.md` 실행착오 기록을 훑어 같은 실수를 반복하지 않는다. 새 실행착오는 `docs/learn/_template.md`를 기준으로 `docs/learn/<YYYY-MM-DD>-<topic>.md`에 기록한다.
- 스펙은 한 번에 완성하지 않고 작은 스펙 조각 단위로 관리한다.
- `Claude.md`는 작업 라우터를, `ARCHITECTURE.md`는 프로젝트 구조와 확장 기준을, `SPEC.md`는 스펙 목록과 진행 상태를, `docs/spec/`는 스펙 상세를, `docs/spec-command-patterns.md`는 명령 패턴과 체크리스트를, `docs/learn/`는 실행착오 기록을 담당한다.

## 작업 워크플로우
1. **전체 방향 정리**: `SPEC.md`에 전체 목표와 전체 범위를 짧게 정리한다.
2. **스펙 조각 설계**: 구현 가능한 작은 단위로 스펙 조각을 만들고 `SPEC.md` 목록에는 `draft` 상태로 기록한다. 상세 내용은 `docs/spec/<ID>-<short-title>.md`에 작성한다.
3. **사람 확인**: 사람이 확인한 스펙 조각만 `ready` 상태로 바꾼다. `ready`가 아닌 스펙은 구현하지 않는다.
4. **스펙 조각 구현**: `ready` 상태의 현재 작업 스펙 상세 문서만 기준으로 구현한다. 구조 변경이나 파일 추가가 필요하면 먼저 `ARCHITECTURE.md`를 확인한다.
5. **테스트 및 검증**: 구현 후 해당 스펙 조각의 사용자 흐름, 화면 상태, 콘솔 오류, `npm run build`를 확인한다.
6. **반복 및 기록**: 검증이 끝난 스펙 조각은 `done`으로 바꾸고 완료 기록에 남긴다. 남은 작업은 2~5단계를 반복한다.

## 스펙 조각 기준
- 한 스펙 조각은 한 번에 구현하고 검증할 수 있을 만큼 작게 유지한다.
- 서로 다른 화면, 상태, 사용자 행동이 섞이면 별도 스펙 조각으로 나눈다.
- 스펙 상세 문서에는 목표, 범위, 사용자 흐름, UI/상태 요구사항, 검증 기준이 있어야 한다.
- 구현 중 새 요구사항이 발견되면 현재 구현에 섞지 말고 새 스펙 조각으로 기록한다.

## 작업 라우팅

| 사용자 요청 | 시작 문서 |
| --- | --- |
| 새 스펙 조각 작성 | `docs/spec-command-patterns.md` → "새 스펙 조각 작성" |
| 스펙 검토 | `docs/spec-command-patterns.md` → "스펙 검토" |
| 스펙 구현 | `docs/spec-command-patterns.md` → "스펙 구현" |
| 스펙 완료 기록 | `docs/spec-command-patterns.md` → "스펙 완료 기록" |
| 코드 수정 위치 찾기 | `docs/spec-command-patterns.md` → "코드 수정 위치 맵" |
| 브라우저 검증 | `docs/spec-command-patterns.md` → "dev server URL 확인 체크리스트" |
| UI 진입점 변경 | `docs/spec-command-patterns.md` → "UI 진입점 변경 체크리스트" |

## 기술 스택
- 빌드/개발 서버: Vite
- 언어: Vanilla JavaScript (ES Modules)
- 스타일: `src/styles/` 아래에 역할별 CSS 파일을 분리하고, `src/styles/index.css`에서 한 번에 import한다.

## 디렉터리 규칙
- `index.html`: 앱 진입점, `#app` 마운트 노드만 둔다.
- `src/main.js`: 앱 초기화와 조립(wiring) 담당. 도메인 로직은 `src/features/`로 분리한다.
- `src/lib/`: 도메인에 묶이지 않은 공용 helper (`utils.js`, `fishSpriteStyle.js`).
- `src/features/<feature>/`: 도메인별 모듈. 역할이 드러나는 파일명(`index.js`, `state.js`, `view.js`, `events.js` 등)을 사용한다. 세부 배치는 `ARCHITECTURE.md` 참조.
- `src/styles/index.css`: 스타일 진입점. 역할별 CSS 파일을 정해진 순서로 import한다.
- `src/styles/base.css`: reset, root 변수, body, 기본 typography.
- `src/styles/tokens.css`: 색/간격 등 디자인 토큰.
- `src/styles/layout.css`: page, container, grid, section 같은 큰 배치.
- `src/styles/components.css`: 공용 button, input, list 등 재사용 UI 베이스.
- `src/styles/components/`: 도메인별 컴포넌트 스타일(`aquarium.css`, `fish.css`, `cleaning.css`, `panels.css`).
- `src/styles/utilities.css`: `.sr-only` 같은 작은 유틸리티.

## 구현 원칙
1. **구조 분리**: 마크업/상태/이벤트 로직을 분리해 작성.
2. **단일 책임 함수**: 함수 하나는 하나의 목적만 담당하며, 렌더링/상태 변경/이벤트 처리/데이터 변환 로직을 한 함수에 섞지 않는다.
3. **접근성 기본값**: 버튼/폼 등 기본 시맨틱 태그 우선 사용.
4. **상태 단순화**: 전역 상태는 최소화하고 로컬 상태를 우선.
5. **셀렉터 상수화**: DOM selector 문자열은 `SELECTORS` 객체에 모아 중복과 오타를 줄인다.
6. **확장 가능성**: 기능 추가 시 `src/features/<feature>/` 구조로 확장.

## JavaScript 분할 기준
- `src/main.js`는 앱 초기화와 조립을 우선 담당한다.
- 파일이 100~150줄을 넘거나 서로 다른 기능이 2개 이상 섞이면 `src/features/<feature>/`로 분리한다.
- 렌더링, 상태 변경, 이벤트 연결 함수는 각각 분리해 단일 책임을 유지한다.
- 기능을 분리할 때는 `index.js`, `state.js`, `view.js`처럼 역할이 드러나는 파일명을 사용한다.

## CSS 네이밍 기준
- 전역 레이아웃 클래스는 `.container`, `.page-*`처럼 명명한다.
- 컴포넌트 클래스는 `.button`, `.card`, `.form-*`처럼 역할 중심으로 명명한다.
- 스타일은 HTML 태그 선택자보다 클래스 선택자를 우선한다.
- 유틸리티 클래스는 작고 재사용 가능한 목적에만 사용한다.

## 실행 명령어
- 개발: `npm run dev`
- 빌드: `npm run build`
- 프리뷰: `npm run preview`

## 다음 기능 추가 시 권장
- 구조 변경이나 파일 추가가 필요하면 먼저 `ARCHITECTURE.md` 참조
- 라우팅이 필요해지면 `src/routes/` 도입
- API 연동 시 `src/services/api.js` 분리
- 재사용 UI는 `src/components/`로 분리
