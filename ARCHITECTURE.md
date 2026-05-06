# Architecture

이 문서는 프로젝트의 디렉토리 구조, 소스 파일 역할, 기능 확장 시 배치 기준을 정의한다.

## 현재 디렉토리 구조

```text
.
├── README.md
├── Claude.md
├── ARCHITECTURE.md
├── SPEC.md
├── docs/
│   └── spec/
│       ├── _template.md
│       └── S-001-initial-spec.md
├── index.html
├── package.json
├── package-lock.json
└── src/
    ├── main.js
    └── styles/
        ├── index.css
        ├── base.css
        ├── layout.css
        ├── components.css
        └── utilities.css
```

## 소스 파일 역할

- `index.html`: Vite 애플리케이션의 HTML 진입점이다. `#app` 마운트 노드만 유지하고 화면 로직은 `src/main.js`에서 관리한다.
- `src/main.js`: 애플리케이션의 JavaScript 진입점이다. 앱 초기화, 초기 렌더링, 이벤트 연결, 간단한 상태 관리를 담당한다.
- `src/styles/index.css`: 스타일 진입점이다. 역할별 CSS 파일을 import한다.
- `src/styles/base.css`: reset, root 변수, body, 기본 typography를 담당한다.
- `src/styles/layout.css`: page, container, grid, section 같은 큰 배치를 담당한다.
- `src/styles/components.css`: button, card, form 등 재사용 UI 스타일을 담당한다.
- `src/styles/utilities.css`: `.sr-only` 같은 작은 유틸리티 스타일을 담당한다.
- `package.json`: 개발, 빌드, 프리뷰 스크립트와 프로젝트 의존성을 정의한다.
- `package-lock.json`: 설치된 npm 의존성 버전을 고정한다.
- `README.md`: 실행 명령어와 주요 문서 위치를 안내하는 사람용 진입 문서다.
- `SPEC.md`: 스펙 조각 목록과 진행 상태를 관리하는 인덱스 문서다.
- `docs/spec/`: 각 스펙 조각의 상세 정의 문서를 관리한다.
- `docs/spec/_template.md`: 새 스펙 상세 문서를 만들 때 사용하는 기본 템플릿이다.

## 확장 시 권장 구조

기능이 늘어나면 `src/` 아래에 책임별 디렉토리를 추가한다.

```text
src/
├── main.js
├── styles/
│   ├── index.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── utilities.css
├── components/
│   └── <component>.js
├── features/
│   └── <feature>/
│       ├── index.js
│       ├── state.js
│       └── view.js
├── routes/
│   └── <route>.js
├── services/
│   └── api.js
└── assets/
    └── <asset-file>
```

## 배치 기준

- 화면에서 반복 사용되는 UI 조각은 `src/components/`로 분리한다.
- 독립적인 사용자 기능은 `src/features/<feature>/`에 모은다.
- 라우팅이 필요해지면 화면 진입점은 `src/routes/`에 둔다.
- 외부 API, 저장소, 브라우저 저장소 연동은 `src/services/`에 둔다.
- 이미지, 아이콘, 정적 데이터 같은 번들 대상 자산은 `src/assets/`에 둔다.
- CSS는 `src/styles/` 아래에서 역할별 파일로 나누고, JavaScript에서는 `src/styles/index.css`만 import한다.
- DOM selector 문자열은 `SELECTORS` 객체에 모아 관리한다.

## JavaScript 분할 기준

- 현재 규모에서는 `src/main.js`를 유지하고, 함수 단위로 책임을 분리한다.
- `src/main.js`가 100~150줄을 넘거나 서로 다른 기능이 2개 이상 섞이면 `src/features/<feature>/`로 분리한다.
- 분리된 기능은 `index.js`, `state.js`, `view.js`처럼 역할이 드러나는 파일명을 사용한다.
- `src/main.js`는 CSS import, 앱 마운트, 초기 실행 같은 조립 역할에 집중한다.

## CSS 네이밍 기준

- 전역 레이아웃 클래스는 `.container`, `.page-*`처럼 명명한다.
- 컴포넌트 클래스는 `.button`, `.card`, `.form-*`처럼 역할 중심으로 명명한다.
- 스타일은 HTML 태그 선택자보다 클래스 선택자를 우선한다.
- 유틸리티 클래스는 작고 재사용 가능한 목적에만 사용한다.

## 구현 원칙

1. `index.html`에는 마운트 지점과 문서 메타 정보만 둔다.
2. `main.js`는 애플리케이션 조립 역할에 집중하고, 기능 로직이 커지면 `features/`로 이동한다.
3. 상태 변경 로직과 DOM 렌더링 로직은 함수 단위로 분리한다.
4. CSS는 `base.css`, `layout.css`, `components.css`, `utilities.css` 순서로 역할을 분리한다.
5. 새 파일을 추가할 때는 이 문서의 역할 기준과 분할 기준을 먼저 따른다.
