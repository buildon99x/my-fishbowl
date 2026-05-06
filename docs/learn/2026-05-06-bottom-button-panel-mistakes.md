# 2026-05-06 S-012 Bottom Button Panel 구현 실수 기록

## 1. Feed submenu가 버튼 정렬을 깨뜨린 문제

### 현상

Feed 버튼에 마우스를 올리거나 클릭하면 `.prop-feed-submenu`가 나타나면서 Feed 버튼만 다른 버튼들보다 오른쪽으로 밀렸다.

### 원인

`.prop-btn-cluster`에 `align-items: center`를 설정했는데, Feed wrap은 submenu가 inline-flex로 펼쳐지면서 wrap의 가로 폭이 다른 버튼들보다 넓어졌다. 가로 중앙 정렬 기준이 바뀌어 Feed 버튼 위치가 우측으로 이동했다.

```
[ submenu ][ Feed 🍖 ]   ← wrap이 넓어지면 center 정렬 시 버튼이 오른쪽으로 밀림
           [  🐠  ]
           [  🧽  ]
```

### 수정

`.prop-btn-cluster`의 `align-items`를 `center` → `flex-end`로 변경. 모든 wrap이 우측 끝을 기준으로 정렬되므로, Feed wrap이 넓어져도 버튼 자체의 수직선이 흔들리지 않는다.

### 교훈

컨테이너 안에 **가변 폭을 가진 자식**이 있을 때, `align-items: center`는 자식 폭 변화에 따라 다른 자식의 시각적 위치도 바뀐다. 버튼처럼 고정 위치를 유지해야 하는 경우 `align-items: flex-end` (또는 `flex-start`)로 한쪽 끝을 기준 삼아야 한다.

---

## 2. fish-input 패널에 내부 토글 버튼을 남긴 문제

### 현상

prop-panel의 Add Fish 버튼으로 패널 열기/닫기를 이전했음에도, fish-input-widget 안에 기존 토글 버튼(`fish-input-toggle`)이 그대로 남아 있었다. 동일한 동작을 하는 버튼이 두 곳에 존재했다.

### 원인

새 진입점(prop-panel 버튼)을 추가하는 데 집중한 나머지, 기존 진입점(위젯 내부 토글)을 제거하는 것을 빠뜨렸다.

### 수정

- `renderFishInputPanel`이 `isExpanded === false`일 때 빈 문자열을 반환하도록 변경 → DOM에서 완전 제거
- 내부 토글 버튼 제거, 패널 상단에 타이틀 + ✕ 닫기 버튼으로 교체

### 교훈

기존 기능의 진입점을 새로운 곳으로 **이전**할 때는 구현 직후 기존 진입점 제거를 함께 체크리스트에 포함해야 한다. "추가"와 "제거"는 항상 쌍으로 검토한다.

---

## 3. 이모지가 원 정중앙에 위치하지 않은 문제

### 현상

🐠(물고기) 이모지가 원형 버튼의 정중앙보다 약간 위/아래로 치우쳐 보였다.

### 원인

브라우저 기본 `<button>` 스타일에 암묵적인 `padding`이 있고, 이모지는 폰트 라인 박스 내에서 baseline에 영향을 받아 `display: flex; align-items: center`만으로는 완벽히 중앙에 오지 않는 경우가 있다.

### 수정

`.prop-btn`에 `padding: 0`과 `line-height: 1`을 명시적으로 추가.

### 교훈

이모지나 아이콘 폰트를 원형 버튼 중앙에 배치할 때는 `display: flex` + `align-items/justify-content: center` 외에도 `padding: 0`, `line-height: 1`을 항상 같이 설정한다.
