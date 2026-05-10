# S-024 어린이 터치 타겟 상향 (S-013/S-020 패치)

## 상태

- 상태: draft
- 적용 대상: S-013 prop-panel, S-020 prop type classification, 어린이 직접 조작 UI 전반
- 변경 유형: 디자인 토큰 + 컴포넌트별 패치

## 의존성

- 기존 S-013, S-020, S-003 모두

## 목표

- 어린이(4–8세) 운동 능력에 맞춰 **어린이 영역**의 모든 인터랙티브 요소를 **최소 48×48px**, 권장 **56×56px**로 상향한다.
- 부모/접근성 영역은 기존 44×44px 유지.
- 단순 크기 상향이 아닌 **터치 영역(hit) > 시각 영역(visual) 분리** 패턴 도입.

## 영역 정의

| 영역 | 최소 터치 | 권장 | 간격 |
|---|---|---|---|
| 어린이 영역 (어항, 그리기, 오브젝트 추가/목록) | 48×48 | 56×56 | 12px |
| 부모 영역 (설정, 도움말 다시 보기, GodMode) | 44×44 | 44×44 | 8px |

## 디자인 토큰

```css
:root {
  --touch-target-child: 48px;
  --touch-target-child-recommended: 56px;
  --touch-target-adult: 44px;
  --touch-target-spacing-child: 12px;
  --touch-target-spacing-adult: 8px;
}
```

## Hit area > Visual area 패턴

```css
.btn-child {
  min-width: var(--touch-target-child);
  min-height: var(--touch-target-child);
  padding: 8px;
  /* 시각적 아이콘은 32px여도 hit 48px 보장 */
}
```

## 영향 분석 표

| 컴포넌트 | 기존 | 신규 | 비고 |
|---|---|---|---|
| prop-panel 닫기 버튼 | 44 | 48 | |
| prop-panel 액션 버튼 (반전/초기화) | 44 | 48 | |
| prop-panel 슬라이더 핸들 | 28 | 36 | 정밀도와 가독성 균형 |
| prop-panel 토글 행 높이 | 44 | 48 | |
| prop-panel 너비 | 320 | 340 | 모바일은 calc(100vw - 32px) |
| S-020 segmented control 셀 | 44 | 56 | 이모지+텍스트 라벨 |
| 액션 클러스터 (Feed/Add/Cleaning/GodMode) | 56 | 56 | 이미 충족 |
| 그리기 색상 팔레트 | — | hit 56 / visual **36** | S-003 후속 patch (S-003 done에 추가) |
| 그리기 도구 6종 | — | 56×56 | S-003 후속 patch |
| 오브젝트 목록 항목 행 | 56 | 64 | 썸네일 가독성 |
| 오브젝트 목록 편집/감추기/삭제 | 36 | 48 | |
| 부모 영역 GodMode 입력 | — | 44 | 그대로 |

## 모바일 폭(<760px) 검증

- prop-panel 너비 340 + 좌측 여백 18 = 358 → 360px 환경 빠듯.
- 모바일에서는 `calc(100vw - 32px)` 적용 (기존 정책 유지).
- 어린이 영역 토큰 적용 후 한 화면에 모든 컨트롤이 들어오는지 자동 테스트.

## 영역 마커 (자동 검증 필수)

자동 테스트가 어린이/부모 영역을 구분할 수 있도록 모든 인터랙티브 컨테이너에 `data-touch-area` 속성을 부여한다.

```html
<section data-touch-area="child"> ... 어항/그리기/오브젝트 목록/액션 클러스터 ... </section>
<section data-touch-area="parent"> ... 설정/도움말/GodMode ... </section>
```

- 마커가 없는 인터랙티브 요소는 테스트가 **fail**시킨다 (의도적 회귀 방지).

## 자동 검증

`tests/touch-target.test.js` 신규:
- 모든 `[role="button"]`, `<button>`, `<input type="range" | "checkbox">`의 `getBoundingClientRect`를 측정.
- 가장 가까운 `[data-touch-area]` 조상으로 영역 분류.
- `child` 영역 요소: 48×48 이상, 인접 거리 ≥ 12px.
- `parent` 영역 요소: 44×44 이상, 인접 거리 ≥ 8px.
- 마커 없음: fail.

## 안전·접근성

- WCAG 2.5.5 (Target Size) Level AAA 충족 (44×44 이상).
- 어린이 영역은 본 정책으로 더 보수적 (48×48).
- prefers-reduced-motion 무관.

## 마이그레이션 순서

1. 토큰 추가 (`src/styles/tokens.css` 또는 base.css)
2. 어린이 영역부터 적용 (액션 클러스터, prop-panel, 그리기, 오브젝트 목록)
3. 시각 회귀 테스트로 레이아웃 깨짐 점검
4. 부모 영역은 그대로

## UX 리뷰 결정 사항

| 쟁점 | 원안 | 결정 | 근거 |
|---|---|---|---|
| 색상 팔레트 visual 크기 | 32px | **36px** | 4–6세 색 변별 임계값 + 손가락 가림 고려. hit 56 유지 |
| segmented control 라벨 | 이모지+텍스트 | 이모지 1차, 텍스트는 보조(글 못 읽는 4–6세 무시 가능) | 텍스트가 주가 되면 비문해 사용자 좌절. 이모지 단독으로도 의미 전달되도록 선정 |
| prop-panel 너비 320→340 | 모바일 calc(100vw-32px) | 유지 | S-013 patch로 명시. 모바일은 기존 정책 |
| S-003 색팔레트/도구 표기 | "신규 (S-003)" | "S-003 후속 patch" | S-003은 done 상태이므로 amendment 형태로 정리 (S-009 amendment 패턴 동일) |
| 영역 구분 | selector 모호 | `data-touch-area="child"\|"parent"` 마커 필수 | 자동 테스트 신뢰성 확보, 회귀 방지 |
| 슬라이더 핸들 28→36 | OK | 유지 | 정밀 조정과 가독성 균형 |

### 충돌/연동 정리

- **S-013 prop-panel 너비 320 정책**: 본 스펙이 320→340으로 patch (S-013 본문에 후속 명시 필요).
- **S-013 슬라이더 핸들 28×28**: 본 스펙이 28→36으로 patch.
- **S-013 닫기 버튼 44**: 본 스펙이 44→48로 patch.
- **S-003 done 상태**: 색 팔레트/그리기 도구 정의가 누락되어 있었음. 본 스펙이 S-003 후속 patch로 사이즈 정의를 추가. 단, 팔레트/도구의 **기능적 동작**은 별도 spec으로 보강 필요(추후 S-003-amendment 발행 권장).
- **S-023 "+" 88×88**: 본 스펙 어린이 영역 권장 56을 초과하지만, 온보딩 첫 진입 강조 의도이므로 의도적 예외로 허용. 마커는 `data-touch-area="child"`.
- **S-022 음소거 토글 48×48**: 본 정책과 일치.
- **S-009-amendment "다시 뽑기" 🎲 버튼**: prop-panel(어린이 영역) 내 → 48×48 적용.

## SP

**5 SP** — 토큰 정의 + 컴포넌트별 사이즈 patch + 영역 마커 부여 + 자동 테스트 + 시각 회귀 점검. 새 알고리즘 없이 광범위한 일괄 수정. 모바일 360px 폭 회귀 테스트가 가장 까다로움.

## 검증 기준

- [ ] 디자인 토큰이 정의된다.
- [ ] 어린이 영역 모든 인터랙티브 요소가 48×48px 이상이다.
- [ ] 색상 팔레트의 시각 영역은 36px, hit area는 56px이다.
- [ ] 모든 인터랙티브 컨테이너에 `data-touch-area="child"` 또는 `"parent"` 마커가 부여된다.
- [ ] segmented control 셀이 높이 56px이며 이모지+텍스트 라벨을 가진다.
- [ ] 인접 인터랙티브 요소 간 거리 8px 이상.
- [ ] 모바일 360px 폭에서 prop-panel이 화면을 벗어나지 않는다.
- [ ] 부모 영역(설정, GodMode)은 44px를 유지한다.
- [ ] 자동 테스트 `tests/touch-target.test.js`가 통과한다.
- [ ] 슬라이더 핸들이 36×36px로 상향된다.
- [ ] 오브젝트 목록 항목 행이 64px 높이를 가진다.
- [ ] 기존 S-013/S-020 검증 기준이 모두 유지된다.
- [ ] 브라우저 콘솔 오류가 없다.
- [ ] `npm run build`가 통과한다.
