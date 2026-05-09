# S-021 Draw-to-Life Magic Moment

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 의존성

- S-003 이미지 입력
- S-004 물고기 생성
- S-022 사운드 시스템 (효과음 트리거)
- S-011 거품 효과 (재사용)

## 목표

- 사용자가 등록한 이미지가 살아있는 물고기로 변모하는 순간을 **3단계 정서 곡선(기대 → 변환 → 환영)** 에 따라 연출한다.
- 등록(S-004)과 prop-panel 자동 오픈(S-013) 사이에 명확한 의식 절차를 삽입하여, 어린이가 "내가 만든 것이 살아났다"는 인지를 확실히 갖게 한다.
- 단순 fade-in 대비 첫 등록 후 30초 잔류 시간(time-on-screen) 향상을 목표로 한다.

## 범위

- 포함할 것:
  - 미리보기 → 어항 입수 트랜지션 (3단계 phase state machine)
  - 거품 버스트 + 물보라 + 황금 글로우 연출
  - 어항 viewport 짧은 follow 효과
  - 시각/청각/햅틱 채널 분리
  - prefers-reduced-motion 대응
  - 연속 등록 시 큐잉 (최대 5)
- 제외할 것:
  - 등록 자체의 데이터 처리 (S-004)
  - 사운드 자산 정의 (S-022)
  - 마법 모먼트 후 prop-panel 동작 (기존 S-013)

## 사용자 흐름

1. 사용자가 Add Object 패널에서 이름/이미지/타입을 준비한다.
2. 사용자가 등록 버튼을 누른다.
3. **[Phase A: 기대]** 0.0–0.3s — 미리보기가 살짝 커지며 약하게 떨림, 패널이 어두워짐.
4. **[Phase B: 변환]** 0.3–1.1s — 미리보기가 어항 등록 위치로 이동, 도착 직전 거품 버스트, 입수와 동시에 물보라 ring.
5. **[Phase C: 환영]** 1.1–2.6s — 새 물고기 페이드인, 1.5초간 황금 글로우, viewport 1.05배 follow.
6. 마법 모먼트 종료 직후 prop-panel이 자동 오픈된다 (기존 S-004 동작 유지).
7. 새 물고기는 일반 이동 루프(S-005)에 합류한다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - `.magic-moment-overlay` (z-index: 50, pointer-events: none)
  - 임시 sprite element (preview→tank 이동용 클론)
  - 글로우 레이어 (`--magic-glow-opacity` CSS 변수)
  - 어항 viewport 컨테이너의 transform 직접 조작
- 필요한 상태:
  ```ts
  type MagicMomentState = {
    phase: 'idle' | 'anticipating' | 'transforming' | 'welcoming' | 'done';
    targetFishId: string | null;
    startedAt: number;
    queue: Array<{ fishId: string; sourceRect: DOMRect }>;
  };
  ```
- 큐잉:
  - 진행 중 추가 등록 발생 시 큐에 push (최대 5개)
  - 현재 모먼트 종료 후 200ms 간격으로 다음 큐 처리

## 안전 가드 (WCAG 2.3.1 / Children's Code)

- 모든 phase에서 flash/flicker는 **3Hz 미만**.
- Phase A 떨림은 5Hz 이하 (어린이 보수적 기준).
- 글로우는 깜빡이지 않고 단조 감쇠.
- 거품 입자 색은 채도 60% 이하.
- `prefers-reduced-motion: reduce` 시:
  - Phase A 떨림 제거
  - Phase B 이동을 0.2s linear fade-cross로 대체
  - Phase C 글로우 0.6s 단축, follow 생략
- 부모 영역(설정)에 `magicMomentEnabled` 토글 (기본 ON).

## 채널 분리 매트릭스

| 채널 | Phase A | Phase B | Phase C | 비활성 시 fallback |
|---|---|---|---|---|
| 시각 | 떨림+오버레이 | 이동+거품+물보라 | 글로우+follow | 항상 활성 |
| 청각 | 상승 woosh | 물방울 splash | 부드러운 차임 | 시각만으로 완결 |
| 햅틱 | 미사용 | 30ms light | 미사용 | 무음 처리 |

## 검증 기준

- [ ] 등록 버튼 클릭 후 Phase A가 정확히 300ms 이내에 시작된다.
- [ ] Phase B 이동 거리(미리보기 좌표 → 어항 등록 좌표) 오차가 ±8px 이내이다.
- [ ] Phase B에서 거품 입자가 12개 이상 생성된다.
- [ ] 물보라 ring이 입수점 중심에서 정확히 표시된다.
- [ ] Phase C 글로우는 1500±100ms 동안 유지된다.
- [ ] viewport follow는 1.05±0.01배 확대 후 원위치로 복귀한다.
- [ ] 모든 시각 효과의 깜빡임 빈도가 3Hz 미만이다.
- [ ] prefers-reduced-motion 활성화 시 Phase A 떨림이 제거되고 Phase B가 0.2s fade-cross로 대체된다.
- [ ] 음소거 환경에서도 마법 모먼트가 정서적으로 완결된다.
- [ ] 연속 등록(0.5초 간격) 시 큐잉이 동작하며 두 번째 모먼트가 정상 재생된다.
- [ ] 큐 길이는 5를 초과하지 않으며 초과 시 즉시 등록만 수행된다.
- [ ] 마법 모먼트 종료 직후 prop-panel이 자동으로 열린다.
- [ ] 마법 모먼트 종료 후 물고기가 일반 이동 루프(S-005)에 합류한다.
- [ ] `magicMomentEnabled = false` 시 마법 모먼트가 재생되지 않는다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm test`가 통과한다 (state machine 테스트 포함).
- [ ] `npm run build`가 통과한다.
