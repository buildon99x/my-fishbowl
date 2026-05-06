# S-011 우측하단 액션 버튼 위젯 (Prop Panel)

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 목표

- 화면 우측 하단에 고정된 원형 버튼 위젯을 신설한다.
- Feed / Add Fish / Cleaning / GodMode 4가지 액션을 아이콘 버튼으로 제공한다.
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
- 버튼 형태: 원형, 지름 52px, 가운데 이모지
- 버튼 배열: 세로 방향 열
- 활성화 상태: 배경 강조 (On 상태)
- 툴팁: 버튼 왼쪽에 호버 시 표시

### 버튼 목록

| 버튼 | 이모지 | 동작 |
|------|--------|------|
| Feed | 🍖 | 먹이 주기 모드 토글. 활성화 시 food-layer 클릭으로 먹이 투하 |
| Add Fish | 🐠 | fish-input-widget 열기/닫기 |
| Cleaning | 🧹 | 청소 모드 On/Off 토글 (현재는 상태만 관리) |
| GodMode | ⚙️ | dev 빌드 전용. GodMode 패널 토글 |

### Feed 버튼 세부

- 마우스 호버 시 Food Type 선택 드롭다운이 버튼 왼쪽에 표시된다.
- 드롭다운은 `basic` 1종만 제공한다 (S-010 구현 전).
- 버튼 클릭으로 먹이 주기 모드 On/Off 전환.
- On 상태일 때 버튼 배경이 강조된다.

### GodMode 패널

- dev 빌드에서만 버튼과 패널 코드가 포함된다 (`import.meta.env.DEV`).
- 패널에는 현재 어항 상태 (물고기 수, 이끼 레벨, 청결도) 가 표시된다.

## 상태 구조

```js
{
  cleaningMode: false,      // 청소 모드 On/Off
  godModeOpen: false,       // GodMode 패널 열림 여부 (dev only)
}
```

## 구현 메모

- 관련 파일:
  - `src/features/prop-panel/state.js` — prop panel 상태
  - `src/features/prop-panel/view.js` — 버튼 위젯 렌더링
  - `src/features/prop-panel/index.js` — exports + 이벤트 바인딩
  - `src/main.js` — 헤더에서 feeding-controls 제거, prop-panel 추가
  - `src/styles/components.css` — prop panel CSS
- fish-input 패널은 `fishInputState.isExpanded`로 제어. Add Fish 버튼이 이 값을 토글.
- GodMode 코드는 `if (import.meta.env.DEV)` 블록으로 감싸 tree-shaking 보장.

## 검증 기준

- [ ] 우측 하단에 원형 버튼 4개(dev) 또는 3개(prod)가 표시된다.
- [ ] 각 버튼에 마우스를 올리면 기능 설명 툴팁이 나타난다.
- [ ] Feed 버튼 클릭 시 먹이 주기 모드가 On/Off 전환된다.
- [ ] Feed 버튼 호버 시 Food Type 드롭다운이 나타난다.
- [ ] Add Fish 버튼 클릭 시 fish-input 패널이 열리고 닫힌다.
- [ ] Cleaning 버튼 클릭 시 청소 모드 상태가 토글된다.
- [ ] GodMode 버튼은 dev 빌드에서만 렌더링된다.
- [ ] GodMode 패널에서 어항 상태를 확인할 수 있다.
- [ ] 헤더에서 기존 feeding-controls가 사라진다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm run build`가 통과한다.
