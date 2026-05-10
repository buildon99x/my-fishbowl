# S-021b Default Objects 프리셋 갤러리

## 상태

- 상태: draft
- 구현 여부: not-started
- 검증 여부: not-tested

## 전제

- **선행 스펙**: S-021a Prop 타입 인프라가 done이어야 한다. 본 스펙은 S-021a의 `addPropToAquarium`, type 분기, fish/deco 필터를 그대로 사용한다.

## 목표

- `docs/draft/extracted-fish/` 리소스를 정식 자산으로 옮기고, 사용자가 별도 업로드/그리기 없이 어항을 채울 수 있는 **Default Objects 프리셋 갤러리**를 제공한다.
- 갤러리는 fish/deco를 명확히 구분하여 노출하고, 카드 클릭 한 번으로 일반 Prop으로 복사 등록한다.
- 등록 흐름은 사용자 직접 등록 흐름과 분리하되, 등록 결과물은 동일한 prop 모델로 통합되어 이후 자유롭게 편집/삭제할 수 있다.

## 범위

- 포함:
  - 자산 이전: `docs/draft/extracted-fish/*.png` → `src/assets/default-objects/fish/`, `src/assets/default-objects/deco/`.
  - 카탈로그 manifest(`src/assets/default-objects/manifest.js`):
    - `id`, `type`, `name`, `spriteUrl`(Vite `?url`), `defaultSize`, `defaultMovementEnabled`(deco는 항상 false), 선택적 `defaultSpeedMultiplier`(fish 전용).
    - 분류 검증(단위 테스트): `deco-`로 시작하는 파일은 `type === 'deco'`, 그 외는 `'fish'`. id 중복 없음.
  - 액션 클러스터에 **별도 진입점**(🎁 버튼, 시각 라벨 `기본`, 툴팁/aria-label `기본 오브젝트`) 추가 → 클릭 시 전용 갤러리 모달 오픈. fish-input 패널과 독립.
    - 어린이 비문해 대응: 1차 신호는 🎁 이모지(>=32px) + 한국어 1단어. 다른 액션 클러스터 버튼과 구분되도록 surface-card 톤으로 살짝 차별화.
    - 빈 어항(첫 진입) 1회: 🎁 버튼에 1.0초 어포던스 펄스 + 위쪽에 ↓ 이모지 1회 표시(prefers-reduced-motion 시 정적 외곽선만). S-023 onboarding과 trigger를 공유한다(자세한 규약은 "구현 메모" 참조).
  - 갤러리 모달 UI:
    - 헤더: 제목 `기본 오브젝트`(보조 영문 `Default Objects` 작게), 한 줄 설명 텍스트는 부모용 보조로만(어린이는 제목 + 큰 이모지로 의도 인지), 닫기 버튼(48×48 hit, ✕ 32px).
    - fish 그룹 헤더: 큰 이모지 🐟 + 한국어 `물고기`. deco 그룹 헤더: 큰 이모지 🪨 + 한국어 `장식`. 헤더 자체가 색 영역(fish 파랑 톤 / deco 모래 톤)으로 그룹 경계를 1차 신호로 만든다.
    - fish 카드 그리드(6장) → deco 카드 그리드(5장). 카드 간격 ≥12px, 그룹 헤더와 카드 간 ≥16px(S-024 어린이 영역 spacing 정책).
    - 카드: 96px 정사각 썸네일 + 이름 + 타입 신호(이모지 🐟/🪨가 1차, 색 배지가 2차, 텍스트 `fish`/`deco`는 보조). 타입 신호는 **형태(원형 vs 사각)·이모지·색** 셋 중 둘 이상을 동시에 사용해 색약/비문해 모두 안전.
  - 등록 파이프라인(카탈로그 전용, draft localStorage와 분리):
    - 카드 클릭 시 manifest 항목의 `spriteUrl`을 fetch → 240×160 PNG로 리사이즈(기존 fish-input 리사이즈 로직 재사용/공용화) → dataURL 1회 변환 → 메모리 캐시.
    - 첫 탭 즉시(<100ms) 카드에 "받음" 시각 피드백(테두리 굵기 펄스 + 작은 회전 이모지). 캐시 미스로 fetch/resize가 진행되는 동안에도 동일한 "준비 중" 표시를 유지하여 어린이가 "안 눌렸다"고 다시 탭하지 않도록 한다.
    - `addPropToAquarium(aquarium, { name, spriteDataUrl: cached, ...presetMeta }, type)` 호출.
    - **다중 채널 등록 피드백**:
      - 모달 카드: 200ms 등록 펄스.
      - 어항 가시성 보장(peek): 등록 직후 0.6–0.8s 동안 모달 컨테이너가 transform으로 살짝 비켜(예: scale 0.96 + translateY 8px + opacity 0.85) 어항 등록 위치가 보이도록 한다. peek 종료 후 원위치 복귀.
      - 어항: S-021 magic-moment의 짧은 버전(약 0.6s, 거품 버스트 + 입수 ring만, 기대 단계는 생략)을 hook. magic-moment 모듈을 그대로 재사용한다.
      - 사운드: S-022 sound 시스템의 입수/거품 SE 1회(master 0.7 캡 준수, 부모 영역 mute 존중).
      - 이모지 트레일(선택, reduced-motion 시 비활성): 카드 좌표 → 어항 등록 좌표로 0.5s 이모지 1개 날림. 프레임 비용 부담되면 생략 가능.
    - **prop-panel 자동 오픈하지 않음**. 대신 fish-list의 새 항목에 1.2초 강조 애니메이션(모달 peek와 동시에 보이도록 타이밍 정렬).
  - 위치 결정:
    - fish: 화면 안 랜덤 좌표(여백 12% 이상). lane 충돌 회피.
    - deco: x 랜덤, y는 75~92% 사이로 클램프(바닥 근처).
  - 이름 충돌 처리: 내부 식별자는 `Nimo (2)`, `Nimo (3)` 자동 suffix. **fish-list 표시는 같은 이름 + 작은 ②/③ 이모지 뱃지**(어린이가 텍스트 `(2)`를 읽지 못함).
  - 동일 카드 연타 방지: 200ms 디바운스. 디바운스로 무시되는 탭에도 카드에 약한 "쿵" 펄스 1회를 줘 "받았다, 잠깐" 신호를 준다(탭이 무시된 줄 모르는 좌절 방지).
  - 접근성 / 모션 안전:
    - 모달 열기 시 첫 카드에 포커스. Esc로 닫기. 배경 스크롤 잠금.
    - 배경 클릭으로 닫지 않는다(어린이가 카드 사이 빈 공간 탭으로 의도치 않게 닫는 사고 방지). 닫기는 헤더의 명시 ✕ 버튼만 사용한다.
    - 카드는 Tab 이동 + Enter/Space 등록. Enter 등록 후 같은 카드에 포커스 유지(연속 등록). 키보드 흐름은 부모/접근성 사용자용이며, 어린이 타깃의 1차 동선은 탭이다.
    - `prefers-reduced-motion: reduce` 시: 200ms 펄스/1.2초 강조/peek/이모지 트레일은 단색·정적 변화로 대체(예: 테두리 색 변화 1회, peek 비활성). magic-moment 짧은 버전도 reduced-motion 분기에 따른다.
    - 카드 hit 96px(시각도 96), 닫기 버튼 hit 48×48, 그룹 헤더 hit는 비인터랙티브.
- 제외:
  - 신규 어항 자동 시드.
  - 사용자 Prop을 카탈로그로 저장.
  - 카탈로그 다국어/검색 필터/페이지네이션.
  - 카드별 사이즈 조정 UI(manifest 고정값 사용).
  - 카탈로그 항목별 사운드/애니메이션 프리뷰.
  - 본격적인 빈 어항 onboarding 오버레이(셀렉터 `#aquarium-empty-cta` 예약과 🎁 버튼 1회 펄스/↓ 어포던스만 본 스펙에 포함, 풀 onboarding은 S-023 책임).

## 사용자 흐름

1. (빈 어항 첫 진입에 한해) 액션 클러스터의 🎁 버튼이 1.0초 펄스 + ↓ 어포던스 1회로 시선을 끈다.
2. 사용자(어린이)가 🎁 `기본` 버튼을 탭한다.
3. 갤러리 모달이 열리고 큰 이모지 헤더 🐟 물고기 / 🪨 장식 그룹이 보인다. 부모/접근성 사용자에게는 첫 카드에 포커스가 잡힌다.
4. 어린이가 카드를 탭한다(부모는 Enter도 가능). 탭 즉시(<100ms) 카드 테두리가 굵어지고 작은 회전 이모지가 표시되어 "받음"을 시각적으로 알린다.
5. 등록 시점: 모달이 0.6–0.8s 살짝 비켜서(peek) 어항이 보이고, 어항에는 짧은 magic-moment(거품+ring)와 입수 SE가 재생된다. fish-list 항목이 1.2초 강조된다. 모달은 닫히지 않는다.
6. 어린이는 다른 카드를 연속으로 탭해 여러 오브젝트를 추가할 수 있다. 같은 카드를 빠르게 두 번 누르면 두 번째 탭은 200ms 디바운스로 보류되며 카드에 "잠깐" 펄스가 표시된다.
7. 명시 ✕ 버튼으로 모달을 닫으면 prop-panel/일반 흐름으로 복귀한다. 등록된 오브젝트는 일반 Prop과 동일하게 prop-panel에서 편집/삭제/타입 전환 가능하다.

## UI/상태 요구사항

- 필요한 화면 요소:
  - 액션 클러스터 진입점 버튼(🎁, 라벨/툴팁 `Default Objects`).
  - 갤러리 모달 컨테이너(중앙 정렬, 둥근 모서리, 그림자, z-index는 prop-panel 위).
  - 그룹 헤더 2개(`Fish`, `Decoration`).
  - 카드 11개(fish 6 + deco 5).
  - 카드 hover/focus outline + 200ms 등록 펄스.
- 필요한 상태:
  - `appState.galleryOpen: boolean`.
  - 카탈로그 dataURL 캐시는 모듈 스코프 Map(앱 라이프사이클). 영속 X.
  - 카탈로그 등록은 fish-input draft localStorage에 영향을 주지 않는다.
- 오류 또는 빈 상태:
  - manifest가 비면 모달은 큰 ❓ 이모지 + 짧은 한국어 1줄 안내(부모용) 후 닫기만 가능.
  - 카드 이미지 로드 실패 시 카드 자체를 비활성화 표현(회색 톤 + ❓ 이모지 + 짧은 ↘ 흔들림 1회). 텍스트 토스트는 사용하지 않는다(어린이 비문해 부적합, 중복 신호). 부모용 콘솔 경고만 남긴다.

## 구현 메모

- 관련 파일(예상):
  - 신규: `src/assets/default-objects/{fish,deco}/*.png`, `src/assets/default-objects/manifest.js`, `src/features/default-objects/{index.js,view.js,events.js,catalog.js,catalog.test.js}`, `src/styles/components/default-objects.css`.
  - 수정: `src/features/action-cluster/*` 또는 해당 진입점(🎁 버튼 추가), `src/main.js`(모달 wiring), `src/styles/index.css`(새 CSS import), `ARCHITECTURE.md`(default-objects feature/assets 디렉터리 추가), `SPEC.md`(완료 기록).
  - 공용화: fish-input의 240×160 리사이즈 로직을 `src/lib/spriteResize.js`로 추출하여 fish-input과 default-objects 모두에서 재사용.
- 캐시 전략: `Map<id, dataURL>`. 첫 등록 시 fetch + 리사이즈 + 변환, 이후는 즉시 사용. 모달 열기 시점에 manifest 항목을 백그라운드 prefetch하여 첫 탭 지연을 줄인다(idle 시점에 직렬 처리, 대역 부담 시 정지 가능).
- fish-list 강조 애니메이션: 항목 DOM에 `.fish-list-item--just-added` 1200ms 토글. 기존 강조 클래스가 있으면 재사용.
- 위치 계산: 어항 경계의 px → % 좌표 변환을 `aquarium/decoration.js` 또는 신규 헬퍼에서 통일.
- 디바운스: 카드 핸들러에서 `lastClickAt` 비교(요소 단위). 무시되는 탭에도 카드에 "잠깐" 펄스 클래스 1회 토글.
- 모달 peek 모션: 모달 컨테이너 클래스 `.default-objects-modal--peek`를 0.6–0.8s 토글. CSS transform/opacity만 사용하여 GPU 합성. reduced-motion 시 클래스 토글 자체를 스킵.
- magic-moment 짧은 버전: S-021의 진입점에 `{ phase: 'short', skipAnticipation: true }` 옵션을 추가하거나, 갤러리 등록 전용 export(`runMagicMomentShort(targetXY)`)를 둔다. 코드 위치/시그니처는 S-021 모듈 정책에 맞춘다.
- 사운드 hook: S-022 sound 모듈의 `playSfx('water-enter')`(또는 동등 키)를 등록 성공 시 1회 호출. 모듈이 master mute 상태면 호출은 no-op.
- onboarding hook: 빈 어항 상태(`props.length === 0`)에서 액션 클러스터 mount 직후 1회만 🎁에 `.action-button--cta-pulse` 토글, ↓ 어포던스는 임시 child node로 1회 표시 후 제거. 사용자가 한 번이라도 모달을 열면 영구 dismiss(localStorage flag `defaultObjects.cta.seen=true`).
- 이름 표시: fish-list view에서 base name 동일 항목이 둘 이상이면 등록 순서대로 ②, ③, ④ … 작은 이모지 뱃지를 prepend. 내부 식별/스토리지에는 기존 `(2)` suffix 그대로.

## UX/UI 설계 노트

- **타깃 페르소나 가정**: 주 사용자는 4–8세 어린이(비문해/저문해, 태블릿 터치). 보조는 부모(키보드/접근성). 본 스펙의 모든 1차 신호는 이모지·형태·색이고 텍스트는 보조.
- 진입점을 fish-input과 분리하는 이유: 카탈로그는 "기본 설정 불러오기" 의도이고, fish-input은 "사용자 자작" 의도다. 의도가 다르면 진입점도 다른 편이 직관적이고, fish-input 패널이 길어지지 않는다.
- 카드 그리드: 데스크톱 4열 wrap, 좁은 폭 2열, 모바일 가로 스크롤 1행. 카드 간 ≥12px, 그룹 헤더-카드 간 ≥16px. 그룹 헤더는 자체 색 영역 + 큰 이모지로 fish/deco 경계를 1차 시각 신호로 만든다.
- 카드 배지: fish는 파랑 톤, deco는 모래/녹색 톤. **이모지(🐟/🪨) + 색 + 형태(원/사각)** 셋 중 둘 이상을 동시에 사용해 색약·비문해 모두 안전.
- 등록 피드백(다중 채널): 카드 200ms 펄스 + 모달 0.6–0.8s peek + 어항 짧은 magic-moment(거품/ring) + S-022 입수 SE + fish-list 1.2초 강조. 텍스트 토스트는 도입하지 않음(어린이 비문해 부적합, 중복).
- 모달 동작: Esc 닫기(키보드 사용자), **배경 클릭 닫기는 비활성**(어린이 오탭 방지), 명시 ✕ 버튼 닫기. 연속 등록 동안 모달은 열린 상태 유지.
- 키보드 흐름(보조): 화살표로 그리드 내 이동(선택), Tab 이동(필수), Enter/Space 등록, Enter 후 포커스 유지.
- 모션 안전: `prefers-reduced-motion: reduce`에서 펄스/peek/magic-moment/이모지 트레일은 정적 변화로 대체. 사운드는 그대로 1회.
- onboarding 연계: 빈 어항 첫 진입에서만 🎁 진입점에 1회 어포던스. S-023 풀 onboarding은 별도이고, 본 스펙은 진입점 발견성만 책임진다.

## 검증 기준

- [ ] `src/assets/default-objects/` 아래 fish 6개, deco 5개 PNG가 존재한다.
- [ ] manifest 단위 테스트가 분류 규칙과 id 중복 없음을 통과한다.
- [ ] 액션 클러스터의 🎁 버튼(시각 라벨 `기본`, aria-label `기본 오브젝트`)으로 갤러리 모달이 열린다.
- [ ] 빈 어항 첫 진입에서만 🎁 버튼에 1회 어포던스 펄스가 표시되고, 모달을 한 번이라도 연 뒤에는 다시 표시되지 않는다.
- [ ] 그룹 헤더가 큰 이모지(🐟/🪨) + 한국어(`물고기`/`장식`) + 색 영역으로 1차 식별 가능하고, 영문 텍스트는 보조 위치에만 있다.
- [ ] 타입 신호(이모지/색/형태)가 동시에 둘 이상 적용되어 색약/비문해 사용자가 fish/deco를 구분할 수 있다(스펙 검증: 그레이스케일 스크린샷에서도 구분 가능).
- [ ] 어린이 영역 spacing 정책: 카드 간 ≥12px, 그룹 헤더-카드 간 ≥16px가 모든 breakpoint에서 만족된다.
- [ ] 카드 탭 즉시(<100ms) "받음" 시각 피드백이 나타나고, 캐시 미스 동안에도 동일 표시가 유지된다.
- [ ] fish 카드 클릭 시 어항에 움직이는 물고기가 등장하고, 모달이 0.6–0.8s peek로 비켜서 어항이 보인다. magic-moment 짧은 버전(거품+ring)과 S-022 입수 SE 1회가 재생되며 fish-list 항목이 1.2초 강조된다.
- [ ] deco 카드 클릭 시 어항 바닥 근처에 고정 장식이 등장하고 movement/feeding 루프에서 무시되며, 동일한 peek/사운드/리스트 강조 피드백이 적용된다.
- [ ] 동일 카드 연타 시 200ms 디바운스가 동작하며, 무시되는 탭에도 카드에 "잠깐" 펄스가 1회 표시된다.
- [ ] 동일 base name 추가 등록은 내부적으로 `(2)`, `(3)` suffix를 가지며, fish-list 표시는 ②, ③ 이모지 뱃지로 노출된다.
- [ ] 카탈로그 등록은 fish-input draft localStorage를 변경하지 않는다.
- [ ] 등록 후 prop-panel은 자동으로 열리지 않는다. prop-panel에서 등록된 오브젝트는 일반 Prop과 동일하게 편집/삭제/타입 전환된다.
- [ ] 카드 이미지 로드 실패 시 카드가 회색 톤 + ❓ 이모지 + ↘ 흔들림 1회로 비활성화되며, 텍스트 토스트는 표시되지 않는다.
- [ ] 모달은 ✕ 버튼/Esc로만 닫히고 배경 클릭으로는 닫히지 않는다.
- [ ] `prefers-reduced-motion: reduce` 시 200ms 펄스/peek/magic-moment 모션/이모지 트레일이 정적 변화로 대체되고, 사운드와 등록 자체는 정상 동작한다.
- [ ] 키보드만으로 모달 열기→카드 등록→연속 등록→닫기가 가능하다(부모/접근성 흐름).
- [ ] 태블릿 터치(키보드 없음)만으로 모달 열기→카드 등록→연속 등록→닫기가 가능하다(어린이 1차 흐름).
- [ ] 브라우저 콘솔 오류가 없고 `npm test`, `npm run lint`, `npm run build`가 통과한다.
