# S-012 우측하단 액션 버튼 위젯 (Bottom Button Panel)

## 상태

- 상태: done
- 구현 여부: done
- 검증 여부: tested

## 목표

- 화면 우측 하단에 고정된 원형 버튼 위젯을 신설한다.
- Feed / Add Fish / Cleaning / GodMode 4가지 액션을 이모지 버튼으로 제공한다.
- 헤더에 있던 먹이 주기 컨트롤을 위젯으로 이전한다.

## 의존성

- S-006 (먹이 주기) — feedingState와 연동
- S-003 (이미지 입력) — fish-input 패널 열기/닫기 연동

## 범위

- 포함할 것:
  - 원형 이모지 버튼 4종 (Feed, Add Fish, Cleaning, GodMode)
  - 버튼 호버 시 기능 설명 툴팁
  - Feed 버튼: On/Off 토글 + 호버 시 Food Type 드롭다운
  - Add Fish 버튼: fish-input 패널 열기/닫기
  - Cleaning 버튼: On/Off 토글 (청소 모드)
  - GodMode 버튼: dev 빌드 전용, GodMode 패널 표시
  - 헤더에서 feeding-controls 제거
- 제외할 것:
  - 실제 청소 로직 (S-008에서 처리)
  - GodMode 세부 기능 (별도 스펙)
  - 먹이 종류 상세 구현 (S-010에서 처리)

## 사용자 흐름

1. 사용자가 우측 하단 버튼 위젯을 본다.
2. Feed 버튼에 마우스를 올리면 Food Type 선택 드롭다운이 나타난다.
3. Feed 버튼을 클릭하면 먹이 주기 모드가 On/Off 토글된다.
4. Add Fish 버튼을 클릭하면 물고기 이미지 등록 패널이 열린다.
5. Cleaning 버튼을 클릭하면 청소 모드가 On/Off 토글된다.
6. GodMode 버튼(dev 전용)을 클릭하면 디버그 패널이 나타난다.

## UI 요구사항

- 버튼 위치: 화면 우측 하단 고정 (`position: fixed`)
- 버튼 형태: 원형, 지름 68px (모바일 60px), 가운데 이모지 (29px / 모바일 26px)
- 버튼 배열: 세로 방향 열, `align-items: flex-end` 기준 우측 정렬
- 활성화 상태: 배경 강조 (On 상태)
- 툴팁: 버튼 왼쪽에 호버 시 표시

### 버튼 목록

| 버튼 | 이모지 | 동작 |
|------|--------|------|
| Feed | 🍖 | 먹이 주기 모드 토글. 활성화 시 food-layer 클릭으로 먹이 투하 |
| Add Fish | 🐠 | fish-input-widget 열기/닫기 |
| Cleaning | 🧽 | 청소 모드 On/Off 토글 (현재는 상태만 관리) |
| GodMode | ⚙️ | dev 빌드 전용. GodMode 패널 토글 |

### Feed 버튼 세부

- 마우스 호버 시 Food Type 선택 드롭다운이 버튼 왼쪽에 표시된다.
- 드롭다운은 `basic` 1종만 제공한다 (S-010 구현 전).
- 버튼 클릭으로 먹이 주기 모드 On/Off 전환.
- On 상태일 때 버튼 배경이 강조된다.

### Add Fish 패널

- `fishInputState.isExpanded === false` 일 때 fish-input-widget은 DOM에서 완전히 제거된다.
- 패널 내부에 별도 토글 버튼 없음. ✕ 닫기 버튼으로만 닫힌다.
- 닫기 버튼(✕)은 Add Fish 버튼과 동일하게 `fishInputState.isExpanded`를 토글한다.

### GodMode 패널

- dev 빌드에서만 버튼과 패널 코드가 포함된다 (`import.meta.env.DEV`).
- 패널에는 현재 어항 상태 (물고기 수, 이끼 레벨, 청결도, 청소 모드) 가 표시된다.

## 상태 구조

```js
// appState.propPanel
{
  cleaningMode: false,   // 청소 모드 On/Off
  godModeOpen: false,    // GodMode 패널 열림 여부 (dev only)
}
```

## 구현 파일

| 파일 | 역할 |
|------|------|
| `src/features/prop-panel/state.js` | prop panel 상태 생성 |
| `src/features/prop-panel/view.js` | 버튼 위젯 렌더링 |
| `src/features/prop-panel/index.js` | exports + 이벤트 바인딩 |
| `src/features/fish-input/view.js` | `isExpanded` false 시 빈 문자열 반환, 내부 토글 버튼 제거 |
| `src/main.js` | 헤더에서 feeding-controls 제거, prop-panel 추가 |
| `src/styles/components.css` | prop panel CSS |

## CSS 설계 포인트

- `.prop-btn-cluster`는 `align-items: flex-end`로 설정. submenu가 열려 wrap 폭이 넓어져도 버튼 위치가 흔들리지 않는다.
- `.prop-btn`은 `padding: 0; line-height: 1`을 명시하여 이모지가 원의 정중앙에 위치한다.
- GodMode 코드는 `import.meta.env.DEV` 조건으로 tree-shaking 보장.

## 검증 기준

- [x] 우측 하단에 원형 버튼 4개(dev) 또는 3개(prod)가 표시된다.
- [x] 각 버튼에 마우스를 올리면 기능 설명 툴팁이 나타난다.
- [x] Feed 버튼 클릭 시 먹이 주기 모드가 On/Off 전환된다.
- [x] Feed 버튼 호버 시 Food Type 드롭다운이 나타난다.
- [x] Add Fish 버튼 클릭 시 fish-input 패널이 열리고 닫힌다.
- [x] fish-input 패널이 닫힌 상태에서 DOM에 존재하지 않는다.
- [x] Cleaning 버튼 클릭 시 청소 모드 상태가 토글된다.
- [x] GodMode 버튼은 dev 빌드에서만 렌더링된다.
- [x] GodMode 패널에서 어항 상태를 확인할 수 있다.
- [x] 헤더에서 기존 feeding-controls가 사라진다.
- [x] Feed 호버/활성화 시 다른 버튼과 수직 정렬이 흔들리지 않는다.
- [x] 이모지가 원 정중앙에 위치한다.
- [x] 브라우저 콘솔 오류가 없다.
- [x] `npm run build`가 통과한다.
