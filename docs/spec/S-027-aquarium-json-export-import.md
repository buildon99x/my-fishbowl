# S-027 어항 JSON 내보내기/불러오기 (백엔드 무관)

## 상태

- 상태: ready
- 구현 여부: not-started
- 검증 여부: not-tested

## 부모 / 의존 스펙

- 의존 없음(독립). 백엔드 시리즈(S-025~S-026)와 무관하게 동작.
- 호환: `docs/spec/S-026-parent-area-gate.md` (draft → ready)가 출시되면 본 스펙의 진입점은 자동으로 `parent.aquarium-file` 슬롯으로 이전한다. S-026 출시 전에는 **임시 ⚙️ 작은 아이콘**(우상단, S-026과 동일 위치 예약)을 사용한다.
- 상속: `docs/spec/S-025-backend-foundation.md`의 “어린이/부모 영역 분리 정책”. 어린이 영역에는 어떤 파일/내보내기/불러오기 UI도 노출되지 않는다.

## 목표

- 부모 사용자에게 **로컬 파일 기반 백업/복원**을 1~2 PR로 즉시 제공한다.
- 백엔드 시리즈(S-025) 구현/검증 기간의 안전망을 만든다(부모가 “어항이 사라질까 봐”라는 불안 없이 기다릴 수 있도록).
- 어떤 서버 비용/계정/로그인 없이 동작하므로 본 스펙은 영구 유지된다(백엔드 시리즈가 done이 되어도 별도 채널로 살아남음).

## 범위

- 포함:
  - 부모 영역(임시 ⚙️ 또는 S-026 출시 시 `parent.aquarium-file` 슬롯)에 두 버튼:
    - “어항 내보내기” — 현재 `aquarium` 객체를 JSON 파일로 다운로드(브라우저 표준 `download` 속성 또는 `URL.createObjectURL`).
    - “어항 불러오기” — `<input type="file" accept="application/json">`로 파일 선택 → 미리보기 카드 → 2s hold-to-confirm 덮어쓰기 → 적용.
  - 내보내기 파일 포맷(JSON):
    ```
    {
      "format": "my-fishbowl/aquarium",
      "version": 1,
      "exportedAt": ISO8601,
      "appVersion": "<package.json version>",
      "aquarium": <normalizeAquarium 산출 객체>
    }
    ```
  - 파일명: `my-fishbowl-<aquarium.name 슬러그>-<YYYYMMDD-HHmm>.json` (예: `my-fishbowl-나만의-어항-20260518-1432.json`). 한글은 그대로 유지하되 파일 시스템 안전 문자만 통과(`\/:*?"<>|` 치환).
  - 불러오기 검증:
    - JSON 파싱 실패 → 부모 영역에 단조 톤 “파일을 읽을 수 없습니다” 안내.
    - `format !== 'my-fishbowl/aquarium'` 또는 `version > 1` → “호환되지 않는 파일” 안내.
    - `aquarium`을 `normalizeAquarium`(`features/aquarium/model.js`)에 그대로 통과시켜 누락 필드 자동 보정 + 신뢰 가능한 모양으로 강제.
    - `fish.sprite`가 `data:` URL이 아니거나 `https://` 외 외부 URL이면 해당 fish의 sprite를 제거하고 “일부 그림이 누락되었습니다” 안내(보안: 외부 fetch 방지).
  - 불러오기 적용:
    - 현재 어항에 fish가 1마리 이상 있으면 시각 미리보기 카드 2장(이 태블릿 / 파일) + **2s hold-to-confirm 덮어쓰기**.
    - 빈 어항이면 즉시 덮어쓰기.
    - 적용은 기존 `saveAquarium`(`features/aquarium/storage`)을 통해 일어난다. 외부 모듈/디렉터리 추가 없음.
  - 임시 진입점:
    - S-026 미출시 상태에서는 어항 우상단에 작은 ⚙️ 아이콘(24px, hit area 44×44, muted 톤). 단순 탭으로 “내보내기/불러오기” 미니 패널 표시.
    - **단순 탭은 즉시 패널 표시**(S-026 hold-to-fill 게이트 없음 — 본 스펙은 파괴적 동작이 hold-to-confirm 한 군데에 모여 있어 우발 진입 위험 낮음). 다만 S-026 출시 시점에 즉시 게이트 뒤로 이동.
  - 어린이 영역:
    - 어떤 파일 UI/안내도 노출되지 않는다.
    - 불러오기 적용 직후 어항은 자연스럽게 교체된다(기존 fish DOM 교체 + 마법 모먼트 트리거 없음).
- 제외:
  - 다중 어항 export(여러 슬롯).
  - 자동 schedule export(서버 cron, periodic).
  - 사진/스크린샷 형태의 export(현재 PNG 캡처 별도).
  - 클립보드 export(파일만 지원, 클립보드는 별도 스펙 후보).
  - 부분 export(특정 fish만).
  - 파일 무결성 서명/암호화.

## 사용자 흐름

### 어린이 흐름

1. 어린이는 본 스펙의 어떤 UI도 보지 않는다.
2. 부모가 파일을 불러오면 어항이 자연스럽게 교체된다(빈 → 채워짐, 또는 덮어쓰기 후 새 상태). 마법 모먼트는 재생되지 않는다(이미 그려진 그림의 복원이므로).

### 부모 흐름 — 내보내기

1. 부모가 ⚙️(또는 S-026 이후 부모 영역 `parent.aquarium-file`)를 연다.
2. “어항 내보내기” 버튼을 누른다 → 즉시 JSON 파일 다운로드가 시작된다.
3. 부모는 파일을 본인의 클라우드/이메일/USB에 보관한다.

### 부모 흐름 — 불러오기

1. 부모가 ⚙️ → “어항 불러오기” → 파일 선택 다이얼로그 → JSON 파일 선택.
2. 파일이 검증된다.
3. 현재 어항에 fish가 있으면 시각 미리보기 카드 2장(이 태블릿 / 파일)이 나란히 표시되고 “덮어쓰기” 버튼이 2s hold-to-confirm으로 등장한다.
4. 빈 어항이면 즉시 적용.
5. 적용 후 어린이 영역에 새 어항이 자연스럽게 나타난다.

## UI/상태 요구사항

- 어린이 영역:
  - 본 스펙으로 추가되는 UI **없음**.
- 부모 영역(또는 S-026 출시 전 임시 ⚙️ 미니 패널):
  - 버튼 2개: “어항 내보내기”, “어항 불러오기”.
  - 불러오기 시 미리보기 카드: 어항 일러스트 미니어처 + 물고기 수. timestamp/etag 노출 금지.
  - 덮어쓰기 버튼: 위험 톤(부모 영역만 사용), 2s hold-to-confirm.
  - 모든 상태/오류 안내는 단조 색 변화, 점멸 없음.
- 필요한 상태(클라이언트 메모리):
  - `appState.aquariumFile = { phase: 'idle'|'reading'|'preview'|'confirming'|'applied'|'error', preview?: { aquarium, meta }, lastError?: { code, message } }`.
  - localStorage 추가 없음.
- 모션/접근성:
  - hold-to-confirm은 S-026의 동일 패턴(ring fill, `prefers-reduced-motion` 시 fade-fill). S-026 미출시 시점에는 본 스펙 내부에서 같은 패턴을 mini-구현(`features/aquarium-file/hold.js`)하고 S-026 출시 시 모듈 교체.

## 어린이/부모 영역 매핑(S-025 표 보강)

| 기능 | 어린이 영역 | 부모 영역 | 비고 |
| --- | --- | --- | --- |
| 어항 내보내기 버튼 | 노출 안 함 | ⚙️ 또는 `parent.aquarium-file` | 즉시 다운로드 |
| 어항 불러오기 버튼 | 노출 안 함 | ⚙️ 또는 `parent.aquarium-file` | 파일 다이얼로그 |
| 불러오기 미리보기 | 노출 안 함 | 시각 미리보기 카드 2장 + 2s hold | timestamp 노출 금지 |
| 잘못된 파일 안내 | 노출 안 함 | 단조 톤 본문 | “파일을 읽을 수 없습니다” 등 |
| 불러오기 후 어항 교체 | 자연스러운 교체(마법 모먼트 없음) | 단조 톤 성공 안내 | 어린이 정서 보존 |

## 구현 메모

- 신규 디렉터리: `src/features/aquarium-file/`
  - `index.js`: 외부 진입점, ⚙️ 마운트(또는 S-026 슬롯 콜백 등록).
  - `view.js`: 미니 패널 + 미리보기 카드 + 덮어쓰기 버튼.
  - `events.js`: 파일 다운로드 / 파일 선택 이벤트.
  - `serialize.js`: `{ format, version, exportedAt, appVersion, aquarium }` 직렬화 + 파일명 슬러그.
  - `validate.js`: 역직렬화 + 스키마 검증 + `normalizeAquarium` 통과 + sprite URL 화이트리스트.
  - `hold.js`: 2s hold-to-confirm mini 구현(S-026 출시 시 그 모듈로 교체).
  - 테스트: `serialize.test.js`, `validate.test.js`, `hold.test.js`.
- 변경: `src/main.js`(⚙️ 마운트 wiring), `ARCHITECTURE.md`(본 스펙 done 시점에 features 트리에 추가).
- 외부 import 표면: 다른 feature는 본 스펙의 존재를 모른다. `loadAquarium`/`saveAquarium`만 사용해 적용.
- 외부 의존성: 추가 npm 패키지 없음. `Blob`/`URL.createObjectURL`/`<a download>`/`<input type="file">`는 표준 브라우저 기능.
- sprite 외부 URL 정책:
  - dataURL은 그대로 통과.
  - 향후 S-025b의 Blob 공개 URL(`https://*.blob.vercel-storage.com/...`)은 화이트리스트 단순 prefix 검사로 통과.
  - 그 외 모든 외부 URL은 거부하고 해당 fish의 sprite를 제거 + 부모 영역 안내(보안: 임의 URL fetch 방지).
- S-026 출시 시 마이그레이션:
  - 임시 ⚙️ 마운트를 제거하고 부모 영역 `parent.aquarium-file` 슬롯 콜백으로 이전.
  - `hold.js`를 S-026의 hold-to-confirm 모듈로 교체.
  - 두 변경 모두 본 스펙의 외부 API(`saveAquarium`/`loadAquarium`)는 건드리지 않음.

## 위협 모델

| 경로 | 위협 | 완화 |
| --- | --- | --- |
| 악성 JSON 파일 | 사용자가 외부에서 받은 “어항 파일”에 임의 코드/URL 임베드 | JSON 파싱 후 `format`/`version` 검사 + `normalizeAquarium`로 모양 강제 + sprite URL 화이트리스트. 임의 코드 실행 표면 없음. |
| sprite 외부 URL 자동 fetch | dataURL이 아닌 임의 URL이 fetch되어 추적/멀웨어 표면 | 화이트리스트(dataURL + 본 도메인 Blob)만 통과. 그 외는 제거. |
| 어린이 우발 덮어쓰기 | 어린이가 ⚙️ → 불러오기 → 덮어쓰기 | 파일 선택은 OS 파일 다이얼로그(어린이 사용 어려움) + 2s hold-to-confirm 이중. |
| 매우 큰 파일(메모리 폭주) | 부모가 200MB JSON을 불러옴 | 파일 크기 사전 검사(>10MB → 거절). 어항 1개 정상 export는 ≤1MB. |
| 잘못된 fish 데이터로 런타임 크래시 | 누락/잘못된 fish 필드 | `normalizeAquarium`이 모든 필드를 안전 값으로 보정. |
| 어린이가 어항을 잃을 위험 0 | 본 스펙 자체가 “잃지 않게 하는” 안전망 | 파일 내보내기는 비파괴적, 불러오기는 hold-to-confirm로 보호. |

## 검증 기준

- [ ] 부모가 ⚙️ → “어항 내보내기”를 누르면 즉시 `my-fishbowl-<name>-<yyyymmdd-hhmm>.json` 형식의 JSON 파일이 다운로드된다.
- [ ] 내보낸 파일의 최상위 키는 `format`, `version`, `exportedAt`, `appVersion`, `aquarium`이며 `format === 'my-fishbowl/aquarium'`이다.
- [ ] 내보낸 파일을 같은 앱에서 다시 불러오면 어항이 동일하게 복원된다(`aquarium.id`/`fishes` 일관).
- [ ] 잘못된 JSON 파일을 선택하면 부모 영역에 “파일을 읽을 수 없습니다” 단조 톤 안내가 표시되고 어린이 영역은 무변화이다.
- [ ] 호환되지 않는 `format`/`version` 파일은 “호환되지 않는 파일” 안내가 표시된다.
- [ ] sprite가 dataURL이나 화이트리스트 도메인이 아닌 외부 URL인 경우 해당 fish의 sprite가 제거되고 “일부 그림이 누락되었습니다” 안내가 표시된다.
- [ ] 현재 어항에 fish가 있는 상태에서 불러오기 시 시각 미리보기 카드 2장 + 2s hold-to-confirm 덮어쓰기를 만족해야 적용된다.
- [ ] 빈 어항에서는 즉시 적용된다.
- [ ] 적용 후 어린이 영역에 새 어항이 자연스럽게 표시되고 마법 모먼트는 재생되지 않는다.
- [ ] 모든 색 변화는 단조이고 `prefers-reduced-motion`이 활성 시 hold-to-confirm ring이 fade-fill로 대체된다.
- [ ] 어린이 영역에는 본 스펙으로 추가되는 어떤 UI도 노출되지 않는다.
- [ ] 10MB 초과 파일은 거절된다.
- [ ] `npm test`(serialize/validate/hold 단위 테스트 포함)가 통과한다.
- [ ] `npm run lint`, `npm run build`, `npm run cleanup` 모두 통과한다.
- [ ] 브라우저 콘솔에 새 경고/오류가 발생하지 않는다.

## SP

**3 SP** — 신규 feature 1개(`aquarium-file/`), 파일 I/O + 검증 + mini hold-to-confirm. 백엔드 의존 없음. S-026 출시 시점에 진입점 교체(추가 1 PR로 ARCHITECTURE 갱신 포함).

## Files To Add or Change

| Path | Action | Purpose |
| --- | --- | --- |
| `src/features/aquarium-file/index.js` | add | 외부 진입점, ⚙️ 마운트 또는 S-026 슬롯 콜백. |
| `src/features/aquarium-file/view.js` | add | 미니 패널/미리보기/덮어쓰기 UI. |
| `src/features/aquarium-file/events.js` | add | 파일 다운로드/선택 이벤트. |
| `src/features/aquarium-file/serialize.js` | add | export 직렬화 + 파일명 슬러그. |
| `src/features/aquarium-file/validate.js` | add | 역직렬화 + 스키마 검증 + sprite URL 화이트리스트. |
| `src/features/aquarium-file/hold.js` | add | 2s hold-to-confirm mini(S-026 출시 시 교체). |
| `src/features/aquarium-file/serialize.test.js` | add | 직렬화 round-trip 단위 테스트. |
| `src/features/aquarium-file/validate.test.js` | add | 검증 분기/외부 URL 거절 단위 테스트. |
| `src/features/aquarium-file/hold.test.js` | add | hold 임계/중도 취소 단위 테스트. |
| `src/styles/components/aquarium-file.css` | add | 미니 패널/미리보기/위험 톤. |
| `src/styles/index.css` | change | aquarium-file.css cascade 순서 반영. |
| `src/main.js` | change | ⚙️ 마운트 wiring(S-026 출시 전). |
| `ARCHITECTURE.md` | change | 본 스펙 done 시점에 `src/features/aquarium-file/` 항목 추가. |
| `SPEC.md` | change | S-027 row 추가(ready). |
| `docs/spec/S-027-aquarium-json-export-import.md` | add | 본 문서. |

## Open Questions

- ⚙️ 임시 진입점이 S-026의 hold-to-fill 게이트 없이 어린이 우발 진입에 충분히 안전한지. → 본 스펙의 파괴적 동작(덮어쓰기)이 2s hold-to-confirm 뒤에 있어 1차 안전. 그래도 첫 베타에서 어린이 우발 트리거 사례가 나오면 임시 hold-to-fill을 본 스펙 안에서 추가.
- sprite 외부 URL 화이트리스트에 `https://images.unsplash.com` 같은 잘 알려진 CDN을 추가할지. → MVP는 dataURL + Vercel Blob만. 외부 CDN은 별도 스펙.
- 내보내기 파일 무결성 서명(예: HMAC) 도입 여부. → MVP 제외. 부모가 임의로 편집한 파일도 그대로 받아들임(어차피 로컬 안전망).
- 클립보드 export(파일 다이얼로그 없이 텍스트 복사). → 별도 스펙 후보. 큰 dataURL이 들어가면 클립보드 한계에 부딪힘.
- 이미 등록된 동일 fish id가 두 파일에 모두 있을 때 머지 옵션. → MVP는 덮어쓰기만. 머지는 S-025d의 merge 알고리즘을 본 스펙으로 가져오는 별도 작업.

## Next Step

1. 본 스펙은 즉시 ready 상태이므로 사람 확인 후 곧바로 구현 시작.
2. 권장 PR 분할:
   1. `serialize.js` + `validate.js` + 단위 테스트(파일 I/O 없이 순수 함수만).
   2. `hold.js`(mini) + 단위 테스트.
   3. `view.js` + `events.js` + ⚙️ 마운트(`main.js` wiring).
   4. 통합 검증(브라우저에서 export → import round-trip).
3. S-026 출시 시점에 별도 PR로 진입점 교체(임시 ⚙️ → `parent.aquarium-file` 슬롯).
4. 본 스펙은 백엔드 시리즈 완료 여부와 무관하게 영구 유지된다.
