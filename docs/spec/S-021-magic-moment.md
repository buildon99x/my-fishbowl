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
6. **[Breath]** 2.6–2.8s — 200ms 정적 호흡(글로우 잔광만 유지). 어린이가 "내 친구다"를 인지할 시간.
7. Breath 종료 직후 prop-panel이 자동 오픈된다 (S-004 §"등록 직후 prop-panel 오픈" 시점은 본 스펙의 Breath 종료로 해석한다).
8. 새 물고기는 일반 이동 루프(S-005)에 합류한다 (S-009-amendment §보강 3에 의해 첫 3초 천천히 헤엄).

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
  - 진행 중 추가 등록 발생 시 큐에 push (최대 3개 — 4–8세 인내 시간 고려, 원안 5개에서 축소)
  - 현재 모먼트 종료 후 200ms 간격으로 다음 큐 처리
  - 큐 길이가 1 이상일 때 어항 우상단에 작은 dot 인디케이터(•••) 표시 — 어린이가 "다음에도 올 거야"를 시각으로 확인
  - 큐 한도 초과 시 즉시 등록만 수행하되, 미니 거품 1회 burst로 최소한의 피드백 제공

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

## UX 리뷰 결정 사항

| 쟁점 | 원안 | 결정 | 근거 |
|---|---|---|---|
| Phase C → prop-panel 전환 | 종료 직후 즉시 오픈 | 200ms Breath 후 오픈 | 글로우 절정과 패널 등장이 겹치면 어린이 시선이 분산. 짧은 정적 시간이 "환영" 정서를 완결 |
| 큐 한도 | 5개 | 3개 + 인디케이터 | 5개 = 13초+ 대기, 4–8세 한계 초과. 인디케이터로 "올 것"임을 약속 |
| 햅틱 채널 | Phase B만 | 유지 (Phase B만) | Phase 마다 햅틱 = 과자극. 시각·청각이 이미 충분 |
| skip 버튼 | 없음 | 추가하지 않음 | 2.6초는 짧고, 어린이는 매번 정서 보상을 원함. 부모 영역 전역 OFF 토글로 충분 |
| reduced-motion fallback | Phase B fade-cross 0.2s | 유지 | 어린이는 거의 사용하지 않으나 접근성 충족 |

### 충돌/연동 정리

- **S-004 검증 기준 "등록 직후 prop-panel 자동 오픈"** → 본 스펙에서 "등록 직후 = Breath 종료 직후"로 해석. S-004 본문 수정 없이 정합.
- **S-009-amendment §보강 3** Phase C 종료 후 3초 cruising × 0.7 — 본 스펙의 Breath(200ms) 직후 시작.
- **S-022 사운드 트리거**: Phase A `magic-anticipate`, Phase B `magic-splash`, Phase C `magic-welcome`. ambient는 magic 카테고리와 독립 재생되어야 하므로 `magicMomentEnabled = false`여도 ambient는 유지.
- **S-023 시퀀스 4**: 첫 등록 시 본 모먼트가 온보딩의 보상 역할. 이때는 큐가 비어있으므로 인디케이터 비표시.

## SP

**8 SP** — 3-phase state machine + 큐잉/인디케이터 + DOM 클론 좌표 계산(미리보기→입수점 ±8px) + viewport follow + 채널 분리 + reduced-motion 분기 + 사운드/햅틱 통합. 시각 디테일 비중이 높고, S-022/S-023과 동시 통합 검증 필요.

## 검증 기준

- [ ] 등록 버튼 클릭 후 Phase A가 정확히 300ms 이내에 시작된다.
- [ ] Phase B 이동 거리(미리보기 좌표 → 어항 등록 좌표) 오차가 ±8px 이내이다.
- [ ] Phase B에서 거품 입자가 12개 이상 생성된다.
- [ ] 물보라 ring이 입수점 중심에서 정확히 표시된다.
- [ ] Phase C 글로우는 1500±100ms 동안 유지된다.
- [ ] viewport follow는 1.05±0.01배 확대 후 원위치로 복귀한다.
- [ ] Phase C 종료 후 200±20ms Breath 구간이 존재하며 이 사이엔 새 인터랙션이 없다.
- [ ] 모든 시각 효과의 깜빡임 빈도가 3Hz 미만이다.
- [ ] prefers-reduced-motion 활성화 시 Phase A 떨림이 제거되고 Phase B가 0.2s fade-cross로 대체된다.
- [ ] 음소거 환경에서도 마법 모먼트가 정서적으로 완결된다.
- [ ] 연속 등록(0.5초 간격) 시 큐잉이 동작하며 두 번째 모먼트가 정상 재생된다.
- [ ] 큐 길이는 3을 초과하지 않으며 초과 시 즉시 등록 + 미니 거품 burst만 수행된다.
- [ ] 큐 길이 ≥ 1일 때 어항 우상단 dot 인디케이터가 표시된다.
- [ ] Breath 종료(2.8s) 직후 prop-panel이 자동으로 열린다.
- [ ] 마법 모먼트 종료 후 물고기가 일반 이동 루프(S-005)에 합류한다.
- [ ] `magicMomentEnabled = false` 시 마법 모먼트가 재생되지 않는다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm test`가 통과한다 (state machine 테스트 포함).
- [ ] `npm run build`가 통과한다.
