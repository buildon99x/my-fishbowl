# S-007 어항 오염 및 이끼 시스템

## 상태

- 상태: ready
- 구현 여부: done
- 검증 여부: tested

## 목표

- 사용자가 일정 시간 동안 청소하지 않으면 어항에 이끼가 생긴다.
- 이끼는 마지막 청소 시간을 기준으로 30분마다 1레벨씩 증가한다.
- 48시간 이후에는 최대 이끼 레벨을 유지한다.
- 이끼 레벨에 따라 청결도와 화면의 이끼 레이어가 함께 변한다.

## 범위

- 포함:
  - 마지막 청소 시간 기준 이끼 레벨 계산
  - `algaeLevel`, `cleanliness`, `lastCleanedAt` 저장 및 복원
  - 0~96 단계 이끼 레벨 모델
  - 이끼 레벨에 따른 Canvas 이끼 패치 렌더링
  - God Mode의 직접 `algaeLevel` 설정
  - 물고기와 먹이보다 위에 표시되는 이끼 레이어
- 제외:
  - 서버 시간 동기화
  - 물고기 질병 또는 사망 시스템
  - 복잡한 물리 기반 이끼 확산
  - 여러 종류의 오염원

## 사용 흐름

1. 사용자가 어항을 청소한다.
2. 앱은 `lastCleanedAt`을 현재 시간으로 저장하고 `algaeLevel`을 0으로 초기화한다.
3. 재접속 또는 앱 초기화 시 `lastCleanedAt` 이후 경과 시간을 계산한다.
4. 30분이 지날 때마다 `algaeLevel`이 1씩 증가한다.
5. 48시간이 지나면 `algaeLevel`은 96으로 고정된다.
6. 화면에는 현재 레벨에 맞는 이끼 레이어가 표시된다.

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
