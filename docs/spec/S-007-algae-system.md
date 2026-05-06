# S-007 어항 오염 및 이끼 시스템

## 상태

- 상태: done
- 구현 여부: done
- 검증 여부: tested

## 목표

- 사용자가 오래 접속하지 않거나 청소하지 않으면 어항에 이끼가 생긴다.
- 시간 경과에 따라 오염 단계가 증가하고, 화면에 이끼 패치가 표시된다.

## 범위

- 포함할 것:
  - 마지막 청소 시간 기준 오염도 증가
  - 청결도와 이끼 단계 데이터 저장
  - 이끼 단계별 화면 표현 (패치 기반)
  - 재접속 시 경과 시간 기반 상태 복원
- 제외할 것:
  - 물고기 사망 또는 질병 시스템
  - 복잡한 수질 시뮬레이션
  - 서버 시간 동기화
  - 물고기 질병 또는 사망 시스템
  - 복잡한 물리 기반 이끼 확산
  - 여러 종류의 오염원

## 사용 흐름

1. 사용자가 어항을 사용한 뒤 일정 시간 동안 청소하지 않는다.
2. 앱은 마지막 청소 시간을 기준으로 오염도를 계산한다.
3. 시간이 지날수록 이끼 단계가 증가한다.
4. 어항 화면에 단계별 이끼 패치가 표시된다.
5. 재접속 시 `initApp`에서 `lastCleanedAt`과 현재 시간의 차이를 계산해 `algaeLevel`과 `cleanliness`를 복원한 뒤 저장한다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 어항 위에 겹치는 `<canvas class="algae-layer">`
  - 상태 패널의 이끼 단계 표시
  - 개발 환경 전용 God Mode의 `algaeLevel` 직접 입력
- 필요한 상태:
  - `algaeLevel`: number, 0~96
  - `cleanliness`: number, 10~100
  - `lastCleanedAt`: ISO 8601 string
- 상태명 밴드:
  - `0`: `clean`
  - `1~31`: `lightAlgae`
  - `32~63`: `mediumAlgae`
  - `64~96`: `heavyAlgae`

## 이끼 단계

| algaeLevel | 마지막 청소 후 경과 시간 | 상태명 | 표현 |
| --- | --- | --- | --- |
| 0 | 0~30분 미만 | `clean` | 투명 |
| 1 | 30분 | `lightAlgae` | 연한 초록 이끼 시작 |
| 2~31 | 1시간~15시간 30분 | `lightAlgae` | 약한 이끼가 점진적으로 증가 |
| 32~63 | 16시간~31시간 30분 | `mediumAlgae` | 가장자리 중심 이끼 증가 |
| 64~95 | 32시간~47시간 30분 | `heavyAlgae` | 어항 전반의 이끼 증가 |
| 96 | 48시간 이상 | `heavyAlgae` | 최대 이끼 |

## 청결도

`cleanliness`는 `algaeLevel`에 따라 100에서 10까지 선형으로 감소한다.

| algaeLevel | cleanliness |
| --- | --- |
| 0 | 100 |
| 48 | 55 |
| 96 | 10 |

## 렌더링 요구사항

- 이끼 레이어는 `src/features/algae/view.js`에서 Canvas로 그린다.
- `algaeLevel` 비율에 따라 이끼 패치 수, 크기, 투명도를 보간한다.
- `algaeLevel=96`일 때 이끼 밀도와 진하기는 기존 최대 설정 대비 30% 증가한 값으로 표시한다.
- 이끼 레이어는 물고기, 먹이, 빈 상태 메시지보다 위에 표시한다.
- 청소 모드 입력 오버레이, 진행률, 완료 메시지는 이끼 레이어보다 위에 표시할 수 있다.
이끼 레이어는 어항 위에 겹치는 `<canvas>` 엘리먼트(`algaeCanvas`)로 구현한다. S-008(청소)에서 `globalCompositeOperation = 'destination-out'` 방식으로 픽셀을 지우므로, 두 스펙이 같은 Canvas 엘리먼트를 공유한다.

### 패치 기반 렌더링

이끼는 어항의 **물 영역**(`WATER_PATH_NORMALIZED` — SVG `#water-shape` 패스를 정규화한 값)에만 발생한다. `Path2D` + `DOMMatrix` 스케일링으로 캔버스 크기에 맞게 클리핑한다.

각 이끼 패치는 **2~3개의 회전된 타원(sub-ellipse)**을 약간 어긋나게 겹쳐 유기적 형태를 연출한다. 각 sub-ellipse는 라디얼 그라데이션(`rgba(34,110,34,opacity)` → 투명)으로 가장자리를 부드럽게 페이드 처리한다.

### 결정성 (시드 기반 PRNG)

매 렌더마다 패치가 달라지면 `renderApp` 재호출 시 청소 진행률 계산과 시각 일관성이 깨진다. 따라서 `aquarium.lastCleanedAt`을 시드로 사용한 **mulberry32 PRNG**로 패치 위치/크기/회전을 결정한다.

- 같은 청소 주기 내에서는 항상 동일한 패치 배열
- 청소 완료 후 `lastCleanedAt` 갱신 시 다음 발생에서 새로운 패턴 생성
- `hashSeed(input)` — FNV-1a 알고리즘으로 문자열/숫자 → 32-bit 정수 시드 변환

### 비겹침 배치

각 패치는 `effectiveRadius = baseRadius * 1.15`를 사용한 충돌 감지로 서로 겹치지 않도록 배치된다 (최대 30회 재시도).

### 단계별 설정 (`LEVEL_CONFIG`)

| level | 패치 수 | radiusBase | 불투명도 | edgeBias 범위 |
| --- | --- | --- | --- | --- |
| 1 (light) | 5 ± 2 | 0.038 × meanDim | 0.30 ~ 0.45 | 0.75 ~ 0.95 (벽 근처만) |
| 2 (medium) | 12 ± 3 | 0.048 × meanDim | 0.40 ~ 0.55 | 0.65 ~ 0.95 |
| 3 (heavy) | 22 ± 4 | 0.060 × meanDim | 0.50 ~ 0.70 | 0.55 ~ 0.95 (벽 + 안쪽) |

`meanDim = (w + h) / 2`로 캔버스 크기에 비례하여 스케일 조정.

`edgeBias`는 패치 중심의 벽 근접도를 결정한다 (1에 가까울수록 벽 쪽).

### API

```js
drawAlgaeLayer(canvas, algaeLevel, seed)
```

- `canvas`: 이끼를 그릴 Canvas 엘리먼트
- `algaeLevel`: 0~3 정수
- `seed`: PRNG 시드 (보통 `aquarium.lastCleanedAt` ISO 문자열)

## God Mode

- 개발 환경에서 God Mode 버튼을 제공한다.
- God Mode는 `algaeLevel`을 0~96 범위에서 직접 설정한다.
- 직접 설정 시 `cleanliness`와 `lastCleanedAt`을 함께 갱신한다.
- 새로고침 후에도 설정한 이끼 레벨이 복원되도록 `lastCleanedAt`을 역산해 저장한다.

## 구현 메모

- 관련 파일:
  - `src/features/algae/state.js`
  - `src/features/algae/view.js`
  - `src/features/algae/index.js`
  - `src/main.js`
  - `src/styles/components.css`
- `calcAlgaeLevel(lastCleanedAt, nowMs)`는 30분 단위 레벨 계산을 담당한다.
- `calcCleanliness(algaeLevel)`은 청결도 계산을 담당한다.
- `getAlgaeStateName(algaeLevel)`은 UI용 상태명 밴드를 반환한다.
- `calcLastCleanedAtForAlgaeLevel(algaeLevel, nowMs)`은 God Mode 직접 설정을 저장 가능한 시간 상태로 변환한다.
- `getAlgaeRenderConfig(level)`은 렌더링 강도 보간값을 반환한다.

## 검증 기준

- [x] 마지막 청소 후 30분마다 `algaeLevel`이 1씩 증가한다.
- [x] 48시간 이후 `algaeLevel`이 96을 초과하지 않는다.
- [x] `cleanliness`가 `algaeLevel`과 연동된다.
- [x] `algaeLevel=96`에서 최대 이끼 밀도와 진하기가 강화된다.
- [x] God Mode에서 `algaeLevel`을 직접 설정할 수 있다.
- [x] 이끼 레이어가 물고기보다 위에 표시된다.
- [x] `npm test`가 통과한다.
- [x] `npm run build`가 통과한다.
  - `src/features/algae/state.js` — `calcAlgaeLevel`, `calcCleanliness`, `restoreAlgaeState`, `DEFAULT_ALGAE_THRESHOLDS`
  - `src/features/algae/view.js` — `drawAlgaeLayer` (패치 렌더링, PRNG 내장)
  - `src/features/algae/index.js` — re-export
  - `src/main.js` — `drawAlgaeLayer(algaeCanvas, aquarium.algaeLevel, aquarium.lastCleanedAt)` 호출
  - `src/styles/components.css` — `.algae-layer` 위치/clip-path
- MVP는 로컬 시간과 로컬 저장소를 기준으로 계산한다.
- `eslint.config.js`에 `Path2D`, `DOMMatrix` globals 추가됨 (캔버스 API).
- [x] 마지막 청소 시간 기준으로 청결도가 계산된다.
- [x] 시간이 지날수록 이끼 단계가 증가한다.
- [x] 이끼 단계별 시각 표현이 다르게 표시된다. (패치 수/크기/불투명도)
- [x] 청결도와 이끼 단계가 로컬 저장소에 저장된다.
- [x] 재접속 시 경과 시간에 맞는 오염 상태가 복원된다.
- [x] `calcAlgaeLevel` 단위 테스트(`state.test.js`)가 통과한다.
- [x] 브라우저 콘솔 오류가 없다.
- [x] `npm run build`가 통과한다.
- [x] 동일 `lastCleanedAt`으로 `renderApp`을 반복 호출해도 패치 위치가 유지된다.
- [x] 이끼가 물 영역(`#water-shape`) 밖으로 삐져나오지 않는다.
- [x] 패치들이 서로 겹치지 않는다.

## 추가 메모: 고정 수중 장식 애니메이션

- 어항 바닥에는 저장 데이터와 무관한 고정 장식으로 해초와 정원장어를 표시한다.
- 해초와 정원장어는 모래에 하단이 묻힌 상태로 보이며, CSS/SVG 애니메이션으로 부드럽게 흔들린다.
- 이 장식은 사용자 추가/삭제/편집 대상이 아니며, 별도 저장 스키마를 만들지 않는다.
- **구현 완료**: `main.js`의 `renderDecoration()` 내 `sway-plant`, `garden-eel` 클래스로 구현되어 있다.
